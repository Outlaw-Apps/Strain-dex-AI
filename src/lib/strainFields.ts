/**
 * Strain list fields (aromas, effects, tastes, …) reach the UI in a few shapes:
 * a real array, a JSON-encoded array (`'["Diesel","Pine"]'`), or a delimited
 * string (`"Diesel|Pine"`). A JSON-encoded value rendered as-is becomes one
 * long, unbreakable token, which is what blew the trait cards apart.
 */

const LIST_DELIMITERS = /[|;\n\r,]+/;
const MAX_LIST_ITEMS = 24;

/** Strip leftover quotes/brackets from a single list entry. */
const cleanItem = (raw: string): string =>
  raw
    .trim()
    .replace(/^[["'\s]+/, "")
    .replace(/["'\s\]]+$/, "")
    .trim();

const parseJsonArray = (value: string): unknown[] | null => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    // Malformed JSON (e.g. a truncated import) falls through to delimiter splitting.
    return null;
  }
};

/**
 * Normalise any list-shaped strain field into clean, de-duplicated strings.
 * Non-string entries, empty values and nested garbage are dropped rather than
 * rendered, and the result is capped so a bad row cannot dominate the layout.
 */
export function normalizeStrainList(value: unknown, limit = MAX_LIST_ITEMS): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const max = Math.max(0, limit);

  const push = (raw: string) => {
    const item = cleanItem(raw);
    if (!item) return;
    const key = item.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    if (out.length < max) out.push(item);
  };

  const visit = (input: unknown, depth: number) => {
    if (depth > 3 || input == null) return;
    if (Array.isArray(input)) {
      input.forEach((entry) => visit(entry, depth + 1));
      return;
    }
    if (typeof input !== "string") return;

    const nested = parseJsonArray(input);
    if (nested) {
      visit(nested, depth + 1);
      return;
    }
    input.split(LIST_DELIMITERS).forEach(push);
  };

  visit(value, 0);
  return out;
}

/** Format a strain metric (THC/CBD) for display, tolerating missing or invalid values. */
export function formatMetric(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" && value.trim() === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return String(Math.round(n * 10) / 10);
}

/** Metric plus a percent sign, or a bare em dash when the value is unusable. */
export function formatPercent(value: unknown): string {
  const metric = formatMetric(value);
  return metric === "—" ? metric : `${metric}%`;
}

/** Trimmed string or a fallback, for optional text fields. */
export function textOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

const CROSS_SEPARATOR = /×|\/|\+|,|\s+x\s+/i;

/**
 * Split a lineage string into parent strains. Separators inside parentheses are
 * ignored, so descriptive lineage such as
 * "OG Kush Cross (heavy Indica x high-THC Hybrid)" stays in one piece.
 */
export function splitParents(genetics: unknown): string[] {
  const text = typeof genetics === "string" ? genetics.trim() : "";
  if (!text) return [];

  // Mask parenthesised notes so their separators are not mistaken for crosses.
  let masked = "";
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === "(") depth += 1;
    masked += depth > 0 ? "\u0000" : char;
    if (char === ")") depth = Math.max(0, depth - 1);
  }

  const parts: string[] = [];
  let start = 0;
  let match: RegExpExecArray | null;
  const separator = new RegExp(CROSS_SEPARATOR.source, "gi");
  while ((match = separator.exec(masked)) !== null) {
    parts.push(text.slice(start, match.index));
    start = match.index + match[0].length;
  }
  parts.push(text.slice(start));

  return parts.map((part) => part.trim()).filter(Boolean);
}
