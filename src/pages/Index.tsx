import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { FilterChips } from "@/components/FilterChips";
import { StrainCard } from "@/components/StrainCard";
import { StrainDetail } from "@/components/StrainDetail";
import { SortSelect } from "@/components/SortSelect";
import { EffectFilter } from "@/components/EffectFilter";
import { UserMenu } from "@/components/UserMenu";
import { Footer } from "@/components/Footer";
import { useStrains, type DbStrain } from "@/hooks/useStrains";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { toast } from "@/hooks/use-toast";
import heroBud from "@/assets/hero-bud.jpg";

const Index = () => {
  const filters = useUrlFilters();
  const { search, type: filter, sort, effects: effectFilters, favorites: showFavoritesOnly, update } = filters;

  const { data: strains = [], isLoading, isError, refetch } = useStrains();
  const { favoriteIds, toggleFavorite, isFavorite } = useFavorites();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleToggleFavorite = (id: string) => {
    if (!user) {
      toast({ title: "Sign in to save favorites" });
      navigate("/auth");
      return;
    }
    toggleFavorite(id);
  };

  const openStrain = (strain: DbStrain) => {
    // Update URL so refresh/share keeps context; StrainPage renders the sheet
    navigate(`/strain/${strain.name.toLowerCase().trim().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`);
  };

  const filteredStrains = useMemo(() => {
    let result = strains.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All" || s.type === filter;
      const matchesEffects =
        effectFilters.length === 0 ||
        effectFilters.every((ef) => s.effects.includes(ef));
      const matchesFav = !showFavoritesOnly || favoriteIds.includes(s.id);
      return matchesSearch && matchesFilter && matchesEffects && matchesFav;
    });

    result.sort((a, b) => {
      switch (sort) {
        case "thc-desc": return b.thc - a.thc;
        case "thc-asc": return a.thc - b.thc;
        case "cbd-desc": return b.cbd - a.cbd;
        default: return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [strains, search, filter, sort, effectFilters, showFavoritesOnly, favoriteIds]);

  const hasActiveFilters =
    !!search || filter !== "All" || effectFilters.length > 0 || showFavoritesOnly;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 opacity-10">
          <img src={heroBud} alt="" className="w-full h-full object-cover" fetchPriority="high" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />
        <div className="relative px-4 pt-8 pb-6 md:pt-16 md:pb-14">
          <div className="absolute top-4 right-4 z-10">
            <UserMenu
              showFavoritesOnly={showFavoritesOnly}
              onToggleFavorites={() => update({ favorites: !showFavoritesOnly })}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-6 md:mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <Leaf className="w-7 h-7 md:w-8 md:h-8 text-primary" />
              <h1 className="text-3xl md:text-5xl font-display font-bold">
                <span className="neon-text">Strain</span>{" "}
                <span className="text-foreground">Dex</span>
              </h1>
            </div>
            <p className="text-muted-foreground text-xs md:text-base max-w-md mx-auto">
              Your comprehensive cannabis strain database. Search, discover, and explore.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-3 md:space-y-4"
          >
            <SearchBar value={search} onChange={(v) => update({ search: v })} />
            <FilterChips active={filter} onChange={(v) => update({ type: v })} />
          </motion.div>
        </div>
      </header>

      <main className="flex-1 px-3 md:px-4 py-6 md:py-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <p className="text-sm text-muted-foreground">
            {filteredStrains.length} strain{filteredStrains.length !== 1 ? "s" : ""} found
          </p>
          <SortSelect value={sort} onChange={(v) => update({ sort: v })} />
        </div>

        <div className="mb-4 md:mb-6">
          <EffectFilter selected={effectFilters} onChange={(v) => update({ effects: v })} />
        </div>

        {isError ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-3">Couldn't load strains.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
            >
              Try again
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-card border border-border overflow-hidden animate-pulse">
                <div className="aspect-square bg-secondary" />
                <div className="p-3 md:p-4 space-y-2">
                  <div className="h-4 bg-secondary rounded w-3/4" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredStrains.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {filteredStrains.map((strain, i) => (
              <StrainCard
                key={strain.id}
                strain={strain}
                index={i}
                onClick={() => openStrain(strain)}
                isFavorite={isFavorite(strain.id)}
                onToggleFavorite={() => handleToggleFavorite(strain.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 md:py-20">
            <Leaf className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-display text-base md:text-lg">No strains found</p>
            <p className="text-muted-foreground/60 text-xs md:text-sm mt-1">Try adjusting your search or filters</p>
            {hasActiveFilters && (
              <button
                onClick={() =>
                  update({ search: "", type: "All", effects: [], favorites: false })
                }
                className="mt-4 px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-medium hover:bg-muted transition"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </main>

      <Footer />

      <StrainDetail
        strain={null}
        onClose={() => {}}
      />
    </div>
  );
};

export default Index;
