import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Loader2 } from "lucide-react";

const STORAGE_KEY = "straindex.license-key";

function getValidKeys(): string[] {
  const raw = (import.meta.env.VITE_LICENSE_KEYS as string | undefined) ?? "";
  return raw
    .split(",")
    .map((k) => k.trim().toUpperCase())
    .filter(Boolean);
}

function isValid(candidate: string): boolean {
  const keys = getValidKeys();
  if (keys.length === 0) return true; // no keys configured => gate disabled
  return keys.includes(candidate.trim().toUpperCase());
}

export function LicenseGate({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) ?? "";
      if (isValid(saved) || getValidKeys().length === 0) setUnlocked(true);
    } catch {
      /* ignore */
    }
    setChecked(true);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    if (isValid(value)) {
      try {
        localStorage.setItem(STORAGE_KEY, value.trim().toUpperCase());
      } catch {
        /* ignore */
      }
      setUnlocked(true);
    } else {
      setError("That license key isn't valid.");
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
