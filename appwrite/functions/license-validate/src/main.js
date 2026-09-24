import { Client, Query, TablesDB } from "node-appwrite";

/**
 * license-validate — public function (execute: any).
 * Body: { key: string, countUsage?: boolean }
 * Returns: { ok: true, key, expiresAt, maxUses, uses } | { ok: false, reason }
 *
 * Required env vars:
 *   APPWRITE_API_KEY — server API key with tablesDB scope
 *   APPWRITE_DATABASE_ID (optional, default "straindex")
 */
export default async ({ req, res, error }) => {
  try {
    const body =
      req.bodyJson && typeof req.bodyJson === "object" && Object.keys(req.bodyJson).length
        ? req.bodyJson
        : JSON.parse(req.bodyText || "{}");
    const key = typeof body.key === "string" ? body.key.trim().toUpperCase() : "";
    const countUsage = body.countUsage === true;

    if (!key) {
      return res.json({ ok: false, reason: "Missing license key." }, 400);
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || "https://sfo.cloud.appwrite.io/v1")
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    const tables = new TablesDB(client);
    const databaseId = process.env.APPWRITE_DATABASE_ID || "straindex";

    const list = await tables.listRows({
      databaseId,
      tableId: "license_keys",
      queries: [Query.equal("key", key), Query.limit(1)],
    });
    const row = list.rows[0];

    if (!row) return res.json({ ok: false, reason: "Invalid license key." });
    if (row.revoked) return res.json({ ok: false, reason: "This license key has been revoked." });
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return res.json({ ok: false, reason: "This license key has expired." });
    }
    if (row.max_uses !== null && row.max_uses !== undefined && row.uses >= row.max_uses) {
      return res.json({ ok: false, reason: "This license key has reached its usage limit." });
    }

    let uses = row.uses;
    if (countUsage) {
      const updated = await tables.incrementRowColumn({
        databaseId,
        tableId: "license_keys",
        rowId: row.$id,
        column: "uses",
        value: 1,
      });
      uses = updated.uses;
    }

    return res.json({
      ok: true,
      key: row.key,
      expiresAt: row.expires_at ?? null,
      maxUses: row.max_uses ?? null,
      uses,
    });
  } catch (e) {
    error(`license-validate failed: ${e?.message ?? e}`);
    return res.json({ ok: false, reason: "Unexpected error. Try again." }, 500);
  }
};
