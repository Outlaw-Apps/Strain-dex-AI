import { ArrowUpDown } from "lucide-react";
import type { SortOption } from "@/hooks/useStrains";

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const options: { label: string; value: SortOption }[] = [
  { label: "Name A-Z", value: "name" },
  { label: "THC High→Low", value: "thc-desc" },
  { label: "THC Low→High", value: "thc-asc" },
  { label: "CBD High→Low", value: "cbd-desc" },
];

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground font-body outline-none focus:border-primary transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
