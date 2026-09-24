import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callFunction, DATABASE_ID, FUNCTIONS, TABLES, tables } from "@/integrations/appwrite/client";
import { fetchStrains } from "@/hooks/useStrains";
import { Loader2, Search, Trash2, RotateCcw, Sparkles, Pencil, Layers, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { DbStrain } from "@/hooks/useStrains";
import { StrainEditorDialog } from "@/components/StrainEditorDialog";
import { BulkEditDialog } from "@/components/BulkEditDialog";
import { toCSV } from "@/lib/csv";

const EXPORT_HEADERS = ["product_name", "brand", "product_type", "THC%", "CBD%", "description"] as const;

function exportStrainsCsv(rows: DbStrain[]) {
  const data: (string | number)[][] = [
    [...EXPORT_HEADERS],
    ...rows.map((s) => [
      s.name ?? "",
      s.genetics ?? "",
      s.type ?? "",
      s.thc ?? 0,
      s.cbd ?? 0,
      (s.description ?? "").replace(/\s+/g, " ").trim(),
    ]),
  ];
  const csv = toCSV(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.href = url;
  a.download = `strains-export-${rows.length}-${ts}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
      return fetchStrains({ includeDeleted: showDeleted });
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return strains;
    return strains.filter((s) => s.name.toLowerCase().includes(needle));
  }, [strains, q]);

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      await tables.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.strains,
        rowId: id,
        data: { deleted_at: new Date().toISOString() },
      });
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
      await tables.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.strains,
        rowId: id,
        data: { deleted_at: null },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-strains"] });
      qc.invalidateQueries({ queryKey: ["strains"] });
      toast({ title: "Strain restored" });
    },
  });

  const regenImage = useMutation({
    mutationFn: async (strain: DbStrain) => {
      return callFunction(FUNCTIONS.generateStrainImage, {
        strainId: strain.id,
        name: strain.name,
        type: strain.type,
      });
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
        <button
          onClick={() => {
            if (!filtered.length) {
              toast({ title: "Nothing to export", variant: "destructive" });
              return;
            }
            exportStrainsCsv(filtered);
            toast({ title: `Exported ${filtered.length} strain(s)` });
          }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:opacity-90"
          title="Export all currently filtered strains as CSV"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
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
              onClick={() => {
                const rows = filtered.filter((s) => selected.has(s.id));
                exportStrainsCsv(rows);
                toast({ title: `Exported ${rows.length} selected strain(s)` });
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:opacity-90"
            >
              <Download className="w-3.5 h-3.5" />
              Export selected
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
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggleOne(s.id)}
                  className="w-4 h-4"
                  aria-label={`Select ${s.name}`}
                />
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

      <BulkEditDialog
        ids={Array.from(selected)}
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onDone={clearSelection}
      />
    </div>
  );
}
