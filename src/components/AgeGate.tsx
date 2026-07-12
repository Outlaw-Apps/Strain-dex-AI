import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf } from "lucide-react";

const KEY = "straindex.age-verified";

export function AgeGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const confirm = () => {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const deny = () => {
    window.location.href = "https://www.google.com";
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="age-gate-title"
        >
          <div className="max-w-md w-full text-center p-8 rounded-3xl bg-card border border-border">
            <Leaf className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h2 id="age-gate-title" className="font-display text-2xl font-bold mb-2">
              Are you 21 or older?
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Strain Dex contains cannabis-related content intended for adults only.
              By entering, you confirm you meet the legal age in your jurisdiction.
            </p>
            <div className="flex gap-3">
              <button
                onClick={deny}
                className="flex-1 py-3 rounded-full bg-secondary text-foreground font-medium hover:bg-muted transition"
              >
                No, exit
              </button>
              <button
                onClick={confirm}
                className="flex-1 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
              >
                Yes, enter
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
