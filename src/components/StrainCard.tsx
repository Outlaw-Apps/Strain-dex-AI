import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Leaf, Heart, ImagePlus, Loader2 } from "lucide-react";
import type { DbStrain } from "@/hooks/useStrains";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ImageCropperDialog } from "@/components/ImageCropperDialog";

interface StrainCardProps {
  strain: DbStrain;
  onClick: () => void;
  index: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function StrainCard({ strain, onClick, index, isFavorite, onToggleFavorite }: StrainCardProps) {
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const badgeClass =
    strain.type === "Indica"
      ? "badge-indica"
      : strain.type === "Sativa"
      ? "badge-sativa"
      : "badge-hybrid";

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Image must be under 8MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${strain.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("strain-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("strain-images").getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: dbErr } = await supabase
        .from("strains")
        .update({ image_url: publicUrl })
        .eq("id", strain.id);
      if (dbErr) throw dbErr;

      qc.invalidateQueries({ queryKey: ["strains"] });
      toast({ title: "Image updated", description: strain.name });
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.4 }}
      onClick={onClick}
      className="group cursor-pointer rounded-2xl bg-card border border-border overflow-hidden strain-card-hover"
    >
      <div className="aspect-square bg-secondary relative overflow-hidden">
        {strain.image_url ? (
          <img
            src={strain.image_url}
            alt={strain.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <Leaf className="w-12 h-12 md:w-16 md:h-16 text-primary/30 group-hover:text-primary/50 transition-colors duration-300" />
          </div>
        )}
        <div className="absolute top-2 right-2 md:top-3 md:right-3 flex items-center gap-1.5">
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className="p-1.5 rounded-full glass hover:bg-muted/80 transition-colors"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-primary text-primary" : "text-foreground/70"}`} />
            </button>
          )}
          <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${badgeClass}`}>
            {strain.type}
          </span>
        </div>

        {isAdmin && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={uploading}
              aria-label={strain.image_url ? "Replace image" : "Upload image"}
              className="absolute bottom-2 left-2 md:bottom-3 md:left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full glass hover:bg-muted/80 transition-colors text-[11px] md:text-xs font-medium text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-100"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading…</span>
                </>
              ) : (
                <>
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>{strain.image_url ? "Replace" : "Upload"}</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>
      <div className="p-3 md:p-4">
        <h3 className="font-display font-semibold text-sm md:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {strain.name}
        </h3>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">
          THC {strain.thc}% · {strain.dominant_terpene}
        </p>
      </div>
    </motion.div>
  );
}
