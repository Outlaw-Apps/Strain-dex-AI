import type { Models } from "appwrite";

export type StrainType = "Sativa" | "Indica" | "Hybrid";

/** Shape the UI consumes — mirrors the old Supabase `strains` row. */
export interface DbStrain {
  id: string;
  name: string;
  type: StrainType;
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
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Fields that can be written to the strains table. */
export type StrainUpdate = Partial<Omit<DbStrain, "id" | "created_at" | "updated_at">>;

export interface FavoriteRow {
  id: string;
  user_id: string;
  strain_id: string;
  created_at: string;
}

type Row = Models.DefaultRow;

const str = (v: unknown): string => (typeof v === "string" ? v : "");

const strOrNull = (v: unknown): string | null =>
  typeof v === "string" && v ? v : null;

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const STRAIN_TYPES: StrainType[] = ["Sativa", "Indica", "Hybrid"];

export function toStrain(row: Row): DbStrain {
  const type = str(row.type);
  return {
    id: row.$id,
    name: str(row.name),
    type: (STRAIN_TYPES.includes(type as StrainType) ? type : "Hybrid") as StrainType,
    thc: num(row.thc),
    cbd: num(row.cbd),
    description: str(row.description),
    genetics: str(row.genetics),
    dominant_terpene: str(row.dominant_terpene),
    effects: strArr(row.effects),
    negative_effects: strArr(row.negative_effects),
    medical_uses: strArr(row.medical_uses),
    aromas: strArr(row.aromas),
    tastes: strArr(row.tastes),
    image_url: str(row.image_url),
    created_at: row.$createdAt,
    updated_at: row.$updatedAt,
    deleted_at: strOrNull(row.deleted_at),
  };
}

export function toFavorite(row: Row): FavoriteRow {
  return {
    id: row.$id,
    user_id: str(row.user_id),
    strain_id: str(row.strain_id),
    created_at: row.$createdAt,
  };
}
