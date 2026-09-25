/**
 * One-shot Appwrite provisioning script for Strain-dex AI.
 * Creates the database, tables, columns, indexes, storage bucket, admin team,
 * and function definitions. Idempotent — existing resources are skipped.
 *
 * Usage:
 *   npm install node-appwrite        # once, anywhere
 *   # (APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID are also read from the repo-root .env)
 *   $env:APPWRITE_ENDPOINT="https://<region>.cloud.appwrite.io/v1"   # PowerShell — regional endpoint, see Console → Settings
 *   $env:APPWRITE_PROJECT_ID="<your project id>"
 *   $env:APPWRITE_API_KEY="<API key with full scope>"
 *   node appwrite/setup.mjs
 */
import {
  Client,
  Functions,
  TablesDBIndexType as IndexType,
  Permission,
  Role,
  Storage,
  TablesDB,
  Teams,
} from "node-appwrite";

// Fall back to the repo-root .env (Console → Settings → "Download .env"); shell vars take precedence.
try {
  process.loadEnvFile(new URL("../.env", import.meta.url));
} catch {}

const ENDPOINT = process.env.APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "straindex";
const ADMIN_TEAM_ID = "admins";
const BUCKET_ID = "strain-images";
const RUNTIME = process.env.APPWRITE_FUNCTION_RUNTIME || "node-22";

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error(
    "Set APPWRITE_ENDPOINT (your project's regional endpoint, e.g. https://sfo.cloud.appwrite.io/v1 — see Console → Settings), " +
      "APPWRITE_PROJECT_ID and APPWRITE_API_KEY first (shell env vars or repo-root .env).",
  );
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const tablesDB = new TablesDB(client);
const storage = new Storage(client);
const teamsApi = new Teams(client);
const functionsApi = new Functions(client);

const ADMIN_PERMS = [
  Permission.create(Role.team(ADMIN_TEAM_ID)),
  Permission.update(Role.team(ADMIN_TEAM_ID)),
  Permission.delete(Role.team(ADMIN_TEAM_ID)),
];

/** Run `fn`, skipping "already exists" (409) errors. */
async function ensure(label, fn) {
  try {
    await fn();
    console.log(`✔ ${label}`);
  } catch (e) {
    if (e?.code === 409 || /already exists/i.test(e?.message ?? "")) {
      console.log(`• ${label} (already exists, skipped)`);
    } else {
      console.error(`✖ ${label}: ${e?.message ?? e}`);
    }
  }
}

const columnCache = new Map();
async function ensureColumn(tableId, key, fn) {
  if (!columnCache.has(tableId)) {
    const { columns } = await tablesDB.listColumns({ databaseId: DATABASE_ID, tableId });
    columnCache.set(tableId, new Set(columns.map((c) => c.key)));
  }
  if (columnCache.get(tableId).has(key)) return console.log(`• column ${tableId}.${key} (already exists, skipped)`);
  await ensure(`column ${tableId}.${key}`, fn);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForColumns(tableId, keys) {
  const pending = new Set(keys);
  for (let i = 0; i < 60 && pending.size; i++) {
    const { columns } = await tablesDB.listColumns({ databaseId: DATABASE_ID, tableId });
    for (const c of columns) {
      if (c.status === "available") pending.delete(c.key);
      if (c.status === "failed") throw new Error(`Column ${tableId}.${c.key} failed to create`);
    }
    if (pending.size) await sleep(1000);
  }
  if (pending.size) throw new Error(`Timed out waiting for columns: ${[...pending].join(", ")}`);
}

// ---------------------------------------------------------------- database
await ensure(`database "${DATABASE_ID}"`, () =>
  tablesDB.create({ databaseId: DATABASE_ID, name: "StrainDex" }),
);

// ------------------------------------------------------------------ tables
await ensure(`table "strains"`, () =>
  tablesDB.createTable({
    databaseId: DATABASE_ID,
    tableId: "strains",
    name: "Strains",
    rowSecurity: false,
    permissions: [Permission.read(Role.any()), ...ADMIN_PERMS],
  }),
);

await ensure(`table "favorites"`, () =>
  tablesDB.createTable({
    databaseId: DATABASE_ID,
    tableId: "favorites",
    name: "Favorites",
    // Row-level security: users create rows with per-user permissions.
    rowSecurity: true,
    permissions: [Permission.create(Role.users())],
  }),
);

// ----------------------------------------------------------------- columns
const strainColumnKeys = [
  "name", "type", "thc", "cbd", "dominant_terpene", "description", "genetics",
  "image_url", "effects", "negative_effects", "medical_uses", "aromas", "tastes",
  "deleted_at",
];

const strainColumns = [
  () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: "strains", key: "name", size: 255, required: true }),
  () => tablesDB.createEnumColumn({ databaseId: DATABASE_ID, tableId: "strains", key: "type", elements: ["Sativa", "Indica", "Hybrid"], required: true }),
  () => tablesDB.createFloatColumn({ databaseId: DATABASE_ID, tableId: "strains", key: "thc", required: false, min: 0, max: 100, xdefault: 0 }),
  () => tablesDB.createFloatColumn({ databaseId: DATABASE_ID, tableId: "strains", key: "cbd", required: false, min: 0, max: 100, xdefault: 0 }),
  () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: "strains", key: "dominant_terpene", size: 255, required: false, xdefault: "" }),
  () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: "strains", key: "description", size: 8192, required: false, xdefault: "" }),
  () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: "strains", key: "genetics", size: 1024, required: false, xdefault: "" }),
  () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: "strains", key: "image_url", size: 2048, required: false, xdefault: "" }),
  ...["effects", "negative_effects", "medical_uses", "aromas", "tastes"].map(
    (key) => () =>
      tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: "strains", key, size: 255, required: false, array: true }),
  ),
  () => tablesDB.createDatetimeColumn({ databaseId: DATABASE_ID, tableId: "strains", key: "deleted_at", required: false }),
];
for (let i = 0; i < strainColumns.length; i++) {
  await ensureColumn("strains", strainColumnKeys[i], strainColumns[i]);
}

