import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("strain_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((f) => f.strain_id);
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async (strainId: string) => {
      if (!user) throw new Error("Must be logged in");
      const isFav = favoriteIds.includes(strainId);
      if (isFav) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("strain_id", strainId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, strain_id: strainId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] });
    },
  });

  return { favoriteIds, toggleFavorite: toggleFavorite.mutate, isFavorite: (id: string) => favoriteIds.includes(id) };
}
