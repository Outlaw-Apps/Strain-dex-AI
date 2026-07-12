import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { useStrains } from "@/hooks/useStrains";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { StrainDetail } from "@/components/StrainDetail";
import { toSlug } from "@/lib/slug";

const StrainPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: strains = [], isLoading } = useStrains();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useAuth();

  const strain = useMemo(
    () => strains.find((s) => toSlug(s.name) === slug || s.id === slug) ?? null,
    [strains, slug],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!strain) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 text-center">
        <div>
          <h1 className="font-display text-2xl mb-2">Strain not found</h1>
          <button
            onClick={() => navigate("/")}
            className="text-primary underline"
          >
            Back to catalog
          </button>
        </div>
      </div>
    );
  }

  const canonical = `/strain/${toSlug(strain.name)}`;
  const desc = strain.description?.slice(0, 155) || `${strain.name} — ${strain.type} strain. THC ${strain.thc}%, CBD ${strain.cbd}%.`;

  return (
    <>
      <Helmet>
        <title>{`${strain.name} — Strain Dex`}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={`${strain.name} — Strain Dex`} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        {strain.image_url && <meta property="og:image" content={strain.image_url} />}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: strain.name,
            description: desc,
            category: strain.type,
            image: strain.image_url || undefined,
          })}
        </script>
      </Helmet>
      <StrainDetail
        strain={strain}
        onClose={() => navigate("/")}
        isFavorite={isFavorite(strain.id)}
        onToggleFavorite={user ? () => toggleFavorite(strain.id) : undefined}
      />
    </>
  );
};

export default StrainPage;
