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
            aria-pressed={isActive}
            className={`relative px-5 md:px-6 py-2 md:py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-200 border outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.96] ${
              isActive
                ? "chrome-gold-bg-h text-background border-transparent shadow-[0_0_20px_hsl(43_76%_54%/0.35)] hover:shadow-[0_0_28px_hsl(152_100%_50%/0.45)] active:shadow-[0_0_12px_hsl(152_100%_50%/0.6)]"
                : "bg-transparent text-muted-foreground border-gold/25 hover:text-primary hover:border-primary hover:shadow-[0_0_18px_hsl(152_100%_50%/0.25)] active:bg-primary/10 active:border-primary active:text-primary"
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
