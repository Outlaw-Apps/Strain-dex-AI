// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
// Includes static routes plus one entry per public strain (fetched from Appwrite).

import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// npm does not load .env. bunx tsx does not either, so read it before the constants below.
function loadDotEnv(file = ".env") {
  const path = resolve(file);
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadDotEnv();

// TODO: replace with your project URL once a project name or custom domain is set.
const BASE_URL = "";

const APPWRITE_ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT = process.env.VITE_APPWRITE_PROJECT_ID;
const APPWRITE_DATABASE = process.env.VITE_APPWRITE_DATABASE_ID || "straindex";
const PAGE_SIZE = 500;

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function loadStrainEntries(): Promise<SitemapEntry[]> {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT) {
    console.warn(
      "sitemap: VITE_APPWRITE_ENDPOINT or VITE_APPWRITE_PROJECT_ID is unset; strain URLs omitted",
    );
    return [];
  }
  try {
    const entries: SitemapEntry[] = [];
    let cursor: string | undefined;
    for (;;) {
      const queries = [
        JSON.stringify({ method: "isNull", attribute: "deleted_at", values: [] }),
        JSON.stringify({ method: "select", attribute: null, values: ["name"] }),
        JSON.stringify({ method: "limit", attribute: null, values: [PAGE_SIZE] }),
      ];
      if (cursor) {
        queries.push(JSON.stringify({ method: "cursorAfter", attribute: null, values: [cursor] }));
      }
      const url = new URL(
        `${APPWRITE_ENDPOINT}/tablesdb/${APPWRITE_DATABASE}/tables/strains/rows`,
      );
      for (const q of queries) url.searchParams.append("queries[]", q);
      const res = await fetch(url, { headers: { "X-Appwrite-Project": APPWRITE_PROJECT } });
      if (!res.ok) {
        console.warn(
          `sitemap: Appwrite returned ${res.status}; wrote ${entries.length} strain URLs`,
        );
        return entries;
      }
      const data = (await res.json()) as {
        rows?: Array<{ $id: string; $updatedAt?: string; name?: string }>;
      };
      const rows = data.rows ?? [];
      for (const s of rows) {
        if (!s.name) continue;
        entries.push({
          path: `/strain/${toSlug(s.name)}`,
          lastmod: s.$updatedAt ? s.$updatedAt.slice(0, 10) : undefined,
          changefreq: "monthly",
          priority: "0.7",
        });
      }
      if (rows.length < PAGE_SIZE) break;
      cursor = rows[rows.length - 1].$id;
    }
    return entries;
  } catch (err) {
    console.warn(
      "sitemap: failed to load strains:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

async function main() {
  const staticEntries: SitemapEntry[] = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
  ];
  const strainEntries = await loadStrainEntries();
  const all = [...staticEntries, ...strainEntries];
  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(all));
  console.log(`sitemap.xml written (${all.length} entries)`);
}

main();
