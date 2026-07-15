// AI strain importer: uses Firecrawl to search/scrape strain info,
// then Lovable AI (Gemini) to extract structured strain data, and
// inserts rows into the `strains` table. Admin-only.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2";
const LOVABLE_AI = "https://ai.gateway.lovable.dev/v1/chat/completions";

function normalizeName(n: string) {
  return n.toLowerCase().trim().replace(/['']/g, "").replace(/\s+/g, " ");
}

function mergeArrays(existing: string[] | null | undefined, incoming: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of [...(existing ?? []), ...incoming]) {
    const k = v.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(v.trim());
  }
  return out;
}

function preferText(existing: string | null | undefined, incoming: string) {
  const e = (existing ?? "").trim();
  const i = (incoming ?? "").trim();
  if (!e) return i;
  if (!i) return e;
  return i.length > e.length ? i : e;
}

function preferNumber(existing: number | null | undefined, incoming: number) {
  const e = Number(existing ?? 0);
  const i = Number(incoming ?? 0);
  return i > 0 ? i : e;
}

type StrainRow = {
  name: string;
  type: "Sativa" | "Indica" | "Hybrid";
  thc: number;
  cbd: number;
  description: string;
  genetics: string;
  dominant_terpene: string;
  effects: string[];
  negative_effects: string[];
  medical_uses: string[];
  aromas: string[];
  tastes: string[];
  image_url: string;
};

async function firecrawlSearch(query: string, apiKey: string) {
  const r = await fetch(`${FIRECRAWL}/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `${query} cannabis strain effects aroma`,
      limit: 3,
      scrapeOptions: { formats: ["markdown"] },
    }),
  });
  if (!r.ok) throw new Error(`Firecrawl search ${r.status}: ${await r.text()}`);
  return r.json();
}

async function extractWithAI(name: string, sourceText: string, apiKey: string): Promise<StrainRow> {
  const system = `You extract cannabis strain data from web content. Return ONLY valid JSON matching the schema. Use empty strings/arrays and 0 when unknown. Never invent facts you cannot infer from the source.`;
  const user = `Strain name: ${name}

Source content (may include multiple pages):
${sourceText.slice(0, 12000)}

Return a JSON object with these exact keys:
{
  "name": string,                     // canonical strain name
  "type": "Sativa" | "Indica" | "Hybrid",
  "thc": number,                      // percent, e.g. 18.5
  "cbd": number,                      // percent
  "description": string,              // 1-3 sentence summary
  "genetics": string,                 // parents, e.g. "Blueberry x Haze"
  "dominant_terpene": string,         // e.g. "Myrcene"
  "effects": string[],                // positive effects, capitalized single words
  "negative_effects": string[],       // e.g. "Dry mouth"
  "medical_uses": string[],
  "aromas": string[],
  "tastes": string[],
  "image_url": string                 // "" if none
}`;

  const r = await fetch(LOVABLE_AI, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`Lovable AI ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);

  // Normalize
  const clampType = (t: string) =>
    ["Sativa", "Indica", "Hybrid"].includes(t) ? t : "Hybrid";
  const arr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((s) => s.trim()) : [];
  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  return {
    name: (parsed.name || name).toString().trim(),
    type: clampType(parsed.type) as StrainRow["type"],
    thc: num(parsed.thc),
    cbd: num(parsed.cbd),
    description: (parsed.description || "").toString(),
    genetics: (parsed.genetics || "").toString(),
    dominant_terpene: (parsed.dominant_terpene || "").toString(),
    effects: arr(parsed.effects),
    negative_effects: arr(parsed.negative_effects),
    medical_uses: arr(parsed.medical_uses),
    aromas: arr(parsed.aromas),
    tastes: arr(parsed.tastes),
    image_url: (parsed.image_url || "").toString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!fcKey) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!aiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Verify admin
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const names: string[] = Array.isArray(body?.names)
      ? body.names.map((n: unknown) => String(n).trim()).filter(Boolean)
      : [];
    if (!names.length) {
      return new Response(JSON.stringify({ error: "Provide `names: string[]`" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const results: Array<{ name: string; status: "inserted" | "updated" | "failed"; error?: string; id?: string }> = [];

    for (const name of names.slice(0, 25)) {
      try {
        const search = await firecrawlSearch(name, fcKey);
        const items: any[] =
          search?.data?.web ?? search?.data ?? search?.web ?? [];
        const combined = items
          .slice(0, 3)
          .map((it) => `# ${it.title ?? ""}\n${it.url ?? ""}\n\n${it.markdown ?? it.description ?? ""}`)
          .join("\n\n---\n\n");
        if (!combined.trim()) throw new Error("No search content returned");

        const row = await extractWithAI(name, combined, aiKey);

        // Duplicate detection: case/punctuation-insensitive name match, ignoring soft-deleted rows
        const normalized = normalizeName(row.name);
        const { data: candidates, error: findErr } = await admin
          .from("strains")
          .select("*")
          .ilike("name", row.name)
          .is("deleted_at", null);
        if (findErr) throw new Error(findErr.message);

        const existing = (candidates ?? []).find(
          (c: any) => normalizeName(c.name) === normalized,
        );

        if (existing) {
          const merged = {
            name: existing.name, // keep canonical existing name
            type: existing.type || row.type,
            thc: preferNumber(existing.thc, row.thc),
            cbd: preferNumber(existing.cbd, row.cbd),
            description: preferText(existing.description, row.description),
            genetics: preferText(existing.genetics, row.genetics),
            dominant_terpene: preferText(existing.dominant_terpene, row.dominant_terpene),
            effects: mergeArrays(existing.effects, row.effects),
            negative_effects: mergeArrays(existing.negative_effects, row.negative_effects),
            medical_uses: mergeArrays(existing.medical_uses, row.medical_uses),
            aromas: mergeArrays(existing.aromas, row.aromas),
            tastes: mergeArrays(existing.tastes, row.tastes),
            image_url: existing.image_url || row.image_url,
          };
          const { error: updErr } = await admin
            .from("strains")
            .update(merged as any)
            .eq("id", existing.id);
          if (updErr) throw new Error(updErr.message);
          results.push({ name, status: "updated", id: existing.id });
        } else {
          const { data: inserted, error } = await admin
            .from("strains")
            .insert(row as any)
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          results.push({ name, status: "inserted", id: inserted?.id });
        }
      } catch (e) {
        results.push({ name, status: "failed", error: (e as Error).message });
      }
    }


    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
