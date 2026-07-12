import { Share2, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  className?: string;
}

export function ShareButton({ title, text, url, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      toast({ title: "Could not share", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <button
      onClick={handleShare}
      aria-label="Share"
      className={className ?? "p-2 rounded-full glass hover:bg-muted transition-colors"}
    >
      {copied ? <Check className="w-5 h-5 text-primary" /> : <Share2 className="w-5 h-5 text-foreground" />}
    </button>
  );
}
