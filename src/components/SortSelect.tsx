import { ArrowUpDown } from "lucide-react";
import type { SortOption } from "@/hooks/useStrains";

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const options: { label: string; value: SortOption }[] = [
  { label: "Name A→Z", value: "name" },
  { label: "THC High→Low", value: "thc-desc" },
  { label: "THC Low→High", value: "thc-asc" },
  { label: "CBD High→Low", value: "cbd-desc" },
];

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="w-3.5 h-3.5 text-gold" />
      <span className="text-[10px] font-black uppercase tracking-widest text-gold">Sort:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="bg-transparent border-b border-gold/40 focus:border-gold px-2 py-1 text-[10px] font-black uppercase tracking-widest text-foreground outline-none transition-colors cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-background text-foreground">{o.label}</option>
        ))}
      </select>
    </div>
  );
}
