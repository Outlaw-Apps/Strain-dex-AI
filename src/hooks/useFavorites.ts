import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ID, Permission, Query, Role } from "appwrite";
import { DATABASE_ID, TABLES, tables } from "@/integrations/appwrite/client";
import { useAuth } from "./useAuth";

const PAGE_SIZE = 500;

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const ids: string[] = [];
      let cursor: string | undefined;
      for (;;) {
        const queries = [
          Query.equal("user_id", user!.id),
          Query.limit(PAGE_SIZE),
          ...(cursor ? [Query.cursorAfter(cursor)] : []),
        ];
        const res = await tables.listRows({
          databaseId: DATABASE_ID,
          tableId: TABLES.favorites,
          queries,
        });
        ids.push(...res.rows.map((r) => r.strain_id as string));
        if (res.rows.length < PAGE_SIZE) break;
        cursor = res.rows[res.rows.length - 1].$id;
      }
      return ids;
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async (strainId: string) => {
      if (!user) throw new Error("Must be logged in");
      const isFav = favoriteIds.includes(strainId);
      if (isFav) {
        const res = await tables.listRows({
          databaseId: DATABASE_ID,
          tableId: TABLES.favorites,
          queries: [
            Query.equal("user_id", user.id),
            Query.equal("strain_id", strainId),
            Query.limit(1),
          ],
        });
        const row = res.rows[0];
        if (row) {
          await tables.deleteRow({
            databaseId: DATABASE_ID,
            tableId: TABLES.favorites,
            rowId: row.$id,
          });
        }
      } else {
        await tables.createRow({
          databaseId: DATABASE_ID,
          tableId: TABLES.favorites,
          rowId: ID.unique(),
          data: { user_id: user.id, strain_id: strainId },
          // Row-level security: only the owner can see/remove their favorite.
          permissions: [
            Permission.read(Role.user(user.id)),
            Permission.update(Role.user(user.id)),
            Permission.delete(Role.user(user.id)),
          ],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] });
    },
  });

  return {
    favoriteIds,
    toggleFavorite: toggleFavorite.mutate,
    isFavorite: (id: string) => favoriteIds.includes(id),
  };
}
