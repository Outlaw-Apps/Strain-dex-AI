import { X } from "lucide-react";

const allEffects = [
  "Happy", "Relaxed", "Euphoric", "Creative", "Uplifted",
  "Energetic", "Focused", "Sleepy", "Hungry",
];

interface EffectFilterProps {
  selected: string[];
  onChange: (effects: string[]) => void;
}

export function EffectFilter({ selected, onChange }: EffectFilterProps) {
  const toggle = (effect: string) => {
    onChange(
      selected.includes(effect)
        ? selected.filter((e) => e !== effect)
        : [...selected, effect]
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Effects</p>
      <div className="flex flex-wrap gap-1.5">
        {allEffects.map((effect) => {
          const active = selected.includes(effect);
          return (
            <button
              key={effect}
              onClick={() => toggle(effect)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                active
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
              }`}
            >
              {effect}
              {active && <X className="w-3 h-3 inline ml-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
