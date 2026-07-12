import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Leaf } from "lucide-react";
import { Helmet } from "react-helmet-async";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Helmet>
        <title>Page not found — Strain Dex</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="text-center max-w-md">
        <Leaf className="w-14 h-14 mx-auto mb-4 text-primary/40" />
        <h1 className="font-display text-5xl font-bold mb-2 neon-text">404</h1>
        <p className="text-lg text-muted-foreground mb-6">
          This page drifted off into the smoke.
        </p>
        <Link
          to="/"
          className="inline-flex px-5 py-2 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
        >
          Back to catalog
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
