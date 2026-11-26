const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export type PaymentContext = {
  resolvedUserId?: string | null;
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

function userIdOf(object: StripeObject): string | null {
  const candidates = [object.client_reference_id, object.metadata?.user_id];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && UUID.test(candidate)) return candidate;
  }
  return null;
}

function uuidOf(value: string | null | undefined): string | null {
  return typeof value === "string" && UUID.test(value) ? value : null;
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

export function decideStripeEvent(event: StripeEventInput, context: PaymentContext = {}): PaymentDecision {
  if (!event.id || event.id.length < 3 || event.id.length > 120) return { action: "invalid" };
  const object = event.data?.object;
  if (!object) return { action: "invalid" };
  const userId = userIdOf(object);
  if (event.type === "checkout.session.completed") {
    const paid = object.payment_status === "paid";
    if (!userId || !paid) return { action: "ignore" };
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
    const mapped = uuidOf(context.resolvedUserId);
    if (userId && mapped && userId !== mapped) return { action: "ignore" };
    const owner = userId ?? mapped;
    if (!owner) return { action: "ignore" };
    return {
      action: "sync",
      userId: owner,
      tier: "free",
      isActive: false,
      expiresAt: null,
      payment: { amount: amountOf(object.amount_refunded), currency: currencyOf(object.currency), status: "refunded" },
    };
  }
  return { action: "ignore" };
}
