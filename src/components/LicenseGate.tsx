import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "straindex.license-key";

type ValidateResponse =
  | { ok: true; key: string; expiresAt: string | null; maxUses: number | null; uses: number }
  | { ok: false; reason: string };

async function validateOnServer(
  key: string,
  countUsage: boolean
): Promise<ValidateResponse> {
  const { data, error } = await supabase.functions.invoke("license-validate", {
    body: { key, countUsage },
  });
  if (error) {
    return { ok: false, reason: "Couldn't reach license server. Try again." };
  }
  return data as ValidateResponse;
}

export function LicenseGate({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) ?? "";
        if (saved) {
          const res = await validateOnServer(saved, false);
          if (res.ok) {
            setUnlocked(true);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        /* ignore */
      }
      setChecked(true);
    })();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await validateOnServer(value, true);
    if (res.ok) {
      try {
        localStorage.setItem(STORAGE_KEY, value.trim().toUpperCase());
      } catch {
        /* ignore */
      }
      setUnlocked(true);
    } else {
      setError(res.reason);
    }
    setSubmitting(false);
  };

  if (!checked) return null;
  if (unlocked) return <>{children}</>;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background"
        role="dialog"
        aria-modal="true"
        aria-labelledby="license-gate-title"
      >
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-primary/10 blur-[120px] pointer-events-none" />
        <form
          onSubmit={submit}
          className="relative max-w-md w-full text-center p-8 rounded-3xl bg-card border border-gold/20"
        >
          <KeyRound className="w-12 h-12 mx-auto mb-4 text-primary drop-shadow-[0_0_10px_hsl(152_100%_50%/0.6)]" />
          <h2
            id="license-gate-title"
            className="chrome-gold font-display text-3xl uppercase mb-2"
          >
            License Required
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Enter your license key to access Strain Dex.
          </p>
          <input
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            placeholder="XXXX-XXXX-XXXX"
            aria-label="License key"
            className="w-full px-4 py-3 rounded-full bg-secondary text-foreground text-center font-mono tracking-widest uppercase outline-none focus:ring-2 focus:ring-primary/60 border border-border"
          />
          {error && (
            <p className="mt-3 text-xs text-destructive font-medium">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting || !value.trim()}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm shadow-[0_0_20px_hsl(152_100%_50%/0.4)] hover:shadow-[0_0_28px_hsl(152_100%_50%/0.7)] disabled:opacity-60 transition"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock"}
          </button>
          <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground/60">
            Contact your administrator if you don't have a key.
          </p>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
