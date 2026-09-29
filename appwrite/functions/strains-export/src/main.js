import { Client, Query, TablesDB } from "node-appwrite";

/**
 * strains-export — execute: team:admins.
 * Accepts GET (query params) or POST (JSON body).
 * Filters: ids, type, effects, aromas, tastes, medical_uses, search,
 *          thc_min/max, cbd_min/max, limit, format (csv|json), include_deleted
 *
 * Required env vars:
 *   APPWRITE_API_KEY — server API key with tablesDB scope
 *   APPWRITE_DATABASE_ID (optional, default "straindex")
 */

const HEADERS = ["product_name", "brand", "product_type", "THC%", "CBD%", "description"];
const PAGE_SIZE = 500;

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(rows) {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

function parseList(v) {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  if (!v) return [];
  return String(v).split(",").map((s) => s.trim()).filter(Boolean);
}

function numOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async ({ req, res, error }) => {
  try {
    const body =
      req.method === "POST"
        ? req.bodyJson && typeof req.bodyJson === "object" && Object.keys(req.bodyJson).length
          ? req.bodyJson
          : JSON.parse(req.bodyText || "{}")
        : {};
    const qp = req.query ?? {};

    const ids = body.ids ?? parseList(qp.ids);
    const type = body.type ?? qp.type ?? null;
    const effects = body.effects ?? parseList(qp.effects);
    const aromas = body.aromas ?? parseList(qp.aromas);
    const tastes = body.tastes ?? parseList(qp.tastes);
    const medical = body.medical_uses ?? parseList(qp.medical_uses);
    const search = body.search ?? qp.search ?? null;
    const thcMin = numOrNull(body.thc_min ?? qp.thc_min);
    const thcMax = numOrNull(body.thc_max ?? qp.thc_max);
    const cbdMin = numOrNull(body.cbd_min ?? qp.cbd_min);
    const cbdMax = numOrNull(body.cbd_max ?? qp.cbd_max);
    let limit = numOrNull(body.limit ?? qp.limit) ?? 5000;
    limit = Math.min(Math.max(limit, 1), 10000);
    const format = body.format ?? qp.format ?? "csv";
    const includeDeleted = body.include_deleted === true || qp.include_deleted === "true";

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || "https://sfo.cloud.appwrite.io/v1")
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    const tables = new TablesDB(client);
    const databaseId = process.env.APPWRITE_DATABASE_ID || "straindex";

    const baseQueries = [
      ...(includeDeleted ? [] : [Query.isNull("deleted_at")]),
      ...(ids.length ? [Query.equal("$id", ids)] : []),
      ...(type ? [Query.equal("type", type)] : []),
      ...effects.map((v) => Query.contains("effects", v)),
      ...aromas.map((v) => Query.contains("aromas", v)),
      ...tastes.map((v) => Query.contains("tastes", v)),
      ...medical.map((v) => Query.contains("medical_uses", v)),
      ...(search ? [Query.contains("name", search)] : []),
      ...(thcMin != null ? [Query.greaterThanEqual("thc", thcMin)] : []),
      ...(thcMax != null ? [Query.lessThanEqual("thc", thcMax)] : []),
      ...(cbdMin != null ? [Query.greaterThanEqual("cbd", cbdMin)] : []),
      ...(cbdMax != null ? [Query.lessThanEqual("cbd", cbdMax)] : []),
      Query.orderAsc("name"),
    ];

    const rows = [];
    let cursor;
    while (rows.length < limit) {
      const pageSize = Math.min(PAGE_SIZE, limit - rows.length);
      const queries = [
        ...baseQueries,
        Query.limit(pageSize),
        ...(cursor ? [Query.cursorAfter(cursor)] : []),
      ];
      const page = await tables.listRows({ databaseId, tableId: "strains", queries });
      rows.push(...page.rows);
      if (page.rows.length < pageSize) break;
      cursor = page.rows[page.rows.length - 1].$id;
    }

    const mapped = rows.map((s) => ({
      product_name: s.name ?? "",
      brand: s.genetics ?? "",
      product_type: s.type ?? "",
      "THC%": s.thc ?? 0,
      "CBD%": s.cbd ?? 0,
      description: (s.description ?? "").replace(/\s+/g, " ").trim(),
    }));

    if (format === "json") {
      return res.json({ count: mapped.length, rows: mapped });
    }

    const csv = toCSV([HEADERS, ...mapped.map((r) => HEADERS.map((h) => r[h]))]);
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return res.text(csv, 200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="strains-export-${mapped.length}-${ts}.csv"`,
      "X-Total-Count": String(mapped.length),
    });
  } catch (e) {
    error(`strains-export failed: ${e?.message ?? e}`);
    return res.json({ error: e?.message ?? "Unknown error" }, 500);
  }
};
