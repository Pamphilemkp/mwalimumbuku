import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOLERANCE_SEC = 300;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function timingSafeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hexHmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signatureOk(payload: string, header: string | null, secret: string, nowSec: number): Promise<boolean> {
  if (!header || secret.length === 0) return false;
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  const issuedAt = Number(timestamp);
  if (!Number.isFinite(issuedAt) || Math.abs(nowSec - issuedAt) > TOLERANCE_SEC) return false;
  const expected = await hexHmac(secret, `${timestamp}.${payload}`);
  return signatures.some((signature) => timingSafeEqual(signature, expected));
}

type StripeObject = {
  client_reference_id?: string | null;
  metadata?: { user_id?: string | null } | null;
  status?: string | null;
  payment_status?: string | null;
  amount_total?: number | null;
  amount_refunded?: number | null;
  currency?: string | null;
  current_period_end?: number | null;
};

type Decision =
  | { action: "ignore" }
  | { action: "invalid" }
  | {
      action: "sync";
      userId: string;
      tier: "premium" | "free";
      isActive: boolean;
      expiresAt: string | null;
      payment: { amount: number; currency: string; status: "succeeded" | "failed" | "refunded" } | null;
    };

function userIdOf(object: StripeObject): string | null {
  for (const candidate of [object.client_reference_id, object.metadata?.user_id]) {
    if (typeof candidate === "string" && UUID.test(candidate)) return candidate;
  }
  return null;
}

function currencyOf(value: string | null | undefined): string {
  return typeof value === "string" && /^[a-zA-Z]{3}$/.test(value) ? value.toUpperCase() : "USD";
}

function amountOf(cents: number | null | undefined): number {
  if (typeof cents !== "number" || !Number.isFinite(cents) || cents < 0) return 0;
  return Math.round(cents) / 100;
}

function decide(event: { id?: string; type?: string; data?: { object?: StripeObject } }): Decision {
  if (!event.id || event.id.length < 3 || event.id.length > 120 || !event.type || !event.data?.object) return { action: "invalid" };
  const object = event.data.object;
  const userId = userIdOf(object);
  if (event.type === "checkout.session.completed") {
    if (!userId) return { action: "ignore" };
    const paid = object.payment_status === "paid" || object.status === "complete";
    return {
      action: "sync",
      userId,
      tier: paid ? "premium" : "free",
      isActive: true,
      expiresAt: null,
      payment: {
        amount: amountOf(object.amount_total),
        currency: currencyOf(object.currency),
        status: paid ? "succeeded" : "failed",
      },
    };
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    if (!userId) return { action: "ignore" };
    const active = event.type === "customer.subscription.updated" && (object.status === "active" || object.status === "trialing");
    const expires = typeof object.current_period_end === "number" && object.current_period_end > 0
      ? new Date(object.current_period_end * 1000).toISOString()
      : null;
    return { action: "sync", userId, tier: active ? "premium" : "free", isActive: active, expiresAt: active ? expires : null, payment: null };
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

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  const payload = await req.text();
  const ok = await signatureOk(payload, req.headers.get("stripe-signature"), secret, Math.floor(Date.now() / 1000));
  if (!ok) return json(400, { error: "signature rejected" });

  let event: { id?: string; type?: string; data?: { object?: StripeObject } };
  try {
    event = JSON.parse(payload);
  } catch {
    return json(400, { error: "invalid event" });
  }

  const decision = decide(event);
  if (decision.action === "invalid" || !event.id || !event.type) return json(400, { error: "invalid event" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { error: "payment sync is not configured" });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { error: stored } = await admin.from("payment_events").insert({
    event_id: event.id,
    event_type: event.type.slice(0, 80),
    status: decision.action === "sync" ? "processed" : "ignored",
  });
  if (stored) {
    if (stored.code === "23505") return json(200, { received: true, duplicate: true });
    return json(500, { error: "event store failed" });
  }
  if (decision.action === "ignore") return json(200, { received: true, ignored: true });

  const { error: subscriptionError } = await admin.from("subscriptions").upsert({
    user_id: decision.userId,
    tier: decision.tier,
    is_active: decision.isActive,
    expires_at: decision.expiresAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (subscriptionError) {
    await admin.from("payment_events").delete().eq("event_id", event.id);
    return json(500, { error: "subscription sync failed" });
  }

  if (decision.payment) {
    const { error: paymentError } = await admin.from("payment_history").insert({
      user_id: decision.userId,
      amount: decision.payment.amount,
      currency: decision.payment.currency,
      status: decision.payment.status,
      provider: "stripe",
      provider_ref: event.id,
      description: event.type.slice(0, 80),
    });
    if (paymentError) {
      await admin.from("payment_events").delete().eq("event_id", event.id);
      return json(500, { error: "payment history failed" });
    }
  }

  return json(200, { received: true });
});
