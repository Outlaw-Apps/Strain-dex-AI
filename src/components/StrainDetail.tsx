import { motion, AnimatePresence } from "framer-motion";
import {
  X, Leaf, Droplets, Smile, Frown, Heart, Wind,
  Citrus, TreePine, Flame, Sparkles, Apple, Cherry, Grape,
  FlaskConical, Moon, Zap, Brain, Sun, Eye, Dna
} from "lucide-react";
import type { DbStrain } from "@/hooks/useStrains";

interface StrainDetailProps {
  strain: DbStrain | null;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const aromaIcons: Record<string, React.ReactNode> = {
  Citrus: <Citrus className="w-4 h-4" />,
  Pine: <TreePine className="w-4 h-4" />,
  Earthy: <Leaf className="w-4 h-4" />,
  Sweet: <Cherry className="w-4 h-4" />,
  Berry: <Grape className="w-4 h-4" />,
  Diesel: <Flame className="w-4 h-4" />,
  Tropical: <Sun className="w-4 h-4" />,
  Pungent: <Wind className="w-4 h-4" />,
  Woody: <TreePine className="w-4 h-4" />,
  Herbal: <Leaf className="w-4 h-4" />,
  Grape: <Grape className="w-4 h-4" />,
  Pineapple: <Apple className="w-4 h-4" />,
  Cedar: <TreePine className="w-4 h-4" />,
};

const effectColors: Record<string, string> = {
  Happy: "text-primary",
  Relaxed: "text-blue-400",
  Euphoric: "text-amber-400",
  Creative: "text-violet-400",
  Uplifted: "text-cyan-400",
  Energetic: "text-orange-400",
  Focused: "text-emerald-400",
  Sleepy: "text-indigo-400",
  Hungry: "text-yellow-400",
};

const effectIcons: Record<string, React.ReactNode> = {
  Happy: <Smile className="w-4 h-4" />,
  Relaxed: <Moon className="w-4 h-4" />,
  Euphoric: <Sparkles className="w-4 h-4" />,
  Creative: <Brain className="w-4 h-4" />,
  Uplifted: <Zap className="w-4 h-4" />,
  Energetic: <Zap className="w-4 h-4" />,
  Focused: <Brain className="w-4 h-4" />,
  Sleepy: <Moon className="w-4 h-4" />,
  Hungry: <Apple className="w-4 h-4" />,
};

export function StrainDetail({ strain, onClose, isFavorite, onToggleFavorite }: StrainDetailProps) {
  if (!strain) return null;

  const badgeClass =
    strain.type === "Indica"
      ? "badge-indica"
      : strain.type === "Sativa"
      ? "badge-sativa"
      : "badge-hybrid";

  return (
    <AnimatePresence>
      {strain && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-8"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-card border border-border scrollbar-thin"
          >
            {/* Drag handle for mobile */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Close + Favorite buttons */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center gap-2">
              {onToggleFavorite && (
                <button
                  onClick={onToggleFavorite}
                  className="p-2 rounded-full glass hover:bg-muted transition-colors"
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? "fill-primary text-primary" : "text-foreground"}`} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-full glass hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Header */}
            <div className="relative h-40 sm:h-48 md:h-64 bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
              {strain.image_url ? (
                <img src={strain.image_url} alt={strain.name} className="w-full h-full object-cover" />
              ) : (
                <Leaf className="w-20 h-20 md:w-24 md:h-24 text-primary/20" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 sm:bottom-4 sm:left-6 sm:right-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                    {strain.name}
                  </h2>
                  <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${badgeClass}`}>
                    {strain.type}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">{strain.genetics}</p>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Vitals */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="text-center p-3 sm:p-4 rounded-2xl bg-secondary">
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">THC</p>
                  <p className="text-xl sm:text-2xl font-display font-bold neon-text mt-1">{strain.thc}%</p>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-2xl bg-secondary">
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">CBD</p>
                  <p className="text-xl sm:text-2xl font-display font-bold text-foreground mt-1">{strain.cbd}%</p>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-2xl bg-secondary">
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Terpene</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <FlaskConical className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                    <p className="text-xs sm:text-sm font-display font-bold text-foreground">{strain.dominant_terpene}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-display font-semibold text-base sm:text-lg text-foreground mb-2">About</h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{strain.description}</p>
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {/* Aromas */}
                <div className="p-3 sm:p-4 rounded-2xl bg-secondary space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-primary" />
                    <h4 className="font-display font-semibold text-xs sm:text-sm text-foreground">Aroma</h4>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    {strain.aromas.map((aroma) => (
                      <div key={aroma} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                        {aromaIcons[aroma] || <Leaf className="w-4 h-4" />}
                        <span>{aroma}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Effects */}
                <div className="p-3 sm:p-4 rounded-2xl bg-secondary space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h4 className="font-display font-semibold text-xs sm:text-sm text-foreground">Effects</h4>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    {strain.effects.map((effect) => (
                      <div key={effect} className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm ${effectColors[effect] || "text-muted-foreground"}`}>
                        {effectIcons[effect] || <Smile className="w-4 h-4" />}
                        <span>{effect}</span>
                      </div>
                    ))}
                    {strain.negative_effects.map((effect) => (
                      <div key={effect} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-destructive/70">
                        <Frown className="w-4 h-4" />
                        <span>{effect}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Medical Uses */}
                <div className="p-3 sm:p-4 rounded-2xl bg-secondary space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    <h4 className="font-display font-semibold text-xs sm:text-sm text-foreground">Medical</h4>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    {strain.medical_uses.map((use) => (
                      <div key={use} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Heart className="w-3 h-3 text-primary/50" />
                        <span>{use}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Taste */}
                <div className="p-3 sm:p-4 rounded-2xl bg-secondary space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2">
                    <Apple className="w-4 h-4 text-primary" />
                    <h4 className="font-display font-semibold text-xs sm:text-sm text-foreground">Taste</h4>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    {strain.tastes.map((taste) => (
                      <div key={taste} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                        {aromaIcons[taste] || <Leaf className="w-4 h-4" />}
                        <span>{taste}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Appearance */}
                <div className="p-3 sm:p-4 rounded-2xl bg-secondary space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    <h4 className="font-display font-semibold text-xs sm:text-sm text-foreground">Appearance</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {strain.type === "Indica"
                      ? "Dense, chunky buds with deep green hues and often purple undertones."
                      : strain.type === "Sativa"
                      ? "Long, wispy buds in bright, light-green shades with vivid orange pistils."
                      : "Balanced structure with medium-density buds, rich green color, and frosty trichomes."}
                  </p>
                </div>

                {/* Genetics */}
                <div className="p-3 sm:p-4 rounded-2xl bg-secondary space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2">
                    <Dna className="w-4 h-4 text-primary" />
                    <h4 className="font-display font-semibold text-xs sm:text-sm text-foreground">Genetics</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {strain.genetics || "Lineage unknown"}
                  </p>
                </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
