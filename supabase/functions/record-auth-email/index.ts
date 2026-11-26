import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const KINDS = new Set(["password_recovery", "auth_signup"]);
const STATUSES = new Set(["accepted", "failed", "unconfigured"]);
const DETAILS = new Set(["accepted", "provider_unreachable", "provider_rejected", "unconfigured"]);

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function secretOk(expected: string, got: string): boolean {
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(got);
  if (expected.length < 16 || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });
  const configured = Deno.env.get("AUTH_EMAIL_LOG_SECRET") ?? "";
  const presented = req.headers.get("x-email-log-secret") ?? "";
  if (!secretOk(configured, presented)) return json(401, { error: "rejected" });

  let body: { kind?: unknown; status?: unknown; detail?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid outcome" });
  }
  if (
    typeof body.kind !== "string"
    || typeof body.status !== "string"
    || typeof body.detail !== "string"
    || !KINDS.has(body.kind)
    || !STATUSES.has(body.status)
    || !DETAILS.has(body.detail)
  ) {
    return json(400, { error: "invalid outcome" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { error: "email log is not configured" });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin.rpc("record_email_delivery", {
    _kind: body.kind,
    _status: body.status,
    _detail: body.detail,
  });
  if (error) return json(500, { error: "email log failed" });
  return json(200, { recorded: true });
});
