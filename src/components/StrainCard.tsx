import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import type { Strain } from "@/data/strains";

interface StrainCardProps {
  strain: Strain;
  onClick: () => void;
  index: number;
}

export function StrainCard({ strain, onClick, index }: StrainCardProps) {
  const badgeClass =
    strain.type === "Indica"
      ? "badge-indica"
      : strain.type === "Sativa"
      ? "badge-sativa"
      : "badge-hybrid";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      onClick={onClick}
      className="group cursor-pointer rounded-2xl bg-card border border-border overflow-hidden strain-card-hover"
    >
      <div className="aspect-square bg-secondary relative overflow-hidden">
        {strain.image ? (
          <img
            src={strain.image}
            alt={strain.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <Leaf className="w-16 h-16 text-primary/30 group-hover:text-primary/50 transition-colors duration-300" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
            {strain.type}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
          {strain.name}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          THC {strain.thc}% · {strain.dominantTerpene}
        </p>
      </div>
    </motion.div>
  );
}
