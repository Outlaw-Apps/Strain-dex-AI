import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { LogOut, User, Heart, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserMenuProps {
  showFavoritesOnly: boolean;
  onToggleFavorites: () => void;
}

export function UserMenu({ showFavoritesOnly, onToggleFavorites }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const navigate = useNavigate();

  if (!user) {
    return (
      <button
        onClick={() => navigate("/auth")}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <User className="w-4 h-4" />
        <span className="hidden sm:inline">Sign In</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleFavorites}
        className={`p-2 rounded-xl transition-all ${
          showFavoritesOnly
            ? "bg-primary/20 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
        title="Show favorites"
      >
        <Heart className={`w-5 h-5 ${showFavoritesOnly ? "fill-primary" : ""}`} />
      </button>
      {isAdmin && (
        <button
          onClick={() => navigate("/admin/bulk-upload")}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all text-sm font-medium"
          title="Admin panel"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Admin</span>
        </button>
      )}
      <button
        onClick={signOut}
        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        title="Sign out"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  );
}
