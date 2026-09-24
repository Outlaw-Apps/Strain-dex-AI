import { useQuery } from "@tanstack/react-query";
import { ADMIN_TEAM_ID, teams } from "@/integrations/appwrite/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Admins are members of the "admins" Appwrite team. Only team members can
 * list a team's memberships, so non-admins get a 401/403 and we return false.
 */
export function useIsAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return false;
      try {
        const res = await teams.listMemberships({ teamId: ADMIN_TEAM_ID });
        return res.memberships.some((m) => m.userId === user.id && m.confirm);
      } catch {
        return false;
      }
    },
  });
}
