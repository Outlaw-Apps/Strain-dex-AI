import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Privacy Policy — Strain Dex</title>
      <meta name="description" content="How Strain Dex handles your account and data." />
      <link rel="canonical" href="/privacy" />
    </Helmet>
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <article className="prose prose-invert max-w-none">
        <h1 className="font-display text-3xl neon-text mb-4">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <h2 className="font-display text-xl mt-6 mb-2">What we collect</h2>
        <p className="text-muted-foreground text-sm">
          If you create an account, we store your email and a display name. When you favorite strains, we store the association between your account and those strains.
        </p>

        <h2 className="font-display text-xl mt-6 mb-2">How we use it</h2>
        <p className="text-muted-foreground text-sm">
          Your data is used only to operate Strain Dex — signing you in, showing your favorites, and providing admin tools where applicable. We do not sell your data.
        </p>

        <h2 className="font-display text-xl mt-6 mb-2">Cookies & storage</h2>
        <p className="text-muted-foreground text-sm">
          We use browser storage to keep you signed in and remember age-verification. We do not use tracking cookies.
        </p>

        <h2 className="font-display text-xl mt-6 mb-2">Deleting your account</h2>
        <p className="text-muted-foreground text-sm">
          Contact us and we'll remove your account and associated data.
        </p>

        <p className="text-xs text-muted-foreground/60 mt-8">
          This page is maintained by the Strain Dex team and describes app-visible practices. It is not legal advice.
        </p>
      </article>
    </div>
  </div>
);

export default Privacy;
