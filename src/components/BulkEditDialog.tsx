import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
  ids: string[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone?: () => void;
}

type ListMode = "replace" | "append";

type FormState = {
  setType: boolean;
  type: StrainType;
  setTerpene: boolean;
  dominant_terpene: string;
  setThc: boolean;
  thc: string;
  setCbd: boolean;
  cbd: string;
  setEffects: boolean;
  effectsMode: ListMode;
  effects: string;
  setAromas: boolean;
  aromasMode: ListMode;
  aromas: string;
  setTastes: boolean;
  tastesMode: ListMode;
  tastes: string;
  setMedical: boolean;
  medicalMode: ListMode;
  medical_uses: string;
};

const initial: FormState = {
  setType: false, type: "Hybrid",
  setTerpene: false, dominant_terpene: "",
  setThc: false, thc: "",
  setCbd: false, cbd: "",
  setEffects: false, effectsMode: "append", effects: "",
  setAromas: false, aromasMode: "append", aromas: "",
  setTastes: false, tastesMode: "append", tastes: "",
  setMedical: false, medicalMode: "append", medical_uses: "",
};

const toArr = (s: string) =>
  s.split(/[,|;\n]/).map((v) => v.trim()).filter(Boolean);

const mergeUnique = (a: string[], b: string[]) =>
  Array.from(new Set([...(a ?? []), ...b]));

