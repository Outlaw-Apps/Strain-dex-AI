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
        const chipClass =
          filter.value === "Indica"
            ? "badge-indica"
            : filter.value === "Sativa"
            ? "badge-sativa"
            : filter.value === "Hybrid"
            ? "badge-hybrid"
            : "";

        return (
          <button
            key={filter.value}
            onClick={() => onChange(filter.value)}
            className={`relative px-4 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium font-body transition-all duration-200 ${
              isActive
                ? filter.value === "All"
                  ? "bg-primary text-primary-foreground"
                  : chipClass
                : "bg-secondary text-secondary-foreground hover:bg-muted"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeFilter"
                className="absolute inset-0 rounded-full"
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
