import { useQuery } from "@tanstack/react-query";
import { Query } from "appwrite";
import { DATABASE_ID, TABLES, tables } from "@/integrations/appwrite/client";
import { toStrain, type DbStrain } from "@/integrations/appwrite/types";

export type { DbStrain };
export type SortOption = "name" | "thc-desc" | "thc-asc" | "cbd-desc";

const PAGE_SIZE = 500;

/** Fetch all strains (paginated). Soft-deleted rows are excluded unless includeDeleted. */
export async function fetchStrains(options?: { includeDeleted?: boolean }): Promise<DbStrain[]> {
  const all: DbStrain[] = [];
  let cursor: string | undefined;
  for (;;) {
    const queries = [
      ...(options?.includeDeleted ? [] : [Query.isNull("deleted_at")]),
      Query.orderAsc("name"),
      Query.limit(PAGE_SIZE),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ];
    const res = await tables.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.strains,
      queries,
    });
    all.push(...res.rows.map(toStrain));
    if (res.rows.length < PAGE_SIZE) break;
    cursor = res.rows[res.rows.length - 1].$id;
  }
  return all;
}

export function useStrains() {
  return useQuery({
    queryKey: ["strains"],
    queryFn: () => fetchStrains(),
  });
}
