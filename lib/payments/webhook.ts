import { createHmac, timingSafeEqual } from "node:crypto";

export const STRIPE_TOLERANCE_SEC = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SignatureResult =
  | { ok: true; timestamp: number }
  | { ok: false; reason: "missing" | "signature" | "stale" };

export type StripeObject = {
  client_reference_id?: string | null;
  metadata?: { user_id?: string | null } | null;
  status?: string | null;
  payment_status?: string | null;
  amount_total?: number | null;
  amount_refunded?: number | null;
  currency?: string | null;
  current_period_end?: number | null;
};

export type StripeEventInput = {
  id: string;
  type: string;
  data: { object: StripeObject };
};

export type PaymentSync = {
  action: "sync";
  userId: string;
  tier: "premium" | "free";
  isActive: boolean;
  expiresAt: string | null;
  payment: { amount: number; currency: string; status: "succeeded" | "failed" | "refunded" } | null;
};

export type PaymentDecision = { action: "ignore" } | { action: "invalid" } | PaymentSync;

export function signStripePayload(secret: string, timestamp: number, payload: string): string {
  const digest = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowSec: number,
): SignatureResult {
  if (!header || secret.length === 0) return { ok: false, reason: "missing" };
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return { ok: false, reason: "missing" };
  const issuedAt = Number(timestamp);
  if (!Number.isFinite(issuedAt) || Math.abs(nowSec - issuedAt) > STRIPE_TOLERANCE_SEC) {
    return { ok: false, reason: "stale" };
  }
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const match = signatures.some((signature) => {
    const got = Buffer.from(signature, "utf8");
    return got.length === expectedBuf.length && timingSafeEqual(got, expectedBuf);
  });
  return match ? { ok: true, timestamp: issuedAt } : { ok: false, reason: "signature" };
}

export function claimPaymentEvent(seen: ReadonlySet<string>, eventId: string): "replay" | "accept" {
  if (eventId.length < 3 || seen.has(eventId)) return "replay";
  return "accept";
}

function userIdOf(object: StripeObject): string | null {
  const candidates = [object.client_reference_id, object.metadata?.user_id];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && UUID.test(candidate)) return candidate;
  }
  return null;
}

function currencyOf(value: string | null | undefined): string {
  if (typeof value === "string" && /^[a-zA-Z]{3}$/.test(value)) return value.toUpperCase();
  return "USD";
}

function amountOf(cents: number | null | undefined): number {
  if (typeof cents !== "number" || !Number.isFinite(cents) || cents < 0) return 0;
  return Math.round(cents) / 100;
}

function expiryOf(seconds: number | null | undefined): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

export function decideStripeEvent(event: StripeEventInput): PaymentDecision {
  if (!event.id || event.id.length < 3 || event.id.length > 120) return { action: "invalid" };
  const object = event.data?.object;
  if (!object) return { action: "invalid" };
  const userId = userIdOf(object);
  if (event.type === "checkout.session.completed") {
    if (!userId) return { action: "ignore" };
    const paid = object.payment_status === "paid" || object.status === "complete";
    if (!paid) {
      return {
        action: "sync",
        userId,
        tier: "free",
        isActive: true,
        expiresAt: null,
        payment: { amount: amountOf(object.amount_total), currency: currencyOf(object.currency), status: "failed" },
      };
    }
    return {
      action: "sync",
      userId,
      tier: "premium",
      isActive: true,
      expiresAt: null,
      payment: { amount: amountOf(object.amount_total), currency: currencyOf(object.currency), status: "succeeded" },
    };
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    if (!userId) return { action: "ignore" };
    const active = event.type === "customer.subscription.updated" && (object.status === "active" || object.status === "trialing");
    return {
      action: "sync",
      userId,
      tier: active ? "premium" : "free",
      isActive: active,
      expiresAt: active ? expiryOf(object.current_period_end) : null,
      payment: null,
    };
  }
  if (event.type === "charge.refunded") {
    if (!userId) return { action: "ignore" };
    return {
      action: "sync",
      userId,
      tier: "free",
      isActive: false,
      expiresAt: null,
      payment: { amount: amountOf(object.amount_refunded), currency: currencyOf(object.currency), status: "refunded" },
    };
  }
  return { action: "ignore" };
}
