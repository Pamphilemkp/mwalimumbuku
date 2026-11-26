import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emailOutcome, isRecordableEmailOutcome, notificationEmailOutcome } from "./delivery.ts";

describe("email delivery outcomes", () => {
  it("records a provider failure without the address or a token", () => {
    const failed = emailOutcome("password_recovery", { name: "AuthApiError", status: 400 });
    assert.deepEqual(failed, { kind: "password_recovery", status: "failed", detail: "provider_rejected" });
    assert.equal(JSON.stringify(failed).includes("@"), false);
    assert.equal(JSON.stringify(failed).toLowerCase().includes("token"), false);
    assert.equal(isRecordableEmailOutcome(failed), true);
  });

  it("keeps notification mail unconfigured when no mail vendor is set", () => {
    const notice = notificationEmailOutcome();
    assert.equal(notice.status, "unconfigured");
    assert.equal(notice.detail, "notification_in_app");
  });

  it("treats an unreachable auth service as a delivery failure", () => {
    assert.equal(emailOutcome("auth_signup", { name: "AuthRetryableFetchError", status: 0 }).detail, "provider_unreachable");
    assert.equal(emailOutcome("auth_signup", null).status, "accepted");
  });

  it("records signup and recovery through the server function, not the client RPC", () => {
    const actions = readFileSync(new URL("../../features/auth/actions.ts", import.meta.url), "utf8");
    const writer = readFileSync(new URL("../../supabase/functions/record-auth-email/index.ts", import.meta.url), "utf8");
    assert.equal(actions.includes("record_email_delivery"), false);
    assert.match(actions, /record-auth-email/);
    assert.match(writer, /record_email_delivery/);
    assert.match(writer, /AUTH_EMAIL_LOG_SECRET/);
  });
});
