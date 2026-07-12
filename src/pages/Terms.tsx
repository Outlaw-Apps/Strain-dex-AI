import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";

const Terms = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Terms of Service — Strain Dex</title>
      <meta name="description" content="Terms for using Strain Dex." />
      <link rel="canonical" href="/terms" />
    </Helmet>
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <article className="prose prose-invert max-w-none">
        <h1 className="font-display text-3xl neon-text mb-4">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <h2 className="font-display text-xl mt-6 mb-2">Eligibility</h2>
        <p className="text-muted-foreground text-sm">
          You must be of legal age in your jurisdiction to use Strain Dex. The service is intended for informational and educational use only.
        </p>

        <h2 className="font-display text-xl mt-6 mb-2">No medical advice</h2>
        <p className="text-muted-foreground text-sm">
          Content on Strain Dex — including strain profiles, effects, and terpene information — is not medical advice. Consult a qualified professional before making health decisions.
        </p>

        <h2 className="font-display text-xl mt-6 mb-2">Accounts</h2>
        <p className="text-muted-foreground text-sm">
          You are responsible for keeping your credentials secure and for activity on your account.
        </p>

        <h2 className="font-display text-xl mt-6 mb-2">Acceptable use</h2>
        <p className="text-muted-foreground text-sm">
          Do not misuse the service, attempt to disrupt it, or upload content that violates the law. We may suspend accounts that do.
        </p>

        <p className="text-xs text-muted-foreground/60 mt-8">
          This page is maintained by the Strain Dex team. It is not legal advice.
        </p>
      </article>
    </div>
  </div>
);

export default Terms;
