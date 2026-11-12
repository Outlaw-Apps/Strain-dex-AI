import { describe, expect, it } from "vitest";
import { formatMetric, formatPercent, normalizeStrainList, splitParents, textOr } from "@/lib/strainFields";
import { toStrain } from "@/integrations/appwrite/types";

describe("normalizeStrainList", () => {
  it("keeps a clean array as-is", () => {
    expect(normalizeStrainList(["Relaxed", "Happy"])).toEqual(["Relaxed", "Happy"]);
  });

  it("splits JSON-encoded arrays (the import artefact that overflowed the cards)", () => {
    expect(normalizeStrainList('["Diesel Fuel","Earthy Kush","Acrid Pine","Pepper"]')).toEqual([
      "Diesel Fuel",
      "Earthy Kush",
      "Acrid Pine",
      "Pepper",
    ]);
  });

  it("unwraps a JSON array stored as the only element of a real array", () => {
    expect(normalizeStrainList(['["Relaxing","Sleepy","Euphoric"]'])).toEqual([
      "Relaxing",
      "Sleepy",
      "Euphoric",
    ]);
  });

  it("splits delimited strings and trims surrounding junk", () => {
    expect(normalizeStrainList(" Berry | Sweet ; Herbal ")).toEqual(["Berry", "Sweet", "Herbal"]);
    expect(normalizeStrainList('["Truncated","import')).toEqual(["Truncated", "import"]);
  });

  it("trims, de-duplicates case-insensitively and drops empty entries", () => {
    expect(normalizeStrainList([" Relaxed ", "relaxed", "", "   ", "Happy"])).toEqual([
      "Relaxed",
      "Happy",
    ]);
  });

  it("drops non-string and unusable input", () => {
    expect(normalizeStrainList([1, null, undefined, {}, ["Nested"]] as unknown)).toEqual(["Nested"]);
    expect(normalizeStrainList(null)).toEqual([]);
    expect(normalizeStrainList(undefined)).toEqual([]);
    expect(normalizeStrainList(42)).toEqual([]);
    expect(normalizeStrainList({ a: "b" })).toEqual([]);
    expect(normalizeStrainList("[]")).toEqual([]);
    expect(normalizeStrainList("[")).toEqual([]);
  });

  it("caps runaway lists", () => {
    const many = Array.from({ length: 40 }, (_, i) => `Item ${i}`);
    expect(normalizeStrainList(many)).toHaveLength(24);
    expect(normalizeStrainList(many, 3)).toEqual(["Item 0", "Item 1", "Item 2"]);
    expect(normalizeStrainList(many, 0)).toEqual([]);
  });
});

describe("formatMetric / formatPercent", () => {
  it("formats finite numbers and rounds to one decimal", () => {
    expect(formatMetric(26)).toBe("26");
    expect(formatMetric(0.55)).toBe("0.6");
    expect(formatMetric("18.2")).toBe("18.2");
    expect(formatPercent(26)).toBe("26%");
  });

  it("falls back to an em dash for missing or invalid values", () => {
    expect(formatMetric(NaN)).toBe("—");
    expect(formatMetric(Infinity)).toBe("—");
    expect(formatMetric(null)).toBe("—");
    expect(formatMetric(undefined)).toBe("—");
    expect(formatPercent(undefined)).toBe("—");
  });
});

describe("textOr", () => {
  it("trims strings and falls back for blanks or non-strings", () => {
    expect(textOr("  Blue Dream ", "fallback")).toBe("Blue Dream");
    expect(textOr("   ", "fallback")).toBe("fallback");
    expect(textOr(null, "fallback")).toBe("fallback");
    expect(textOr(7, "fallback")).toBe("fallback");
  });
});

describe("splitParents", () => {
  it("splits simple cross lists", () => {
    expect(splitParents("Blueberry x Haze")).toEqual(["Blueberry", "Haze"]);
    expect(splitParents("OG Kush × Chemdawg")).toEqual(["OG Kush", "Chemdawg"]);
    expect(splitParents("A / B + C, D")).toEqual(["A", "B", "C", "D"]);
  });

  it("ignores separators inside descriptive parentheses", () => {
    expect(
      splitParents(
        "Proprietary OG Kush Cross (Likely involving heavy Indica x high-THC Hybrid)",
      ),
    ).toEqual([
      "Proprietary OG Kush Cross (Likely involving heavy Indica x high-THC Hybrid)",
    ]);
    expect(splitParents("OG Kush x (Chemdawg x Sour Diesel)")).toEqual([
      "OG Kush",
      "(Chemdawg x Sour Diesel)",
    ]);
  });

  it("returns no parents for empty or invalid input", () => {
    expect(splitParents("")).toEqual([]);
    expect(splitParents("   ")).toEqual([]);
    expect(splitParents(null)).toEqual([]);
    expect(splitParents(undefined)).toEqual([]);
    expect(splitParents(" , / ")).toEqual([]);
  });
});

describe("toStrain", () => {
  const row = (overrides: Record<string, unknown> = {}) =>
    ({
      $id: "row-1",
      $createdAt: "2026-01-01T00:00:00.000Z",
      $updatedAt: "2026-01-01T00:00:00.000Z",
      name: "  Insanity OG  ",
      type: "hybrid",
      thc: "26",
      cbd: 0.5,
      description: "  Desc  ",
      genetics: "OG Kush",
      dominant_terpene: "Myrcene",
      effects: '["Relaxing","Euphoric"]',
      negative_effects: ["Dry Mouth", "dry mouth"],
      medical_uses: null,
      aromas: '["Diesel","Earthy"]',
      tastes: "Sweet|Fruity",
      image_url: "",
      deleted_at: "",
      ...overrides,
    }) as never;

  it("normalises list columns and text at the data boundary", () => {
    const strain = toStrain(row());
    expect(strain.effects).toEqual(["Relaxing", "Euphoric"]);
    expect(strain.negative_effects).toEqual(["Dry Mouth"]);
    expect(strain.medical_uses).toEqual([]);
    expect(strain.aromas).toEqual(["Diesel", "Earthy"]);
    expect(strain.tastes).toEqual(["Sweet", "Fruity"]);
    expect(strain.name).toBe("Insanity OG");
    expect(strain.description).toBe("Desc");
    expect(strain.deleted_at).toBeNull();
  });

  it("coerces invalid types and numbers", () => {
    const strain = toStrain(row({ type: "Ruderalis", thc: "not-a-number", cbd: Infinity }));
    expect(strain.type).toBe("Hybrid");
    expect(strain.thc).toBe(0);
    expect(strain.cbd).toBe(0);
  });
});
