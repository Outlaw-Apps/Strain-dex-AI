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
    <div className="space-y-3">
      <p className="text-[10px] text-gold font-black uppercase tracking-[0.3em]">Target Effects</p>
      <div className="flex flex-wrap gap-2">
        {allEffects.map((effect) => {
          const active = selected.includes(effect);
          return (
            <button
              key={effect}
              onClick={() => toggle(effect)}
              className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border transition-all ${
                active
                  ? "border-primary text-primary bg-primary/5 shadow-[inset_0_0_10px_hsl(152_100%_50%/0.2)]"
                  : "border-gold/20 text-muted-foreground hover:border-primary/50 hover:text-primary"
              }`}
            >
              {effect}
              {active && <X className="w-3 h-3 inline ml-1.5 -mt-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