export function BulkEditDialog({ ids, open, onOpenChange, onDone }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(initial);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const apply = useMutation({
    mutationFn: async () => {
      const scalar: Record<string, unknown> = {};
      if (form.setType) scalar.type = form.type;
      if (form.setTerpene) scalar.dominant_terpene = form.dominant_terpene.trim();
      if (form.setThc) {
        const n = Number(form.thc);
        if (Number.isNaN(n) || n < 0 || n > 100) throw new Error("THC must be 0–100");
        scalar.thc = n;
      }
      if (form.setCbd) {
        const n = Number(form.cbd);
        if (Number.isNaN(n) || n < 0 || n > 100) throw new Error("CBD must be 0–100");
        scalar.cbd = n;
      }

      const listOps: Array<{ field: "effects" | "aromas" | "tastes" | "medical_uses"; mode: ListMode; values: string[] }> = [];
      if (form.setEffects) listOps.push({ field: "effects", mode: form.effectsMode, values: toArr(form.effects) });
      if (form.setAromas) listOps.push({ field: "aromas", mode: form.aromasMode, values: toArr(form.aromas) });
      if (form.setTastes) listOps.push({ field: "tastes", mode: form.tastesMode, values: toArr(form.tastes) });
      if (form.setMedical) listOps.push({ field: "medical_uses", mode: form.medicalMode, values: toArr(form.medical_uses) });

      if (Object.keys(scalar).length === 0 && listOps.length === 0) {
        throw new Error("Enable at least one field to update");
      }

      // Fast path: scalar-only + replace-only lists → single bulk update
      const allReplace = listOps.every((o) => o.mode === "replace");
      if (allReplace) {
        const payload: Record<string, unknown> = { ...scalar };
        for (const o of listOps) payload[o.field] = o.values;
        setProgress({ done: 0, total: 1 });
        const { error } = await supabase.from("strains").update(payload).in("id", ids);
        if (error) throw error;
        setProgress({ done: 1, total: 1 });
        return;
      }

      // Append mode requires per-row merge
      const needsFetch = listOps.some((o) => o.mode === "append");
      let rows: Array<Record<string, any>> = [];
      if (needsFetch) {
        const { data, error } = await supabase
          .from("strains")
          .select("id, effects, aromas, tastes, medical_uses")
          .in("id", ids);
        if (error) throw error;
        rows = data ?? [];
      }

      setProgress({ done: 0, total: ids.length });
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const payload: Record<string, unknown> = { ...scalar };
        for (const o of listOps) {
          if (o.mode === "replace") payload[o.field] = o.values;
          else {
            const row = rows.find((r) => r.id === id);
            payload[o.field] = mergeUnique((row?.[o.field] as string[]) ?? [], o.values);
          }
        }
        const { error } = await supabase.from("strains").update(payload).eq("id", id);
        if (error) throw error;
        setProgress({ done: i + 1, total: ids.length });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-strains"] });
      qc.invalidateQueries({ queryKey: ["strains"] });
      toast({ title: `Updated ${ids.length} strain${ids.length === 1 ? "" : "s"}` });
      setForm(initial);
      setProgress(null);
      onDone?.();
      onOpenChange(false);
    },
    onError: (e: any) => {
      setProgress(null);
      toast({ title: "Bulk update failed", description: e.message, variant: "destructive" });
    },
  });

  const field = "w-full rounded-lg bg-secondary text-secondary-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";
  const label = "text-xs font-medium text-muted-foreground";

  const Row = ({
    enabled, onToggle, title, children,
  }: { enabled: boolean; onToggle: (v: boolean) => void; title: string; children: React.ReactNode }) => (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        {title}
      </label>
      {enabled && <div className="space-y-2">{children}</div>}
    </div>
  );

  const ModeToggle = ({ value, onChange }: { value: ListMode; onChange: (v: ListMode) => void }) => (
    <div className="flex gap-2 text-xs">
      {(["append", "replace"] as ListMode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`px-2 py-1 rounded-md ${value === m ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
        >
          {m === "append" ? "Add to existing" : "Replace"}
        </button>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !apply.isPending && onOpenChange(v)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk edit {ids.length} strain{ids.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>
            Toggle the fields you want to change. Only enabled fields are written. List fields can add to or replace existing values.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Row enabled={form.setType} onToggle={(v) => setForm({ ...form, setType: v })} title="Type">
            <select className={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as StrainType })}>
              <option value="Sativa">Sativa</option>
              <option value="Indica">Indica</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </Row>

          <Row enabled={form.setTerpene} onToggle={(v) => setForm({ ...form, setTerpene: v })} title="Dominant terpene">
            <input className={field} value={form.dominant_terpene} onChange={(e) => setForm({ ...form, dominant_terpene: e.target.value })} />
          </Row>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Row enabled={form.setThc} onToggle={(v) => setForm({ ...form, setThc: v })} title="THC %">
              <input type="number" step="0.1" min="0" max="100" className={field} value={form.thc} onChange={(e) => setForm({ ...form, thc: e.target.value })} />
            </Row>
            <Row enabled={form.setCbd} onToggle={(v) => setForm({ ...form, setCbd: v })} title="CBD %">
              <input type="number" step="0.1" min="0" max="100" className={field} value={form.cbd} onChange={(e) => setForm({ ...form, cbd: e.target.value })} />
            </Row>
          </div>

          <Row enabled={form.setEffects} onToggle={(v) => setForm({ ...form, setEffects: v })} title="Effects">
            <ModeToggle value={form.effectsMode} onChange={(m) => setForm({ ...form, effectsMode: m })} />
            <label className={label}>Comma separated</label>
            <textarea rows={2} className={field} value={form.effects} onChange={(e) => setForm({ ...form, effects: e.target.value })} />
          </Row>

          <Row enabled={form.setAromas} onToggle={(v) => setForm({ ...form, setAromas: v })} title="Aromas">
            <ModeToggle value={form.aromasMode} onChange={(m) => setForm({ ...form, aromasMode: m })} />
            <textarea rows={2} className={field} value={form.aromas} onChange={(e) => setForm({ ...form, aromas: e.target.value })} />
          </Row>

          <Row enabled={form.setTastes} onToggle={(v) => setForm({ ...form, setTastes: v })} title="Tastes">
            <ModeToggle value={form.tastesMode} onChange={(m) => setForm({ ...form, tastesMode: m })} />
            <textarea rows={2} className={field} value={form.tastes} onChange={(e) => setForm({ ...form, tastes: e.target.value })} />
          </Row>

          <Row enabled={form.setMedical} onToggle={(v) => setForm({ ...form, setMedical: v })} title="Medical uses">
            <ModeToggle value={form.medicalMode} onChange={(m) => setForm({ ...form, medicalMode: m })} />
            <textarea rows={2} className={field} value={form.medical_uses} onChange={(e) => setForm({ ...form, medical_uses: e.target.value })} />
          </Row>
        </div>

        {progress && (
          <p className="text-xs text-muted-foreground">Updating {progress.done} / {progress.total}…</p>
        )}

        <DialogFooter className="gap-2">
          <button
            onClick={() => onOpenChange(false)}
            disabled={apply.isPending}
            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => apply.mutate()}
            disabled={apply.isPending || ids.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {apply.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Apply to {ids.length}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
