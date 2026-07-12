import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  const denied = !loading && !adminLoading && (!user || !isAdmin);

  useEffect(() => {
    if (denied) {
      toast({
        title: "Admin only",
        description: "You need admin access to view that page.",
        variant: "destructive",
      });
    }
  }, [denied]);

  if (loading || (user && adminLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (denied) return <Navigate to="/" replace />;

  return <>{children}</>;
}
