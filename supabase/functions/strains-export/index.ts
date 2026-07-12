import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const HEADERS = ["product_name", "brand", "product_type", "THC%", "CBD%", "description"];

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

function parseList(v: string | null): string[] {
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    let ids: string[] = [];
    let type: string | null = null;
    let effects: string[] = [];
    let aromas: string[] = [];
    let tastes: string[] = [];
    let medical: string[] = [];
    let search: string | null = null;
    let thcMin: number | null = null;
    let thcMax: number | null = null;
    let cbdMin: number | null = null;
    let cbdMax: number | null = null;
    let limit = 5000;
    let format = url.searchParams.get("format") ?? "csv";
    let includeDeleted = url.searchParams.get("include_deleted") === "true";

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      ids = Array.isArray(body.ids) ? body.ids : [];
      type = body.type ?? null;
      effects = body.effects ?? [];
      aromas = body.aromas ?? [];
      tastes = body.tastes ?? [];
      medical = body.medical_uses ?? [];
      search = body.search ?? null;
      thcMin = body.thc_min ?? null;
      thcMax = body.thc_max ?? null;
      cbdMin = body.cbd_min ?? null;
      cbdMax = body.cbd_max ?? null;
      if (typeof body.limit === "number") limit = body.limit;
      if (body.format) format = body.format;
      if (typeof body.include_deleted === "boolean") includeDeleted = body.include_deleted;
    } else {
      ids = parseList(url.searchParams.get("ids"));
      type = url.searchParams.get("type");
      effects = parseList(url.searchParams.get("effects"));
      aromas = parseList(url.searchParams.get("aromas"));
      tastes = parseList(url.searchParams.get("tastes"));
      medical = parseList(url.searchParams.get("medical_uses"));
      search = url.searchParams.get("search");
      const n = (k: string) => {
        const v = url.searchParams.get(k);
        return v == null || v === "" ? null : Number(v);
      };
      thcMin = n("thc_min");
      thcMax = n("thc_max");
      cbdMin = n("cbd_min");
      cbdMax = n("cbd_max");
      const l = n("limit");
      if (l && l > 0) limit = Math.min(l, 10000);
    }

    let q = supabase.from("strains").select("*").order("name").limit(limit);
    if (!includeDeleted) q = q.is("deleted_at", null);
    if (ids.length) q = q.in("id", ids);
    if (type) q = q.eq("type", type);
    if (effects.length) q = q.contains("effects", effects);
    if (aromas.length) q = q.contains("aromas", aromas);
    if (tastes.length) q = q.contains("tastes", tastes);
    if (medical.length) q = q.contains("medical_uses", medical);
    if (search) q = q.ilike("name", `%${search}%`);
    if (thcMin != null) q = q.gte("thc", thcMin);
    if (thcMax != null) q = q.lte("thc", thcMax);
    if (cbdMin != null) q = q.gte("cbd", cbdMin);
    if (cbdMax != null) q = q.lte("cbd", cbdMax);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []).map((s: any) => ({
      product_name: s.name ?? "",
      brand: s.genetics ?? "",
      product_type: s.type ?? "",
      "THC%": s.thc ?? 0,
      "CBD%": s.cbd ?? 0,
      description: (s.description ?? "").replace(/\s+/g, " ").trim(),
    }));

    if (format === "json") {
      return new Response(JSON.stringify({ count: rows.length, rows }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const csv = toCSV([HEADERS, ...rows.map((r) => HEADERS.map((h) => (r as any)[h]))]);
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="strains-export-${rows.length}-${ts}.csv"`,
        "X-Total-Count": String(rows.length),
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
