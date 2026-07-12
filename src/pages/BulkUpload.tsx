import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Upload, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/hooks/useAuth";
import { parseCSV, toCSV } from "@/lib/csv";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const COLUMNS = [
  "name",
  "type",
  "thc",
  "cbd",
  "description",
  "genetics",
  "dominant_terpene",
  "effects",
  "negative_effects",
  "medical_uses",
  "aromas",
  "tastes",
  "image_url",
] as const;

type Col = (typeof COLUMNS)[number];
const ARRAY_COLS: Col[] = ["effects", "negative_effects", "medical_uses", "aromas", "tastes"];
const NUMBER_COLS: Col[] = ["thc", "cbd"];

const TEMPLATE_ROWS: (string | number)[][] = [
  [...COLUMNS],
  [
    "Blue Dream",
    "Hybrid",
    18,
    0.1,
    "A balanced hybrid with sweet berry aroma.",
    "Blueberry x Haze",
    "Myrcene",
    "Relaxed|Happy|Euphoric",
    "Dry mouth|Dry eyes",
    "Stress|Depression|Pain",
    "Berry|Sweet|Herbal",
    "Blueberry|Vanilla",
    "",
  ],
];

export default function BulkUpload() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const qc = useQueryClient();
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Record<string, any>[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<{ inserted: number; failed: number } | null>(null);

  // AI import
  const [aiNames, setAiNames] = useState("");
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResults, setAiResults] = useState<
    { name: string; status: "inserted" | "failed"; error?: string }[] | null
  >(null);

  const handleAiImport = async () => {
    const names = aiNames
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.length) {
      toast({ title: "Enter at least one strain name", variant: "destructive" });
      return;
    }
    setAiRunning(true);
    setAiResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-strain-import", {
        body: { names },
      });
      if (error) throw error;
      const results = (data?.results ?? []) as {
        name: string;
        status: "inserted" | "failed";
        error?: string;
      }[];
      setAiResults(results);
      const inserted = results.filter((r) => r.status === "inserted").length;
      const failed = results.length - inserted;
      qc.invalidateQueries({ queryKey: ["strains"] });
      toast({
        title: failed ? "AI import finished with errors" : "AI import complete",
        description: `${inserted} inserted, ${failed} failed.`,
      });
    } catch (e: any) {
      toast({
        title: "AI import failed",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setAiRunning(false);
    }
  };

  const downloadTemplate = () => {
    const csv = toCSV(TEMPLATE_ROWS);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "strains-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    setErrors([]);
    setPreview(null);
    setResult(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error("CSV must include a header row and at least one data row.");
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const required: Col[] = ["name", "type"];
      const missing = required.filter((r) => !header.includes(r));
      if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}`);

      const errs: string[] = [];
      const parsed: Record<string, any>[] = [];
      for (let r = 1; r < rows.length; r++) {
        const obj: Record<string, any> = {};
        const row = rows[r];
        for (let c = 0; c < header.length; c++) {
          const key = header[c] as Col;
          if (!COLUMNS.includes(key)) continue;
          const raw = (row[c] ?? "").trim();
          if (raw === "") continue;
          if (ARRAY_COLS.includes(key)) {
            obj[key] = raw.split(/[|;]/).map((s) => s.trim()).filter(Boolean);
          } else if (NUMBER_COLS.includes(key)) {
            const n = Number(raw);
            if (Number.isNaN(n)) {
              errs.push(`Row ${r + 1}: "${key}" must be a number (got "${raw}")`);
              continue;
            }
            obj[key] = n;
          } else {
            obj[key] = raw;
          }
        }
        if (!obj.name) {
          errs.push(`Row ${r + 1}: missing name`);
          continue;
        }
        if (!obj.type || !["Sativa", "Indica", "Hybrid"].includes(obj.type)) {
          errs.push(`Row ${r + 1}: type must be Sativa, Indica, or Hybrid (got "${obj.type ?? ""}")`);
          continue;
        }
        parsed.push(obj);
      }
      setErrors(errs);
      setPreview(parsed);
    } catch (e: any) {
      setErrors([e.message ?? String(e)]);
    } finally {
      setParsing(false);
    }
  };

  const handleUpload = async () => {
    if (!preview?.length) return;
    setUploading(true);
    let inserted = 0;
    let failed = 0;
    const batchSize = 100;
    for (let i = 0; i < preview.length; i += batchSize) {
      const batch = preview.slice(i, i + batchSize);
      const { error, count } = await supabase
        .from("strains")
        .insert(batch as any, { count: "exact" });
      if (error) {
        failed += batch.length;
        setErrors((prev) => [...prev, `Batch ${i / batchSize + 1}: ${error.message}`]);
      } else {
        inserted += count ?? batch.length;
      }
    }
    setUploading(false);
    setResult({ inserted, failed });
    qc.invalidateQueries({ queryKey: ["strains"] });
    toast({
      title: failed ? "Upload completed with errors" : "Upload successful",
      description: `${inserted} inserted, ${failed} failed.`,
    });
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <h1 className="text-2xl font-bold">Admins only</h1>
        <p className="text-muted-foreground">You need the admin role to bulk upload strains.</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Bulk upload strains</h1>
          <p className="text-muted-foreground">
            Download the template, fill it in, and upload. Use <code>|</code> to separate list values
            (e.g. <code>Relaxed|Happy|Euphoric</code>).
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90"
            >
              <Download className="w-4 h-4" /> Download CSV template
            </button>
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:opacity-90">
              <Upload className="w-4 h-4" /> Choose CSV file
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            {parsing && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Columns</p>
            <p>
              Required: <code>name</code>, <code>type</code> (Sativa | Indica | Hybrid).
            </p>
            <p>
              Optional: <code>thc</code>, <code>cbd</code>, <code>description</code>,{" "}
              <code>genetics</code>, <code>dominant_terpene</code>, <code>effects</code>,{" "}
              <code>negative_effects</code>, <code>medical_uses</code>, <code>aromas</code>,{" "}
              <code>tastes</code>, <code>image_url</code>.
            </p>
          </div>
        </section>

        {errors.length > 0 && (
          <section className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 space-y-1">
            <div className="flex items-center gap-2 text-destructive font-medium text-sm">
              <AlertCircle className="w-4 h-4" /> {errors.length} issue(s)
            </div>
            <ul className="text-xs text-destructive/90 list-disc pl-5 max-h-40 overflow-auto">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </section>
        )}

        {preview && (
          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-semibold">Preview</h2>
                <p className="text-sm text-muted-foreground">
                  {preview.length} valid row(s) ready to import.
                </p>
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading || preview.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Import {preview.length} strain(s)
              </button>
            </div>

            <div className="overflow-auto max-h-80 rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">Name</th>
                    <th className="px-2 py-1 text-left">Type</th>
                    <th className="px-2 py-1 text-left">THC</th>
                    <th className="px-2 py-1 text-left">CBD</th>
                    <th className="px-2 py-1 text-left">Effects</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1">{row.name}</td>
                      <td className="px-2 py-1">{row.type}</td>
                      <td className="px-2 py-1">{row.thc ?? "—"}</td>
                      <td className="px-2 py-1">{row.cbd ?? "—"}</td>
                      <td className="px-2 py-1">{(row.effects ?? []).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.length > 50 && (
              <p className="text-xs text-muted-foreground">
                Showing first 50 of {preview.length} rows.
              </p>
            )}
          </section>
        )}

        {result && (
          <section className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <div className="text-sm">
              <p className="font-medium">Done</p>
              <p className="text-muted-foreground">
                {result.inserted} inserted{result.failed ? `, ${result.failed} failed` : ""}.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
