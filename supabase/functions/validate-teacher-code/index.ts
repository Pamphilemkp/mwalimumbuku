import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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
    const { access_code } = await req.json();

    if (!access_code || typeof access_code !== "string") {
      return new Response(
        JSON.stringify({ valid: false, error: "Missing access code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-side secret — never exposed to client
    const validCode = Deno.env.get("TEACHER_ACCESS_CODE");
    if (!validCode) {
      return new Response(
        JSON.stringify({ valid: false, error: "Server misconfigured: missing access code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[VALIDATE] Received code length: ${access_code.trim().length}, Expected code length: ${validCode.length}`);
    console.log(`[VALIDATE] Match: ${access_code.trim() === validCode.trim()}`);
    const isValid = access_code.trim() === validCode.trim();

    return new Response(
      JSON.stringify({ valid: isValid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ valid: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
