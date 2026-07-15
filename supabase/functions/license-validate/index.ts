import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const key = typeof body?.key === "string" ? body.key.trim().toUpperCase() : "";
    const countUsage = body?.countUsage === true;

    if (!key) {
      return json({ ok: false, reason: "Missing license key." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase.rpc("redeem_license_key", {
      _key: key,
      _count_usage: countUsage,
    });

    if (error) {
      console.error("redeem_license_key error", error);
      return json({ ok: false, reason: "Validation failed. Try again." }, 500);
    }

    return json(data, 200);
  } catch (e) {
    console.error("license-validate exception", e);
    return json({ ok: false, reason: "Unexpected error." }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
