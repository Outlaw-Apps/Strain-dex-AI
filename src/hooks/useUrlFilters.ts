import { useSearchParams } from "react-router-dom";
import { useCallback, useMemo } from "react";

export type StrainTypeFilter = "Sativa" | "Indica" | "Hybrid" | "All";
export type SortOption = "name" | "thc-desc" | "thc-asc" | "cbd-desc";

interface FilterState {
  search: string;
  type: StrainTypeFilter;
  sort: SortOption;
  effects: string[];
  favorites: boolean;
}

const DEFAULTS: FilterState = {
  search: "",
  type: "All",
  sort: "name",
  effects: [],
  favorites: false,
};

export function useUrlFilters() {
  const [params, setParams] = useSearchParams();

  const state = useMemo<FilterState>(
    () => ({
      search: params.get("q") ?? DEFAULTS.search,
      type: (params.get("type") as StrainTypeFilter) ?? DEFAULTS.type,
      sort: (params.get("sort") as SortOption) ?? DEFAULTS.sort,
      effects: params.get("effects")?.split(",").filter(Boolean) ?? DEFAULTS.effects,
      favorites: params.get("fav") === "1",
    }),
    [params],
  );

  const update = useCallback(
    (patch: Partial<FilterState>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const merged = { ...state, ...patch };
          merged.search ? next.set("q", merged.search) : next.delete("q");
          merged.type !== "All" ? next.set("type", merged.type) : next.delete("type");
          merged.sort !== "name" ? next.set("sort", merged.sort) : next.delete("sort");
          merged.effects.length ? next.set("effects", merged.effects.join(",")) : next.delete("effects");
          merged.favorites ? next.set("fav", "1") : next.delete("fav");
          return next;
        },
        { replace: true },
      );
    },
    [setParams, state],
  );

  return { ...state, update };
}
