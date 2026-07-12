import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { DbStrain } from "@/hooks/useStrains";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type StrainType = "Sativa" | "Indica" | "Hybrid";

interface Props {
  strain: DbStrain | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type FormState = {
  name: string;
  type: StrainType;
  thc: string;
  cbd: string;
  dominant_terpene: string;
  genetics: string;
  description: string;
  image_url: string;
  effects: string;
  negative_effects: string;
  medical_uses: string;
  aromas: string;
  tastes: string;
};

const toStr = (arr: string[] | null | undefined) => (arr ?? []).join(", ");
const toArr = (s: string) =>
  s
    .split(/[,|;\n]/)
    .map((v) => v.trim())
    .filter(Boolean);

function toForm(s: DbStrain): FormState {
  return {
    name: s.name,
    type: s.type as StrainType,
    thc: String(s.thc ?? 0),
    cbd: String(s.cbd ?? 0),
    dominant_terpene: s.dominant_terpene ?? "",
    genetics: s.genetics ?? "",
    description: s.description ?? "",
    image_url: s.image_url ?? "",
    effects: toStr(s.effects),
    negative_effects: toStr(s.negative_effects),
    medical_uses: toStr(s.medical_uses),
    aromas: toStr(s.aromas),
    tastes: toStr(s.tastes),
  };
}

export function StrainEditorDialog({ strain, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (strain) setForm(toForm(strain));
  }, [strain]);

  const save = useMutation({
    mutationFn: async () => {
      if (!strain || !form) throw new Error("No strain");
      const thc = Number(form.thc);
      const cbd = Number(form.cbd);
      if (!form.name.trim()) throw new Error("Name is required");
      if (Number.isNaN(thc) || thc < 0 || thc > 100) throw new Error("THC must be 0–100");
      if (Number.isNaN(cbd) || cbd < 0 || cbd > 100) throw new Error("CBD must be 0–100");

      const { error } = await supabase
        .from("strains")
        .update({
          name: form.name.trim(),
          type: form.type,
          thc,
          cbd,
          dominant_terpene: form.dominant_terpene.trim(),
          genetics: form.genetics.trim(),
          description: form.description.trim(),
          image_url: form.image_url.trim(),
          effects: toArr(form.effects),
          negative_effects: toArr(form.negative_effects),
          medical_uses: toArr(form.medical_uses),
          aromas: toArr(form.aromas),
          tastes: toArr(form.tastes),
        })
        .eq("id", strain.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-strains"] });
      qc.invalidateQueries({ queryKey: ["strains"] });
      toast({ title: "Strain updated" });
      onOpenChange(false);
    },
    onError: (e: any) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  if (!form || !strain) return null;

  const field = "w-full rounded-lg bg-secondary text-secondary-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";
  const label = "text-xs font-medium text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit strain</DialogTitle>
          <DialogDescription>
            Update vitals, terpene, description, and category fields. Separate list items with commas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className={label}>Name</label>
            <input
              className={field}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className={label}>Type</label>
            <select
              className={field}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as StrainType })}
            >
              <option value="Sativa">Sativa</option>
              <option value="Indica">Indica</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className={label}>Dominant terpene</label>
            <input
              className={field}
              value={form.dominant_terpene}
              onChange={(e) => setForm({ ...form, dominant_terpene: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className={label}>THC %</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              className={field}
              value={form.thc}
              onChange={(e) => setForm({ ...form, thc: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className={label}>CBD %</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              className={field}
              value={form.cbd}
              onChange={(e) => setForm({ ...form, cbd: e.target.value })}
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className={label}>Genetics</label>
            <input
              className={field}
              value={form.genetics}
              onChange={(e) => setForm({ ...form, genetics: e.target.value })}
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className={label}>Image URL</label>
            <input
              className={field}
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className={label}>Description</label>
            <textarea
              rows={3}
              className={field}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className={label}>Effects (comma separated)</label>
            <textarea
              rows={2}
              className={field}
              value={form.effects}
              onChange={(e) => setForm({ ...form, effects: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className={label}>Negative effects</label>
            <textarea
              rows={2}
              className={field}
              value={form.negative_effects}
              onChange={(e) => setForm({ ...form, negative_effects: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className={label}>Medical uses</label>
            <textarea
              rows={2}
              className={field}
              value={form.medical_uses}
              onChange={(e) => setForm({ ...form, medical_uses: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className={label}>Aromas</label>
            <textarea
              rows={2}
              className={field}
              value={form.aromas}
              onChange={(e) => setForm({ ...form, aromas: e.target.value })}
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className={label}>Tastes</label>
            <textarea
              rows={2}
              className={field}
              value={form.tastes}
              onChange={(e) => setForm({ ...form, tastes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90"
          >
            Cancel
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save changes
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
