import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { decideStripeEvent, type StripeObject } from "../../../lib/payments/decision.ts";

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

type IncomingEvent = {
  id?: string;
  type?: string;
  created?: number;
  data?: { object?: StripeObject & { id?: string; customer?: unknown; subscription?: unknown; payment_intent?: unknown } };
};

function stripeId(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_]{3,120}$/.test(value) ? value : null;
}

function mappingFor(event: IncomingEvent): { customerId: string | null; subscriptionId: string | null } {
  const object = event.data?.object;
  const customerId = stripeId(object?.customer);
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    return { customerId, subscriptionId: stripeId(object?.id) };
  }
  if (event.type === "checkout.session.completed") {
    return { customerId, subscriptionId: stripeId(object?.subscription) };
  }
  return { customerId, subscriptionId: null };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  const payload = await req.text();
  const ok = await signatureOk(payload, req.headers.get("stripe-signature"), secret, Math.floor(Date.now() / 1000));
  if (!ok) return json(400, { error: "signature rejected" });

  let event: IncomingEvent;
  try {
    event = JSON.parse(payload);
  } catch {
    return json(400, { error: "invalid event" });
  }
  if (!event.id || !event.type || !event.data?.object) return json(400, { error: "invalid event" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { error: "payment sync is not configured" });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let resolvedUserId: string | null = null;
  if (event.type === "charge.refunded") {
    const customerId = stripeId(event.data.object.customer);
    if (customerId) {
      const { data, error } = await admin.rpc("stripe_refund_user", { _customer_id: customerId });
      if (error) return json(500, { error: "refund owner lookup failed" });
      resolvedUserId = typeof data === "string" ? data : null;
    }
  }

  const decision = decideStripeEvent(
    { id: event.id, type: event.type, data: { object: event.data.object } },
    { resolvedUserId },
  );
  if (decision.action === "invalid") return json(400, { error: "invalid event" });

  const created = typeof event.created === "number" && Number.isFinite(event.created) ? Math.trunc(event.created) : null;
  const link = decision.action === "sync" ? mappingFor(event) : { customerId: null, subscriptionId: null };
  const { data, error } = await admin.rpc("apply_payment_event", {
    _event_id: event.id,
    _event_type: event.type.slice(0, 80),
    _event_created: created,
    _user_id: decision.action === "sync" ? decision.userId : null,
    _action: decision.action,
    _tier: decision.action === "sync" ? decision.tier : null,
    _is_active: decision.action === "sync" ? decision.isActive : null,
    _expires_at: decision.action === "sync" ? decision.expiresAt : null,
    _apply_entitlement: decision.action === "sync",
    _amount: decision.action === "sync" ? decision.payment?.amount ?? null : null,
    _currency: decision.action === "sync" ? decision.payment?.currency ?? null : null,
    _payment_status: decision.action === "sync" ? decision.payment?.status ?? null : null,
    _customer_id: link.customerId,
    _subscription_id: link.subscriptionId,
  });
  if (error) return json(500, { error: "payment sync failed" });

  const result = (data ?? {}) as { duplicate?: boolean; ignored?: boolean };
  if (result.duplicate) return json(200, { received: true, duplicate: true });
  if (result.ignored || decision.action === "ignore") return json(200, { received: true, ignored: true });
  return json(200, { received: true });
});
