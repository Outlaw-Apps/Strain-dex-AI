import { Client, ID, Query, TablesDB } from "node-appwrite";

/**
 * ai-strain-import — execute: team:admins.
 * Uses Firecrawl to search/scrape strain info, then an OpenAI-compatible
 * chat model to extract structured strain data, and inserts/merges rows
 * into the `strains` table.
 * Body: { names: string[] } (max 25 per run)
 * Returns: { results: [{ name, status: "inserted"|"updated"|"failed", error?, id? }] }
 *
 * Required env vars:
 *   APPWRITE_API_KEY — server API key with tablesDB scope
 *   AI_API_KEY — OpenAI (or OpenAI-compatible) API key
 *   FIRECRAWL_API_KEY — firecrawl.dev API key
 *   APPWRITE_DATABASE_ID (optional, default "straindex")
 *   AI_BASE_URL (optional, default "https://api.openai.com/v1")
 *   AI_MODEL (optional, default "gpt-4o-mini")
 */

const FIRECRAWL = "https://api.firecrawl.dev/v2";
const PAGE_SIZE = 500;

function normalizeName(n) {
  return n.toLowerCase().trim().replace(/['']/g, "").replace(/\s+/g, " ");
}

function mergeArrays(existing, incoming) {
  const seen = new Set();
  const out = [];
  for (const v of [...(existing ?? []), ...incoming]) {
    const k = String(v).trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(String(v).trim());
  }
  return out;
}

function preferText(existing, incoming) {
  const e = (existing ?? "").trim();
  const i = (incoming ?? "").trim();
  if (!e) return i;
  if (!i) return e;
  return i.length > e.length ? i : e;
}

function preferNumber(existing, incoming) {
  const e = Number(existing ?? 0);
  const i = Number(incoming ?? 0);
  return i > 0 ? i : e;
}

async function firecrawlSearch(query, apiKey) {
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

async function extractWithAI(name, sourceText, apiKey, baseUrl, model) {
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

  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);

  // Normalize
  const clampType = (t) => (["Sativa", "Indica", "Hybrid"].includes(t) ? t : "Hybrid");
  const arr = (v) =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((s) => s.trim()) : [];
  const num = (v) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  return {
    name: (parsed.name || name).toString().trim(),
    type: clampType(parsed.type),
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

/** Fetch all non-deleted strains (id + merge-relevant fields), paginated. */
async function listAllStrains(tables, databaseId) {
  const all = [];
  let cursor;
  for (;;) {
    const queries = [
      Query.isNull("deleted_at"),
      Query.select([
        "name",
        "type",
        "thc",
        "cbd",
        "description",
        "genetics",
        "dominant_terpene",
        "effects",
        "negative_effects",
        "medical_uses",
        "aromas",
        "tastes",
        "image_url",
      ]),
      Query.limit(PAGE_SIZE),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ];
    const page = await tables.listRows({ databaseId, tableId: "strains", queries });
    all.push(...page.rows);
    if (page.rows.length < PAGE_SIZE) break;
    cursor = page.rows[page.rows.length - 1].$id;
  }
  return all;
}

export default async ({ req, res, log, error }) => {
  try {
    const fcKey = process.env.FIRECRAWL_API_KEY;
    const aiKey = process.env.AI_API_KEY;
    if (!fcKey) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!aiKey) throw new Error("AI_API_KEY not configured");
    const aiBaseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const aiModel = process.env.AI_MODEL || "gpt-4o-mini";

    // Execute access is restricted to the admins team at the platform level;
    // this header check is defense-in-depth against misconfiguration.
    if (!req.headers["x-appwrite-user-id"]) {
      return res.json({ error: "Unauthorized" }, 401);
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || "https://cloud.appwrite.io/v1")
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    const tables = new TablesDB(client);
    const databaseId = process.env.APPWRITE_DATABASE_ID || "straindex";

    const body =
      req.bodyJson && typeof req.bodyJson === "object" && Object.keys(req.bodyJson).length
        ? req.bodyJson
        : JSON.parse(req.bodyText || "{}");
    const names = Array.isArray(body?.names)
      ? body.names.map((n) => String(n).trim()).filter(Boolean)
      : [];
    if (!names.length) {
      return res.json({ error: "Provide `names: string[]`" }, 400);
    }

    // Load existing strains once for duplicate detection.
    const existing = await listAllStrains(tables, databaseId);

    const results = [];

    for (const name of names.slice(0, 25)) {
      try {
        const search = await firecrawlSearch(name, fcKey);
        const items = search?.data?.web ?? search?.data ?? search?.web ?? [];
        const combined = items
          .slice(0, 3)
          .map((it) => `# ${it.title ?? ""}\n${it.url ?? ""}\n\n${it.markdown ?? it.description ?? ""}`)
          .join("\n\n---\n\n");
        if (!combined.trim()) throw new Error("No search content returned");

        const row = await extractWithAI(name, combined, aiKey, aiBaseUrl, aiModel);

        // Duplicate detection: case/punctuation-insensitive name match.
        const normalized = normalizeName(row.name);
        const match = existing.find((c) => normalizeName(c.name ?? "") === normalized);

        if (match) {
          const merged = {
            name: match.name, // keep canonical existing name
            type: match.type || row.type,
            thc: preferNumber(match.thc, row.thc),
            cbd: preferNumber(match.cbd, row.cbd),
            description: preferText(match.description, row.description),
            genetics: preferText(match.genetics, row.genetics),
            dominant_terpene: preferText(match.dominant_terpene, row.dominant_terpene),
            effects: mergeArrays(match.effects, row.effects),
            negative_effects: mergeArrays(match.negative_effects, row.negative_effects),
            medical_uses: mergeArrays(match.medical_uses, row.medical_uses),
            aromas: mergeArrays(match.aromas, row.aromas),
            tastes: mergeArrays(match.tastes, row.tastes),
            image_url: match.image_url || row.image_url,
          };
          await tables.updateRow({ databaseId, tableId: "strains", rowId: match.$id, data: merged });
          results.push({ name, status: "updated", id: match.$id });
        } else {
          const inserted = await tables.createRow({
            databaseId,
            tableId: "strains",
            rowId: ID.unique(),
            data: row,
          });
          // Track within this run so duplicate names in one batch merge too.
          existing.push({ ...row, $id: inserted.$id });
          results.push({ name, status: "inserted", id: inserted.$id });
        }
      } catch (e) {
        results.push({ name, status: "failed", error: e?.message ?? String(e) });
      }
    }

    log(`ai-strain-import done: ${results.filter((r) => r.status !== "failed").length}/${results.length} ok`);
    return res.json({ results });
  } catch (e) {
    error(`ai-strain-import failed: ${e?.message ?? e}`);
    return res.json({ error: e?.message ?? "Unknown error" }, 500);
  }
};
