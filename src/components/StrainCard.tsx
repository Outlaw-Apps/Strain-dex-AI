import { motion } from "framer-motion";
import { Leaf, Heart } from "lucide-react";
import type { DbStrain } from "@/hooks/useStrains";

interface StrainCardProps {
  strain: DbStrain;
  onClick: () => void;
  index: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function StrainCard({ strain, onClick, index, isFavorite, onToggleFavorite }: StrainCardProps) {
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
      transition={{ delay: index * 0.03, duration: 0.4 }}
      onClick={onClick}
      className="group cursor-pointer rounded-2xl bg-card border border-border overflow-hidden strain-card-hover"
    >
      <div className="aspect-square bg-secondary relative overflow-hidden">
        {strain.image_url ? (
          <img
            src={strain.image_url}
            alt={strain.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <Leaf className="w-12 h-12 md:w-16 md:h-16 text-primary/30 group-hover:text-primary/50 transition-colors duration-300" />
          </div>
        )}
        <div className="absolute top-2 right-2 md:top-3 md:right-3 flex items-center gap-1.5">
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className="p-1.5 rounded-full glass hover:bg-muted/80 transition-colors"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-primary text-primary" : "text-foreground/70"}`} />
            </button>
          )}
          <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${badgeClass}`}>
            {strain.type}
          </span>
        </div>
      </div>
      <div className="p-3 md:p-4">
        <h3 className="font-display font-semibold text-sm md:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {strain.name}
        </h3>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">
          THC {strain.thc}% · {strain.dominant_terpene}
        </p>
      </div>
    </motion.div>
  );
}
