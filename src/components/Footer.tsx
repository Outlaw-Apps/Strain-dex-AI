import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border mt-8">
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-primary" />
          <span className="font-display">Strain Dex</span>
          <span className="text-muted-foreground/60">© {new Date().getFullYear()}</span>
        </div>
        <nav className="flex items-center gap-5">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
