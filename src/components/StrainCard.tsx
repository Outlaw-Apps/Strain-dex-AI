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

  const handlePicked = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "Image must be under 15MB", variant: "destructive" });
      return;
    }
    setPendingFile(file);
  };

  const handleCroppedUpload = async (blob: Blob) => {
    setUploading(true);
    try {
      const path = `${strain.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("strain-images")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
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
      setPendingFile(null);
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
      className="group relative cursor-pointer"
    >
      {/* Emerald glow behind the card */}
      <div className="pointer-events-none absolute -inset-2 bg-primary/10 blur-2xl opacity-40 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative bg-card border border-gold/30 group-hover:border-gold transition-colors duration-300 overflow-hidden">
        <div className="aspect-square bg-secondary relative overflow-hidden">
          {strain.image_url ? (
            <img
              src={strain.image_url}
              alt={strain.name}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.04] transition-all duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
              <Leaf className="w-12 h-12 md:w-16 md:h-16 text-primary/30 group-hover:text-primary/60 transition-colors duration-300" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card to-transparent" />

          <div className="absolute top-2 right-2 md:top-3 md:right-3 flex items-center gap-1.5">
            {onToggleFavorite && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                className="p-1.5 bg-background/70 border border-gold/30 hover:border-gold transition-colors"
                aria-label="Toggle favorite"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-primary text-primary" : "text-foreground/70"}`} />
              </button>
            )}
            <span className={`px-2 md:px-2.5 py-0.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest ${badgeClass}`}>
              {strain.type}
            </span>
          </div>

          {isAdmin && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                disabled={uploading}
                aria-label={strain.image_url ? "Replace image" : "Upload image"}
                className="absolute bottom-2 left-2 md:bottom-3 md:left-3 flex items-center gap-1.5 px-2.5 py-1 bg-background/80 border border-gold/40 hover:border-gold transition-colors text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gold-light opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-100"
              >
                {uploading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Uploading…</span></>
                ) : (
                  <><ImagePlus className="w-3.5 h-3.5" /><span>{strain.image_url ? "Replace" : "Upload"}</span></>
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
                  if (f) handlePicked(f);
                  e.target.value = "";
                }}
              />
            </>
          )}
        </div>

        <div className="p-4 md:p-5 space-y-3">
          <h3 className="font-display text-lg md:text-2xl uppercase leading-none track-tightest text-foreground group-hover:chrome-gold transition-colors line-clamp-1">
            {strain.name}
          </h3>
          <div className="hairline-gold" />
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">THC</p>
              <p className="text-base md:text-lg font-black text-foreground leading-none">
                {strain.thc}<span className="text-xs text-gold ml-0.5">%</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Terpene</p>
              <p className="text-[11px] md:text-xs font-black uppercase tracking-tight text-foreground truncate max-w-[110px]">
                {strain.dominant_terpene}
              </p>
            </div>
          </div>
        </div>
      </div>

      {pendingFile && (
        <div onClick={(e) => e.stopPropagation()}>
          <ImageCropperDialog
            file={pendingFile}
            open={!!pendingFile}
            onCancel={() => setPendingFile(null)}
            onConfirm={handleCroppedUpload}
          />
        </div>
      )}
    </motion.div>
  );
}
