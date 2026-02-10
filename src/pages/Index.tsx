import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Leaf, Cannabis } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { FilterChips } from "@/components/FilterChips";
import { StrainCard } from "@/components/StrainCard";
import { StrainDetail } from "@/components/StrainDetail";
import { mockStrains, type Strain, type StrainType } from "@/data/strains";
import heroBud from "@/assets/hero-bud.jpg";

const Index = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StrainType | "All">("All");
  const [selectedStrain, setSelectedStrain] = useState<Strain | null>(null);

  const filteredStrains = useMemo(() => {
    return mockStrains.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All" || s.type === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 opacity-10">
          <img src={heroBud} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />
        <div className="relative px-4 pt-12 pb-10 md:pt-16 md:pb-14">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <Leaf className="w-8 h-8 text-primary" />
              <h1 className="text-4xl md:text-5xl font-display font-bold">
                <span className="neon-text">Strain</span>{" "}
                <span className="text-foreground">Dex</span>
              </h1>
            </div>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
              Your comprehensive cannabis strain database. Search, discover, and explore.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-4"
          >
            <SearchBar value={search} onChange={setSearch} />
            <FilterChips active={filter} onChange={setFilter} />
          </motion.div>
        </div>
      </header>

      {/* Results */}
      <main className="px-4 py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {filteredStrains.length} strain{filteredStrains.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {filteredStrains.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredStrains.map((strain, i) => (
              <StrainCard
                key={strain.id}
                strain={strain}
                index={i}
                onClick={() => setSelectedStrain(strain)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Leaf className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-display text-lg">No strains found</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <StrainDetail strain={selectedStrain} onClose={() => setSelectedStrain(null)} />
    </div>
  );
};

export default Index;
