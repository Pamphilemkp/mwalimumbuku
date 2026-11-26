import { createHmac, timingSafeEqual } from "node:crypto";

export const STRIPE_TOLERANCE_SEC = 300;

export type {
  PaymentContext,
  PaymentDecision,
  PaymentSync,
  StripeEventInput,
  StripeObject,
} from "./decision.ts";
export { decideStripeEvent } from "./decision.ts";

export type SignatureResult =
  | { ok: true; timestamp: number }
  | { ok: false; reason: "missing" | "signature" | "stale" };

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

