import { useState, useMemo } from "react";
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
import { useStrains, type DbStrain, type SortOption } from "@/hooks/useStrains";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import heroBud from "@/assets/hero-bud.jpg";


type StrainTypeFilter = "Sativa" | "Indica" | "Hybrid" | "All";

const Index = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StrainTypeFilter>("All");
  const [sort, setSort] = useState<SortOption>("name");
  const [effectFilters, setEffectFilters] = useState<string[]>([]);
  const [selectedStrain, setSelectedStrain] = useState<DbStrain | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const { data: strains = [], isLoading } = useStrains();
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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 opacity-10">
          <img src={heroBud} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />
        <div className="relative px-4 pt-8 pb-6 md:pt-16 md:pb-14">
          {/* Top bar */}
          <div className="absolute top-4 right-4 z-10">
            <UserMenu
              showFavoritesOnly={showFavoritesOnly}
              onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
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
            <SearchBar value={search} onChange={setSearch} />
            <FilterChips active={filter} onChange={setFilter} />
          </motion.div>
        </div>
      </header>

      {/* Results */}
      <main className="px-3 md:px-4 py-6 md:py-8 max-w-7xl mx-auto">
        {/* Controls row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <p className="text-sm text-muted-foreground">
            {filteredStrains.length} strain{filteredStrains.length !== 1 ? "s" : ""} found
          </p>
          <SortSelect value={sort} onChange={setSort} />
        </div>

        {/* Effect filters */}
        <div className="mb-4 md:mb-6">
          <EffectFilter selected={effectFilters} onChange={setEffectFilters} />
        </div>

        {isLoading ? (
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
                onClick={() => setSelectedStrain(strain)}
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
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <StrainDetail
        strain={selectedStrain}
        onClose={() => setSelectedStrain(null)}
        isFavorite={selectedStrain ? isFavorite(selectedStrain.id) : false}
        onToggleFavorite={selectedStrain ? () => handleToggleFavorite(selectedStrain.id) : undefined}

      />
    </div>
  );
};

export default Index;
