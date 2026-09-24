import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ID, OAuthProvider } from "appwrite";
import {
  account,
  clearPersistedSession,
  persistSessionSecret,
  restorePersistedSession,
} from "@/integrations/appwrite/client";

export interface AppUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContext {
  user: AppUser | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** Redirects the browser/webview to Google — only returns on failure. */
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthContext | undefined>(undefined);

function toAppUser(u: { $id: string; email: string; name: string }): AppUser {
  return { id: u.$id, email: u.email, name: u.name };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await account.get();
        if (!cancelled) setUser(toAppUser(u));
      } catch {
        // Cookie session unavailable (common in Electron/Capacitor) —
        // fall back to the persisted session secret.
        restorePersistedSession();
        try {
          const u = await account.get();
          if (!cancelled) setUser(toAppUser(u));
        } catch {
          clearPersistedSession();
          if (!cancelled) setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Clear any stale session — Appwrite allows one active session per client.
      await account.deleteSession("current").catch(() => undefined);
      const session = await account.createEmailPasswordSession({ email, password });
      if (session.secret) persistSessionSecret(session.secret);
      const u = await account.get();
      setUser(toAppUser(u));
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      await account.create({ userId: ID.unique(), email, password });
      return await signIn(email, password);
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      account.createOAuth2Token({
        provider: OAuthProvider.Google,
        success: `${window.location.origin}/`,
        failure: `${window.location.origin}/auth`,
      });
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signOut = async () => {
    try {
      await account.deleteSession("current");
    } catch {
      /* already signed out */
    }
    clearPersistedSession();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
