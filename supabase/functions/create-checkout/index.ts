import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const PRODUCTION_ORIGIN = "https://mwalimumbuku.vercel.app";

function appOrigin(value: string | null): string {
  if (!value) return PRODUCTION_ORIGIN;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const lovable = host === "lovable.app" || host.endsWith(".lovable.app") || host.endsWith(".lovable.dev");
    const local = host === "localhost" || host === "127.0.0.1";
    if (lovable || url.username || url.password) return PRODUCTION_ORIGIN;
    if (url.protocol === "https:" || (url.protocol === "http:" && local)) return url.origin;
  } catch {
    return PRODUCTION_ORIGIN;
  }
  return PRODUCTION_ORIGIN;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabaseClient.auth.getUser(token);
    if (error || !data.user?.email) throw new Error("User not authenticated");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({
      email: data.user.email,
      limit: 1,
    });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = appOrigin(req.headers.get("origin"));

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : data.user.email,
      client_reference_id: data.user.id,
      metadata: { user_id: data.user.id },
      subscription_data: { metadata: { user_id: data.user.id } },
      line_items: [
        {
          price: "price_1T8dMCISWfq7E6OHrcwo3lMv",
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/dashboard/subscription?success=true`,
      cancel_url: `${origin}/dashboard/subscription?canceled=true`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
