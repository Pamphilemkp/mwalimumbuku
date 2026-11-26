import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decideStripeEvent } from "./decision.ts";
import { claimPaymentEvent, signStripePayload, verifyStripeSignature } from "./webhook.ts";

const secret = "whsec_test_only";
const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
const now = 1_700_000_000;
const userId = "11111111-1111-4111-8111-111111111111";

describe("stripe webhook decisions", () => {
  it("rejects a bad signature, a stale timestamp, and a replay", () => {
    const header = signStripePayload(secret, now, payload);
    assert.equal(verifyStripeSignature(payload, header, secret, now).ok, true);
    assert.equal(verifyStripeSignature(payload, header.replace(/v1=.*/, "v1=deadbeef"), secret, now).ok, false);
    assert.equal(verifyStripeSignature(payload, signStripePayload(secret, now - 3_600, payload), secret, now).ok, false);
    assert.equal(verifyStripeSignature(payload, null, secret, now).ok, false);
    const seen = new Set<string>(["evt_1"]);
    assert.equal(claimPaymentEvent(seen, "evt_1"), "replay");
    assert.equal(claimPaymentEvent(seen, "evt_2"), "accept");
  });

  it("grants premium only from a paid event that names the user", () => {
    const paid = decideStripeEvent({
      id: "evt_paid",
      type: "checkout.session.completed",
      data: { object: { client_reference_id: userId, payment_status: "paid", amount_total: 500, currency: "usd" } },
    });
    assert.equal(paid.action, "sync");
    if (paid.action === "sync") {
      assert.equal(paid.tier, "premium");
      assert.equal(paid.payment?.status, "succeeded");
      assert.equal(paid.payment?.amount, 5);
    }
    const unpaid = decideStripeEvent({
      id: "evt_open",
      type: "checkout.session.completed",
      data: { object: { client_reference_id: userId, payment_status: "unpaid", status: "complete" } },
    });
    assert.equal(unpaid.action, "ignore");
    assert.equal(
      decideStripeEvent({
        id: "evt_anon",
        type: "checkout.session.completed",
        data: { object: { payment_status: "paid" } },
      }).action,
      "ignore",
    );
  });

  it("downgrades a canceled subscription and a refund", () => {
    const canceled = decideStripeEvent({
      id: "evt_cancel",
      type: "customer.subscription.deleted",
      data: { object: { metadata: { user_id: userId }, status: "canceled" } },
    });
    assert.equal(canceled.action === "sync" && canceled.tier, "free");
    assert.equal(canceled.action === "sync" && canceled.isActive, false);
    const refund = decideStripeEvent({
      id: "evt_refund",
      type: "charge.refunded",
      data: { object: { metadata: { user_id: userId }, amount_refunded: 500, currency: "cdf" } },
    });
    assert.equal(refund.action === "sync" && refund.payment?.status, "refunded");
    assert.equal(refund.action === "sync" && refund.tier, "free");
    const otherUser = "33333333-3333-4333-8333-333333333333";
    const mapped = decideStripeEvent(
      {
        id: "evt_refund_mapped",
        type: "charge.refunded",
        data: { object: { amount_refunded: 500, currency: "usd" } },
      },
      { resolvedUserId: userId },
    );
    assert.equal(mapped.action === "sync" && mapped.userId, userId);
    const conflict = decideStripeEvent(
      {
        id: "evt_refund_conflict",
        type: "charge.refunded",
        data: { object: { metadata: { user_id: userId }, amount_refunded: 500, currency: "usd" } },
      },
      { resolvedUserId: otherUser },
    );
    assert.equal(conflict.action, "ignore");
    assert.equal(
      decideStripeEvent({
        id: "evt_refund_unknown",
        type: "charge.refunded",
        data: { object: { amount_refunded: 500, currency: "usd" } },
      }).action,
      "ignore",
    );
  });

  it("keeps the edge function on signature checks and the event table", () => {
    const source = readFileSync(new URL("../../supabase/functions/stripe-webhook/index.ts", import.meta.url), "utf8");
    assert.match(source, /stripe-signature/);
    assert.match(source, /apply_payment_event/);
    assert.match(source, /stripe_refund_user/);
    assert.match(source, /STRIPE_WEBHOOK_SECRET/);
    assert.match(source, /lib\/payments\/decision\.ts/);
    assert.equal(source.includes("success=true"), false);
    assert.equal(source.includes('status === "complete"'), false);
    const decision = readFileSync(new URL("./decision.ts", import.meta.url), "utf8");
    assert.match(decision, /checkout\.session\.completed/);
    assert.match(decision, /payment_status === "paid"/);
    assert.equal(decision.includes('status === "complete"'), false);
    const page = readFileSync(new URL("../../src/screens/dashboard/SubscriptionPage.tsx", import.meta.url), "utf8");
    assert.equal(page.includes("tier: 'premium'"), false);
    assert.equal(page.includes("update-subscription"), false);
    assert.match(page, /Indisponible|Unavailable/);
  });
});
