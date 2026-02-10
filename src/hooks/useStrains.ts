import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DbStrain = Tables<"strains">;
export type SortOption = "name" | "thc-desc" | "thc-asc" | "cbd-desc";

export function useStrains() {
  return useQuery({
    queryKey: ["strains"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strains")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as DbStrain[];
    },
  });
}
