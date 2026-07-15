import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Loader2 } from "lucide-react";

const STORAGE_KEY = "straindex.license-key";
const USAGE_PREFIX = "straindex.license-uses.";

type LicenseRule = {
  key: string;
  expiresAt?: string; // ISO date
  maxUses?: number;
};

function parseRules(): LicenseRule[] {
  const rules: LicenseRule[] = [];

  // Rich JSON config: [{ "key": "ABC", "expiresAt": "2026-12-31", "maxUses": 100 }]
  const jsonRaw = (import.meta.env.VITE_LICENSE_KEYS_JSON as string | undefined) ?? "";
  if (jsonRaw.trim()) {
    try {
      const parsed = JSON.parse(jsonRaw);
      if (Array.isArray(parsed)) {
        for (const r of parsed) {
          if (r && typeof r.key === "string") {
            rules.push({
              key: r.key.trim().toUpperCase(),
              expiresAt: typeof r.expiresAt === "string" ? r.expiresAt : undefined,
              maxUses: typeof r.maxUses === "number" ? r.maxUses : undefined,
            });
          }
        }
      }
    } catch {
      /* ignore malformed JSON */
    }
  }

  // Legacy comma-separated keys (no expiry / no cap)
  const raw = (import.meta.env.VITE_LICENSE_KEYS as string | undefined) ?? "";
  for (const k of raw.split(",")) {
    const key = k.trim().toUpperCase();
    if (key && !rules.some((r) => r.key === key)) rules.push({ key });
  }

  return rules;
}

function findRule(candidate: string): LicenseRule | undefined {
  const norm = candidate.trim().toUpperCase();
  return parseRules().find((r) => r.key === norm);
}

function readUses(key: string): number {
  try {
    return Number(localStorage.getItem(USAGE_PREFIX + key) ?? "0") || 0;
  } catch {
    return 0;
  }
}

function bumpUses(key: string): number {
  const next = readUses(key) + 1;
  try {
    localStorage.setItem(USAGE_PREFIX + key, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

type ValidationResult =
  | { ok: true; rule: LicenseRule }
  | { ok: false; reason: string };

function validate(candidate: string, opts: { countUsage: boolean }): ValidationResult {
  const rules = parseRules();
  if (rules.length === 0) {
    // Gate disabled
    return { ok: true, rule: { key: "" } };
  }
  const rule = findRule(candidate);
  if (!rule) return { ok: false, reason: "That license key isn't valid." };

  if (rule.expiresAt) {
    const exp = new Date(rule.expiresAt).getTime();
    if (!Number.isNaN(exp) && Date.now() > exp) {
      return { ok: false, reason: `This key expired on ${new Date(exp).toLocaleDateString()}.` };
    }
  }

  if (typeof rule.maxUses === "number" && rule.maxUses > 0) {
    const used = readUses(rule.key);
    const nextUsed = opts.countUsage ? used + 1 : used;
    if (nextUsed > rule.maxUses) {
      return { ok: false, reason: "This key has reached its usage limit." };
    }
  }

  if (opts.countUsage && typeof rule.maxUses === "number") {
    bumpUses(rule.key);
  }

  return { ok: true, rule };
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
      if (saved) {
        // Re-validate saved key (may have expired or hit its cap since last visit)
        const res = validate(saved, { countUsage: false });
        if (res.ok) setUnlocked(true);
        else localStorage.removeItem(STORAGE_KEY);
      } else if (parseRules().length === 0) {
        setUnlocked(true);
      }
    } catch {
      /* ignore */
    }
    setChecked(true);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = validate(value, { countUsage: true });
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
