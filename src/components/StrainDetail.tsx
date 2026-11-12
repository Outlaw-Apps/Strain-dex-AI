import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Leaf, Droplets, Smile, Frown, Heart, Wind,
  Citrus, TreePine, Flame, Sparkles, Apple, Cherry, Grape,
  FlaskConical, Moon, Zap, Brain, Sun, Eye, Dna,
  Coffee, Candy, Flower2, Nut, Milk, Wheat,
  AlertCircle, CloudFog, EyeOff, Droplet, HeartCrack, Angry, Skull
} from "lucide-react";
import type { DbStrain } from "@/hooks/useStrains";
import { ShareButton } from "@/components/ShareButton";
import { StrainTraitGroup, StrainTraitPills, StrainTraitSection } from "@/components/StrainTrait";
import { cn } from "@/lib/utils";
import { toSlug } from "@/lib/slug";
import { formatPercent, normalizeStrainList, splitParents, textOr } from "@/lib/strainFields";


interface StrainDetailProps {
  strain: DbStrain | null;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const aromaIcons: Record<string, React.ReactNode> = {
  Citrus: <Citrus className="w-4 h-4" />,
  Lemon: <Citrus className="w-4 h-4" />,
  Orange: <Citrus className="w-4 h-4" />,
  Pine: <TreePine className="w-4 h-4" />,
  Earthy: <Leaf className="w-4 h-4" />,
  Sweet: <Candy className="w-4 h-4" />,
  Sugar: <Candy className="w-4 h-4" />,
  Berry: <Grape className="w-4 h-4" />,
  Blueberry: <Grape className="w-4 h-4" />,
  Diesel: <Flame className="w-4 h-4" />,
  Gas: <Flame className="w-4 h-4" />,
  Skunk: <Flame className="w-4 h-4" />,
  Chemical: <Flame className="w-4 h-4" />,
  Tropical: <Sun className="w-4 h-4" />,
  Mango: <Sun className="w-4 h-4" />,
  Pungent: <Wind className="w-4 h-4" />,
  Woody: <TreePine className="w-4 h-4" />,
  Herbal: <Leaf className="w-4 h-4" />,
  Mint: <Leaf className="w-4 h-4" />,
  Menthol: <Leaf className="w-4 h-4" />,
  Grape: <Grape className="w-4 h-4" />,
  Pineapple: <Apple className="w-4 h-4" />,
  Apple: <Apple className="w-4 h-4" />,
  Cherry: <Cherry className="w-4 h-4" />,
  Cedar: <TreePine className="w-4 h-4" />,
  Floral: <Flower2 className="w-4 h-4" />,
  Lavender: <Flower2 className="w-4 h-4" />,
  Rose: <Flower2 className="w-4 h-4" />,
  Coffee: <Coffee className="w-4 h-4" />,
  Chocolate: <Coffee className="w-4 h-4" />,
  Nutty: <Nut className="w-4 h-4" />,
  Almond: <Nut className="w-4 h-4" />,
  Creamy: <Milk className="w-4 h-4" />,
  Vanilla: <Milk className="w-4 h-4" />,
  Spicy: <Flame className="w-4 h-4" />,
  Pepper: <Flame className="w-4 h-4" />,
  Grass: <Wheat className="w-4 h-4" />,
  Hay: <Wheat className="w-4 h-4" />,
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

const negativeEffectIcons: Record<string, React.ReactNode> = {
  "Dry Mouth": <Droplet className="w-4 h-4" />,
  "Dry Eyes": <EyeOff className="w-4 h-4" />,
  Paranoid: <AlertCircle className="w-4 h-4" />,
  Paranoia: <AlertCircle className="w-4 h-4" />,
  Anxious: <HeartCrack className="w-4 h-4" />,
  Anxiety: <HeartCrack className="w-4 h-4" />,
  Dizzy: <CloudFog className="w-4 h-4" />,
  Headache: <Skull className="w-4 h-4" />,
  Irritable: <Angry className="w-4 h-4" />,
};

const defaultEffectIcon = <Smile className="w-4 h-4" />;
const defaultNegativeEffectIcon = <Frown className="w-4 h-4" />;
const defaultMedicalIcon = <Heart className="w-4 h-4" />;

const defaultAromaIcon = <Droplets className="w-4 h-4 text-primary/60" aria-label="Unmapped scent" />;
const defaultTasteIcon = <Apple className="w-4 h-4 text-primary/60" aria-label="Unmapped taste" />;

const appearanceIcons: Record<string, React.ReactNode> = {
  Purple: <Grape className="w-3.5 h-3.5 text-violet-400" />,
  Green: <Leaf className="w-3.5 h-3.5 text-emerald-400" />,
  Orange: <Flame className="w-3.5 h-3.5 text-orange-400" />,
  Amber: <Flame className="w-3.5 h-3.5 text-amber-400" />,
  Frosty: <Sparkles className="w-3.5 h-3.5 text-cyan-300" />,
  Trichomes: <Sparkles className="w-3.5 h-3.5 text-cyan-300" />,
  Dense: <FlaskConical className="w-3.5 h-3.5 text-primary/70" />,
  Chunky: <FlaskConical className="w-3.5 h-3.5 text-primary/70" />,
  Wispy: <Wind className="w-3.5 h-3.5 text-primary/70" />,
  Long: <Wind className="w-3.5 h-3.5 text-primary/70" />,
  Pistils: <Flower2 className="w-3.5 h-3.5 text-orange-300" />,
};
const defaultAppearanceIcon = (
  <Eye className="w-3.5 h-3.5 text-primary/60" aria-label="General appearance trait" />
);

const geneticsIcons: Record<string, React.ReactNode> = {
  Kush: <TreePine className="w-3.5 h-3.5 text-emerald-400" />,
  Haze: <Sun className="w-3.5 h-3.5 text-amber-300" />,
  Diesel: <Flame className="w-3.5 h-3.5 text-orange-400" />,
  Blueberry: <Grape className="w-3.5 h-3.5 text-blue-400" />,
  OG: <Leaf className="w-3.5 h-3.5 text-primary" />,
  Cookies: <Candy className="w-3.5 h-3.5 text-pink-400" />,
  Cake: <Milk className="w-3.5 h-3.5 text-primary/80" />,
  Gelato: <Milk className="w-3.5 h-3.5 text-primary/80" />,
  Cheese: <Milk className="w-3.5 h-3.5 text-yellow-300" />,
  Skunk: <Wind className="w-3.5 h-3.5 text-emerald-300" />,
  Purple: <Grape className="w-3.5 h-3.5 text-violet-400" />,
  Lemon: <Citrus className="w-3.5 h-3.5 text-yellow-300" />,
  Cherry: <Cherry className="w-3.5 h-3.5 text-rose-400" />,
  Glue: <FlaskConical className="w-3.5 h-3.5 text-primary/70" />,
  Runtz: <Candy className="w-3.5 h-3.5 text-pink-400" />,
  Zkittlez: <Candy className="w-3.5 h-3.5 text-fuchsia-400" />,
};
const defaultGeneticsIcon = (
  <Dna className="w-3.5 h-3.5 text-primary/60" aria-label="Unmapped lineage" />
);

const iconForKeyword = (
  text: string,
  map: Record<string, React.ReactNode>,
  fallback: React.ReactNode
) => {
  const hit = Object.keys(map).find((k) => text.toLowerCase().includes(k.toLowerCase()));
  return hit ? map[hit] : fallback;
};

const APPEARANCE_KEYWORDS = [
  "Purple", "Green", "Orange", "Amber", "Frosty", "Trichomes",
  "Dense", "Chunky", "Wispy", "Long", "Pistils",
];



export function StrainDetail({ strain, onClose, isFavorite, onToggleFavorite }: StrainDetailProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Reset the long-description toggle when the sheet switches strains.
  useEffect(() => {
    setDescriptionExpanded(false);
  }, [strain?.id]);

  if (!strain) return null;

  const badgeClass =
    strain.type === "Indica"
      ? "badge-indica"
      : strain.type === "Sativa"
      ? "badge-sativa"
      : "badge-hybrid";

  // Data can be missing or arrive as import artefacts, so normalise before render.
  const name = textOr(strain.name, "Unnamed strain");
  const description = textOr(strain.description, "");
  const genetics = textOr(strain.genetics, "");
  const terpene = textOr(strain.dominant_terpene, "—");
  const aromas = normalizeStrainList(strain.aromas);
  const tastes = normalizeStrainList(strain.tastes);
  const effects = normalizeStrainList(strain.effects);
  const negativeEffects = normalizeStrainList(strain.negative_effects);
  const medicalUses = normalizeStrainList(strain.medical_uses);
  const parents = splitParents(genetics);
  const canExpandDescription = description.length > 260;

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
            className="relative w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-t-3xl sm:rounded-3xl bg-card border border-border scrollbar-thin"
            data-testid="strain-detail-scroll"
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
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  className="p-2 rounded-full glass hover:bg-muted transition-colors"
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? "fill-primary text-primary" : "text-foreground"}`} />
                </button>
              )}
              <ShareButton
                title={`${name} — Strain Dex`}
                text={description.slice(0, 120)}
                url={typeof window !== "undefined" ? `${window.location.origin}/strain/${toSlug(name)}` : undefined}
              />
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-2 rounded-full glass hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>

            </div>

            {/* Header */}
            <div className="relative h-40 sm:h-48 md:h-64 bg-gradient-to-br from-secondary to-muted flex items-center justify-center overflow-hidden">
              {strain.image_url ? (
                <img src={strain.image_url} alt={name} className="w-full h-full object-cover" />
              ) : (
                <Leaf className="w-20 h-20 md:w-24 md:h-24 text-primary/20" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 sm:bottom-4 sm:left-6 sm:right-6">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h2
                    title={name}
                    className="line-clamp-2 min-w-0 max-w-full break-words font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground"
                  >
                    {name}
                  </h2>
                  <span className={`shrink-0 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${badgeClass}`}>
                    {strain.type}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 break-words text-muted-foreground text-xs sm:text-sm">
                  {genetics || "Lineage unknown"}
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Vitals */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="min-w-0 text-center p-3 sm:p-4 rounded-2xl bg-secondary">
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">THC</p>
                  <p className="text-xl sm:text-2xl font-display font-bold neon-text mt-1 tabular-nums">{formatPercent(strain.thc)}</p>
                </div>
                <div className="min-w-0 text-center p-3 sm:p-4 rounded-2xl bg-secondary">
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">CBD</p>
                  <p className="text-xl sm:text-2xl font-display font-bold text-foreground mt-1 tabular-nums">{formatPercent(strain.cbd)}</p>
                </div>
                <div className="min-w-0 text-center p-3 sm:p-4 rounded-2xl bg-secondary">
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Terpene</p>
                  <div className="flex min-w-0 items-center justify-center gap-1 mt-1">
                    <FlaskConical className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 text-primary" />
                    <p title={terpene} className="min-w-0 truncate text-xs sm:text-sm font-display font-bold text-foreground">
                      {terpene}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="min-w-0">
                <h3 className="font-display font-semibold text-base sm:text-lg text-foreground mb-2">About</h3>
                <p
                  className={cn(
                    "break-words text-muted-foreground text-xs sm:text-sm leading-relaxed",
                    canExpandDescription && !descriptionExpanded && "line-clamp-4",
                  )}
                >
                  {description || "No description yet."}
                </p>
                {canExpandDescription && (
                  <button
                    type="button"
                    onClick={() => setDescriptionExpanded((v) => !v)}
                    aria-expanded={descriptionExpanded}
                    className="mt-2 text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    {descriptionExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>

              {/* Leafly-style trait cards */}
              <div className="space-y-3 sm:space-y-4">
                <StrainTraitSection title="Strain effects" icon={<Sparkles className="w-4 h-4 text-primary" />}>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <StrainTraitGroup
                      label="Positive effects"
                      items={effects}
                      iconFor={(effect) => iconForKeyword(effect, effectIcons, defaultEffectIcon)}
                      tone="positive"
                      emptyLabel="No positive effects listed"
                    />
                    <StrainTraitGroup
                      label="Negative effects"
                      items={negativeEffects}
                      iconFor={(effect) =>
                        iconForKeyword(effect, negativeEffectIcons, defaultNegativeEffectIcon)
                      }
                      tone="negative"
                      emptyLabel="No negative effects listed"
                    />
                  </div>
                </StrainTraitSection>

                <StrainTraitSection title="Strain flavors" icon={<Apple className="w-4 h-4 text-primary" />}>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <StrainTraitGroup
                      label="Aroma"
                      items={aromas}
                      iconFor={(aroma) => iconForKeyword(aroma, aromaIcons, defaultAromaIcon)}
                      emptyLabel="No aromas listed"
                    />
                    <StrainTraitGroup
                      label="Taste"
                      items={tastes}
                      iconFor={(taste) => iconForKeyword(taste, aromaIcons, defaultTasteIcon)}
                      emptyLabel="No tastes listed"
                    />
                  </div>
                </StrainTraitSection>

                <StrainTraitSection title="Strain helps with" icon={<Heart className="w-4 h-4 text-primary" />}>
                  <StrainTraitPills items={medicalUses} emptyLabel="No medical uses listed" />
                </StrainTraitSection>

                <StrainTraitSection title="Appearance" icon={<Eye className="w-4 h-4 text-primary" />}>
                  {(() => {
                    const text =
                      strain.type === "Indica"
                        ? "Dense, chunky buds with deep green hues and often purple undertones."
                        : strain.type === "Sativa"
                        ? "Long, wispy buds in bright, light-green shades with vivid orange pistils."
                        : "Balanced structure with medium-density buds, rich green color, and frosty trichomes.";
                    const matched = APPEARANCE_KEYWORDS.filter((k) =>
                      text.toLowerCase().includes(k.toLowerCase())
                    );
                    return (
                      <div className="min-w-0 space-y-3">
                        <p className="break-words text-sm text-muted-foreground leading-relaxed">{text}</p>
                        <StrainTraitPills
                          items={matched.length ? matched : ["Trait"]}
                          iconFor={(k) => appearanceIcons[k] ?? defaultAppearanceIcon}
                        />
                      </div>
                    );
                  })()}
                </StrainTraitSection>

                <StrainTraitSection title="Genetics" icon={<Dna className="w-4 h-4 text-primary" />}>
                  {parents.length > 0 ? (
                    <ul className="space-y-1.5">
                      {parents.map((parent) => (
                        <li
                          key={parent}
                          className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground"
                        >
                          <span className="shrink-0">
                            {iconForKeyword(parent, geneticsIcons, defaultGeneticsIcon)}
                          </span>
                          <span className="min-w-0 break-words">{parent}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {defaultGeneticsIcon}
                      <span>Lineage unknown</span>
                    </div>
                  )}
                </StrainTraitSection>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
