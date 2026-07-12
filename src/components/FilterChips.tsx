import { motion } from "framer-motion";

type StrainTypeFilter = "Sativa" | "Indica" | "Hybrid" | "All";

const filters: { label: string; value: StrainTypeFilter }[] = [
  { label: "All", value: "All" },
  { label: "Indica", value: "Indica" },
  { label: "Sativa", value: "Sativa" },
  { label: "Hybrid", value: "Hybrid" },
];

interface FilterChipsProps {
  active: StrainTypeFilter;
  onChange: (value: StrainTypeFilter) => void;
}

export function FilterChips({ active, onChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {filters.map((filter) => {
        const isActive = active === filter.value;
        return (
          <button
            key={filter.value}
            onClick={() => onChange(filter.value)}
            className={`relative px-5 md:px-6 py-2 md:py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-200 border ${
              isActive
                ? "chrome-gold-bg-h text-background border-transparent shadow-[0_0_20px_hsl(43_76%_54%/0.35)]"
                : "bg-transparent text-muted-foreground border-gold/25 hover:text-gold-light hover:border-gold"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeFilter"
                className="absolute inset-0"
                style={{ zIndex: -1 }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
