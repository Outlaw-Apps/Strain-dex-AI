import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { KeyRound, Plus, Trash2, RotateCcw, ArrowLeft, Loader2, Copy } from "lucide-react";

type LicenseKey = {
  id: string;
  key: string;
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
  revoked: boolean;
  note: string | null;
  created_at: string;
};

function randomKey() {
  const seg = () =>
    Array.from({ length: 4 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
    ).join("");
  return `${seg()}-${seg()}-${seg()}`;
}

export default function LicenseAdmin() {
  const [rows, setRows] = useState<LicenseKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [key, setKey] = useState(randomKey());
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState<string>("");
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("license_keys")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load keys", description: error.message, variant: "destructive" });
    } else {
      setRows((data ?? []) as LicenseKey[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const payload = {
      key: key.trim().toUpperCase(),
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      max_uses: maxUses ? Number(maxUses) : null,
      note: note.trim() || null,
    };
    const { error } = await supabase.from("license_keys").insert(payload);
    setCreating(false);
    if (error) {
      toast({ title: "Couldn't create key", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "License key created", description: payload.key });
    setKey(randomKey());
    setExpiresAt("");
    setMaxUses("");
    setNote("");
    load();
  };

  const toggleRevoke = async (row: LicenseKey) => {
    const { error } = await supabase
      .from("license_keys")
      .update({ revoked: !row.revoked })
      .eq("id", row.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const remove = async (row: LicenseKey) => {
    if (!confirm(`Delete ${row.key}? This cannot be undone.`)) return;
    const { error } = await supabase.from("license_keys").delete().eq("id", row.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast({ title: "Copied", description: v });
  };

  const stats = useMemo(() => {
    const active = rows.filter(
      (r) => !r.revoked && (!r.expires_at || new Date(r.expires_at) > new Date())
    ).length;
    return { total: rows.length, active };
  }, [rows]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display text-3xl chrome-gold uppercase flex items-center gap-2">
                <KeyRound className="w-7 h-7 text-primary" />
                License Keys
              </h1>
              <p className="text-sm text-muted-foreground">
                {stats.active} active · {stats.total} total
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={create}
          className="grid gap-3 md:grid-cols-5 p-5 rounded-2xl bg-card border border-border mb-8"
        >
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Key</label>
            <div className="flex gap-2 mt-1">
              <input
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 rounded-lg bg-secondary font-mono text-sm border border-border"
                required
              />
              <button
                type="button"
                onClick={() => setKey(randomKey())}
                className="px-3 rounded-lg bg-muted text-muted-foreground hover:text-foreground"
                title="Regenerate"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Expires
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary text-sm border border-border"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Max uses
            </label>
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="∞"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary text-sm border border-border"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Note</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary text-sm border border-border"
            />
          </div>
          <div className="md:col-span-5 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider disabled:opacity-60"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create key
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Key</th>
                <th className="text-left px-4 py-3">Expires</th>
                <th className="text-left px-4 py-3">Uses</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Note</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No license keys yet. Create one above.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const expired = r.expires_at && new Date(r.expires_at) < new Date();
                const exhausted = r.max_uses != null && r.uses >= r.max_uses;
                const status = r.revoked
                  ? { label: "Revoked", cls: "text-destructive" }
                  : expired
                  ? { label: "Expired", cls: "text-destructive" }
                  : exhausted
                  ? { label: "Exhausted", cls: "text-destructive" }
                  : { label: "Active", cls: "text-primary" };
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono">
                      <button
                        onClick={() => copy(r.key)}
                        className="inline-flex items-center gap-2 hover:text-primary"
                      >
                        {r.key}
                        <Copy className="w-3 h-3 opacity-60" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.uses}
                      {r.max_uses != null ? ` / ${r.max_uses}` : ""}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${status.cls}`}>{status.label}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.note ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => toggleRevoke(r)}
                          className="px-3 py-1.5 rounded-lg bg-muted text-xs hover:bg-muted/70"
                        >
                          {r.revoked ? "Restore" : "Revoke"}
                        </button>
                        <button
                          onClick={() => remove(r)}
                          className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
