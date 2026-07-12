import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Trash2, RotateCcw, Sparkles, Pencil, Layers } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { DbStrain } from "@/hooks/useStrains";
import { StrainEditorDialog } from "@/components/StrainEditorDialog";
import { BulkEditDialog } from "@/components/BulkEditDialog";

export function StrainManager() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState<DbStrain | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  const { data: strains = [], isLoading } = useQuery({
    queryKey: ["admin-strains", showDeleted],
    queryFn: async () => {
      let query = supabase.from("strains").select("*").order("name");
      if (!showDeleted) query = query.is("deleted_at", null);
      const { data, error } = await query;
      if (error) throw error;
      return data as DbStrain[];
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return strains;
    return strains.filter((s) => s.name.toLowerCase().includes(needle));
  }, [strains, q]);

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("strains")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-strains"] });
      qc.invalidateQueries({ queryKey: ["strains"] });
      toast({ title: "Strain hidden" });
    },
    onError: (e: any) =>
      toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("strains")
        .update({ deleted_at: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-strains"] });
      qc.invalidateQueries({ queryKey: ["strains"] });
      toast({ title: "Strain restored" });
    },
  });

  const regenImage = useMutation({
    mutationFn: async (strain: DbStrain) => {
      const { data, error } = await supabase.functions.invoke("generate-strain-image", {
        body: { strainId: strain.id, name: strain.name, type: strain.type },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-strains"] });
      qc.invalidateQueries({ queryKey: ["strains"] });
      toast({ title: "Image regenerated" });
    },
    onError: (e: any) =>
      toast({ title: "Image generation failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
          />
          Show hidden
        </label>
        <button
          onClick={() => {
            if (selected.size === filtered.length) clearSelection();
            else setSelected(new Set(filtered.map((s) => s.id)));
          }}
          className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground hover:opacity-90"
        >
          {selected.size === filtered.length && filtered.length > 0 ? "Clear all" : "Select all"}
        </button>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
          <p className="text-sm">
            <span className="font-medium">{selected.size}</span> selected
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={clearSelection}
              className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:opacity-90"
            >
              Clear
            </button>
            <button
              onClick={() => setBulkOpen(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
            >
              <Layers className="w-3.5 h-3.5" />
              Bulk edit
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border max-h-[500px] overflow-auto">
          {filtered.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground text-center">No strains found.</p>
          )}
          {filtered.map((s) => {
            const deleted = !!s.deleted_at;
            return (
              <div key={s.id} className="flex items-center gap-3 p-3">
                <img
                  src={s.image_url || "/placeholder.svg"}
                  alt={s.name}
                  className="w-12 h-12 rounded-lg object-cover bg-muted"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm truncate ${deleted ? "line-through text-muted-foreground" : ""}`}>
                    {s.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.type} · THC {s.thc}% · CBD {s.cbd}%
                  </p>
                </div>
                <button
                  onClick={() => setEditing(s)}
                  title="Edit"
                  className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => regenImage.mutate(s)}
                  disabled={regenImage.isPending}
                  title="Regenerate image"
                  className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-40"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                {deleted ? (
                  <button
                    onClick={() => restore.mutate(s.id)}
                    title="Restore"
                    className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (confirm(`Hide "${s.name}"? It can be restored later.`))
                        softDelete.mutate(s.id);
                    }}
                    title="Hide"
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <StrainEditorDialog
        strain={editing}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
      />
    </div>
  );
}
