import { Account, Client, Functions, Storage, TablesDB, Teams } from "appwrite";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT as string | undefined;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID as string | undefined;

if (!endpoint || !projectId) {
  console.warn(
    "[appwrite] VITE_APPWRITE_ENDPOINT and/or VITE_APPWRITE_PROJECT_ID are not set. " +
      "Backend calls will fail until you configure them (see appwrite/README.md).",
  );
}

export const client = new Client();
if (endpoint) client.setEndpoint(endpoint);
if (projectId) client.setProject(projectId);

export const account = new Account(client);
export const tables = new TablesDB(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
export const teams = new Teams(client);

export const DATABASE_ID =
  (import.meta.env.VITE_APPWRITE_DATABASE_ID as string | undefined) || "straindex";

export const TABLES = {
  strains: "strains",
  favorites: "favorites",
  licenseKeys: "license_keys",
} as const;

export const BUCKETS = {
  strainImages: "strain-images",
} as const;

export const FUNCTIONS = {
  licenseValidate: "license-validate",
  strainsExport: "strains-export",
  aiStrainImport: "ai-strain-import",
  generateStrainImage: "generate-strain-image",
  voiceSearchTranscribe: "voice-search-transcribe",
} as const;

/** Team whose members get admin access (write perms + admin functions). */
export const ADMIN_TEAM_ID = "admins";

// Appwrite's web SDK stores the session in a cookie on the API domain. In
// Electron/Capacitor webviews third-party cookies are not persisted reliably,
// so we also persist the session secret and re-attach it on startup.
const SESSION_SECRET_KEY = "straindex.appwrite-session";

export function persistSessionSecret(secret: string) {
  try {
    localStorage.setItem(SESSION_SECRET_KEY, secret);
  } catch {
    /* storage unavailable */
  }
}

export function restorePersistedSession() {
  try {
    const secret = localStorage.getItem(SESSION_SECRET_KEY);
    if (secret) client.setSession(secret);
  } catch {
    /* storage unavailable */
  }
}

export function clearPersistedSession() {
  try {
    localStorage.removeItem(SESSION_SECRET_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Public view URL for a file in the strain-images bucket. */
export function strainImageUrl(fileId: string): string {
  return String(storage.getFileView({ bucketId: BUCKETS.strainImages, fileId }));
}

/**
 * Execute an Appwrite Function synchronously and parse its response body.
 * Throws an Error with the function's `error` message on failure.
 */
export async function callFunction<T = unknown>(
  functionId: string,
  body?: unknown,
): Promise<T> {
  const execution = await functions.createExecution({
    functionId,
    body: body === undefined ? "" : JSON.stringify(body),
    async: false,
  });

  const raw = execution.responseBody ?? "";
  let parsed: unknown = raw;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    /* plain-text response (e.g. CSV) */
  }

  if (execution.status === "failed") {
    throw new Error(execution.errors || "Function execution failed");
  }
  if (execution.responseStatusCode >= 400) {
    const message =
      (parsed as { error?: string } | null)?.error ||
      (typeof parsed === "string" && parsed) ||
      `Request failed (${execution.responseStatusCode})`;
    throw new Error(message);
  }
  return parsed as T;
}