const favoriteColumns = [
  ["user_id", () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: "favorites", key: "user_id", size: 64, required: true })],
  ["strain_id", () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: "favorites", key: "strain_id", size: 64, required: true })],
];
for (const [key, fn] of favoriteColumns) await ensureColumn("favorites", key, fn);

// Columns are created asynchronously — wait until they're available.
await waitForColumns("strains", strainColumnKeys);
await waitForColumns("favorites", ["user_id", "strain_id"]);

// ----------------------------------------------------------------- indexes
const strainIndexes = [
  ["name_unique", IndexType.Unique, ["name"]],
  ["name_fulltext", IndexType.Fulltext, ["name"]],
  ["deleted_at_idx", IndexType.Key, ["deleted_at"]],
  ["type_idx", IndexType.Key, ["type"]],
  ["thc_idx", IndexType.Key, ["thc"]],
  ["cbd_idx", IndexType.Key, ["cbd"]],
];
for (const [key, type, columns] of strainIndexes) {
  await ensure(`index strains.${key}`, () =>
    tablesDB.createIndex({ databaseId: DATABASE_ID, tableId: "strains", key, type, columns }),
  );
}

const favoriteIndexes = [
  ["user_strain_unique", IndexType.Unique, ["user_id", "strain_id"]],
  ["user_idx", IndexType.Key, ["user_id"]],
  ["strain_idx", IndexType.Key, ["strain_id"]],
];
for (const [key, type, columns] of favoriteIndexes) {
  await ensure(`index favorites.${key}`, () =>
    tablesDB.createIndex({ databaseId: DATABASE_ID, tableId: "favorites", key, type, columns }),
  );
}

// ------------------------------------------------------------------ bucket
await ensure(`bucket "${BUCKET_ID}"`, () =>
  storage.createBucket({
    bucketId: BUCKET_ID,
    name: "Strain Images",
    permissions: [Permission.read(Role.any()), ...ADMIN_PERMS],
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 15 * 1024 * 1024,
    allowedFileExtensions: ["jpg", "jpeg", "png", "webp", "gif"],
  }),
);

// -------------------------------------------------------------------- team
await ensure(`team "${ADMIN_TEAM_ID}"`, () =>
  teamsApi.create({ teamId: ADMIN_TEAM_ID, name: "Admins" }),
);

// --------------------------------------------------------------- functions
const functionDefs = [
  { id: "strains-export", execute: [`team:${ADMIN_TEAM_ID}`] },
  { id: "ai-strain-import", execute: [`team:${ADMIN_TEAM_ID}`] },
  { id: "generate-strain-image", execute: [`team:${ADMIN_TEAM_ID}`] },
  { id: "voice-search-transcribe", execute: ["users"] },
];
for (const f of functionDefs) {
  await ensure(`function "${f.id}"`, () =>
    functionsApi.create({
      functionId: f.id,
      name: f.id,
      runtime: RUNTIME,
      execute: f.execute,
      entrypoint: "src/main.js",
      commands: "npm install",
      enabled: true,
    }),
  );
}

console.log(`
Done. Next steps:
  1. Deploy the function code:  cd appwrite && appwrite push functions
     (or create deployments manually in the Appwrite console — see README.md)
  2. Set function env vars (see README.md): APPWRITE_API_KEY on all functions,
     AI_API_KEY on the AI ones, FIRECRAWL_API_KEY on ai-strain-import.
  3. Add yourself to the "${ADMIN_TEAM_ID}" team (Console → Auth → Teams).
  4. Fill .env with VITE_APPWRITE_ENDPOINT / VITE_APPWRITE_PROJECT_ID.
`);
