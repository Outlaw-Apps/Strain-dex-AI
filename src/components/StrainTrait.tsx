import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TraitTone = "positive" | "negative" | "neutral";

const toneClasses: Record<TraitTone, string> = {
  positive: "text-primary",
  negative: "text-rose-400",
  neutral: "text-gold-light",
};

interface StrainTraitTileProps {
  icon: ReactNode;
  label: string;
  tone?: TraitTone;
}

/**
 * A single Leafly-style trait tile. Grid items default to `min-width: auto`, so
 * `min-w-0` plus a clamped label stop long values (or unbroken import junk) from
 * spilling over the neighbouring cards.
 */
export function StrainTraitTile({ icon, label, tone = "neutral" }: StrainTraitTileProps) {
  return (
    <li
      title={label}
      data-testid="strain-trait-tile"
      className="flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-gold/20 bg-background/40 px-2 py-3 text-center transition-colors hover:border-gold/60"
    >
      <span className={cn("flex items-center justify-center", toneClasses[tone])} aria-hidden="true">
        {icon}
      </span>
      <span className="line-clamp-2 w-full break-words text-[11px] leading-tight text-foreground/80">
        {label}
      </span>
    </li>
  );
}

interface StrainTraitGroupProps {
  label?: string;
  items: readonly string[];
  iconFor: (item: string) => ReactNode;
  tone?: TraitTone;
  emptyLabel?: string;
  className?: string;
}

/** A labelled grid of trait tiles, with an explicit empty state. */
export function StrainTraitGroup({
  label,
  items,
  iconFor,
  tone = "neutral",
  emptyLabel = "Not listed",
  className,
}: StrainTraitGroupProps) {
  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      {label && (
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
      )}
      {items.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((item) => (
            <StrainTraitTile key={item} icon={iconFor(item)} label={item} tone={tone} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground/70">{emptyLabel}</p>
      )}
    </div>
  );
}

interface StrainTraitPillsProps {
  items: readonly string[];
  iconFor?: (item: string) => ReactNode;
  emptyLabel?: string;
}

/** Compact tag list, used for medical uses and appearance traits. */
export function StrainTraitPills({ items, iconFor, emptyLabel = "Not listed" }: StrainTraitPillsProps) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground/70">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          title={item}
          className="inline-flex min-w-0 max-w-full items-center gap-1 break-words rounded-full border border-gold/20 bg-background/40 px-2.5 py-1 text-[11px] leading-tight text-foreground/80"
        >
          {iconFor && (
            <span className="shrink-0 text-primary/70" aria-hidden="true">
              {iconFor(item)}
            </span>
          )}
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

interface StrainTraitSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Card wrapper for a trait section, matching the panel styling used elsewhere. */
export function StrainTraitSection({ title, icon, children, className }: StrainTraitSectionProps) {
  return (
    <section
      aria-label={title}
      className={cn("min-w-0 overflow-hidden rounded-2xl bg-secondary p-4 space-y-3", className)}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
        <h4 className="min-w-0 break-words font-display font-semibold text-sm text-foreground uppercase tracking-wide">
          {title}
        </h4>
      </div>
      {children}
    </section>
  );
}
