import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Leaf, Sparkles, Loader2 } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { FilterChips } from "@/components/FilterChips";
import { StrainCard } from "@/components/StrainCard";

import { SortSelect } from "@/components/SortSelect";
import { EffectFilter } from "@/components/EffectFilter";
import { UserMenu } from "@/components/UserMenu";
import { Footer } from "@/components/Footer";
import { useStrains, type DbStrain } from "@/hooks/useStrains";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { toast } from "@/hooks/use-toast";
import { callFunction, FUNCTIONS } from "@/integrations/appwrite/client";
import { useQueryClient } from "@tanstack/react-query";
import heroBud from "@/assets/hero-bud.jpg";

const Index = () => {
  const filters = useUrlFilters();
  const { search, type: filter, sort, effects: effectFilters, favorites: showFavoritesOnly, update } = filters;

  const { data: strains = [], isLoading, isError, refetch } = useStrains();
  const { favoriteIds, toggleFavorite, isFavorite } = useFavorites();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);

  const handleAiImport = async () => {
    const name = search.trim();
    if (!name) return;
    if (!user) {
      toast({ title: "Sign in to add strains" });
      navigate("/auth");
      return;
    }
    if (!isAdmin) {
      toast({ variant: "destructive", title: "Admin only", description: "Only admins can add new strains." });
      return;
    }
    setIsImporting(true);
    toast({ title: `Researching "${name}"…`, description: "Fetching data and generating strain card." });
    try {
      const data = await callFunction<{
        results?: Array<{ status: string; error?: string }>;
      }>(FUNCTIONS.aiStrainImport, { names: [name] });
      const result = data?.results?.[0];
      if (result?.status === "inserted") {
        await queryClient.invalidateQueries({ queryKey: ["strains"] });
        toast({ title: `Added "${name}"`, description: "Strain card is now in your archive." });
      } else if (result?.status === "updated") {
        await queryClient.invalidateQueries({ queryKey: ["strains"] });
        toast({ title: `Updated "${name}"`, description: "Existing strain merged with new data — no duplicate created." });
      } else {
        throw new Error(result?.error || "Import failed");
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't add strain", description: (e as Error).message });
    } finally {
      setIsImporting(false);
    }
  };

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
      <header className="relative overflow-hidden border-b border-gold/20">
        <div className="absolute inset-0 opacity-[0.07]">
          <img src={heroBud} alt="" className="w-full h-full object-cover" fetchPriority="high" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/90 to-background" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-primary/10 blur-[120px] pointer-events-none" />

        <div className="relative px-4 pt-10 pb-8 md:pt-16 md:pb-14 max-w-7xl mx-auto">
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
            className="text-center mb-8 md:mb-10"
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <Leaf className="w-6 h-6 md:w-7 md:h-7 text-primary drop-shadow-[0_0_10px_hsl(152_100%_50%/0.6)]" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.5em] text-primary">Elite Genetics Archive</span>
            </div>
            <h1 className="chrome-gold font-display text-5xl md:text-8xl uppercase leading-[0.85] track-tightest">
              Strain Dex
            </h1>
            <div className="mt-4 mx-auto max-w-md hairline-gold" />
            <p className="text-muted-foreground text-xs md:text-sm max-w-md mx-auto mt-4 font-medium tracking-wide">
              Bold. Sharp. Clear. A high-potency strain archive.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-4 md:space-y-5"
          >
            <SearchBar value={search} onChange={(v) => update({ search: v })} />
            <FilterChips active={filter} onChange={(v) => update({ type: v })} />
          </motion.div>
        </div>
      </header>

      <main className="flex-1 px-3 md:px-4 py-6 md:py-10 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 md:mb-8 pb-4 border-b border-gold/15">
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            <span className="text-gold">{filteredStrains.length}</span> strain{filteredStrains.length !== 1 ? "s" : ""} in archive
          </p>
          <SortSelect value={sort} onChange={(v) => update({ sort: v })} />
        </div>

        <div className="mb-6 md:mb-8">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
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
            <p className="text-muted-foreground/60 text-xs md:text-sm mt-1">
              {search.trim()
                ? "Not in the archive yet — let AI research it for you."
                : "Try adjusting your search or filters"}
            </p>
            {search.trim() && isAdmin && (
              <button
                onClick={handleAiImport}
                disabled={isImporting}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-black uppercase tracking-widest shadow-[0_0_20px_hsl(152_100%_50%/0.4)] hover:shadow-[0_0_28px_hsl(152_100%_50%/0.7)] disabled:opacity-60 disabled:cursor-not-allowed transition"
                aria-label={`Add ${search} with AI`}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding "{search}"…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Add "{search}" with AI
                  </>
                )}
              </button>
            )}
            {hasActiveFilters && (
              <div>
                <button
                  onClick={() =>
                    update({ search: "", type: "All", effects: [], favorites: false })
                  }
                  className="mt-4 px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-medium hover:bg-muted transition"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

        )}
      </main>

      <Footer />
    </div>

  );
};

export default Index;
