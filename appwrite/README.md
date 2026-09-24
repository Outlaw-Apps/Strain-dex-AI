# Appwrite backend for Strain-dex AI

This folder contains everything that replaces the old Supabase backend:

- `setup.mjs` — one-shot provisioning script (database, tables, indexes, bucket, admin team, function definitions)
- `appwrite.json` — Appwrite CLI config for deploying the functions
- `functions/` — five Appwrite Functions (Node.js runtime):
  - `license-validate` (execute: **any**) — validates license keys, atomically increments usage
  - `strains-export` (execute: **team:admins**) — filtered CSV/JSON export
  - `ai-strain-import` (execute: **team:admins**) — researches strain names via Firecrawl + an OpenAI-compatible model and inserts/merges rows
  - `generate-strain-image` (execute: **team:admins**) — generates a strain image via an OpenAI-compatible Images API and stores it in the `strain-images` bucket
  - `voice-search-transcribe` (execute: **users**) — transcribes WAV audio via an OpenAI-compatible Transcriptions API

## 1. Create the project

1. Create a project in [Appwrite Cloud](https://cloud.appwrite.io) (or your self-hosted instance).
2. Add a **Web** platform with your dev hostname (e.g. `localhost`) — and your production domain later.
3. Create an **API key** (Console → Overview → API keys) with scopes: `databases`/`tablesDB`, `collections`/`tables`, `attributes`/`columns`, `indexes`, `storage`, `teams`, `functions`, `users`.

## 2. Provision resources

```sh
npm install node-appwrite   # once

# PowerShell:
$env:APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
$env:APPWRITE_PROJECT_ID="<your project id>"
$env:APPWRITE_API_KEY="<your api key>"
node appwrite/setup.mjs
```

The script is idempotent and creates:

| Resource | ID | Permissions |
|---|---|---|
| Database | `straindex` | — |
| Table | `strains` | read: any · write: team `admins` |
| Table | `favorites` | create: users · row-level per-user read/delete |
| Table | `license_keys` | read/write: team `admins` |
| Bucket | `strain-images` | read: any · write: team `admins` |
| Team | `admins` | admin access = membership in this team |

## 3. Deploy the functions

With the [Appwrite CLI](https://appwrite.io/docs/tooling/command-line/installation):

```sh
appwrite login
# edit appwrite/appwrite.json: set projectId (and endpoint if self-hosted)
cd appwrite
appwrite push functions
```

Or via the Console: open each function → **Deployments** → upload the function folder (entrypoint `src/main.js`, build command `npm install`).

## 4. Set function environment variables

Console → Functions → *function* → Settings → Variables:

| Variable | Functions | Value |
|---|---|---|
| `APPWRITE_API_KEY` | all 5 | server API key (tablesDB + storage scopes) |
| `APPWRITE_DATABASE_ID` | all 5 | optional, defaults to `straindex` |
| `AI_API_KEY` | ai-strain-import, generate-strain-image, voice-search-transcribe | OpenAI (or compatible) API key |
| `AI_BASE_URL` | same 3 | optional, defaults to `https://api.openai.com/v1` |
| `AI_MODEL` | ai-strain-import | optional, default `gpt-4o-mini` |
| `AI_IMAGE_MODEL` | generate-strain-image | optional, default `gpt-image-1` |
| `AI_TRANSCRIBE_MODEL` | voice-search-transcribe | optional, default `whisper-1` |
| `FIRECRAWL_API_KEY` | ai-strain-import | firecrawl.dev key |
| `APPWRITE_BUCKET_ID` | generate-strain-image | optional, default `strain-images` |

`APPWRITE_FUNCTION_API_ENDPOINT` and `APPWRITE_FUNCTION_PROJECT_ID` are injected automatically by the runtime.

## 5. Admins

Admin access is membership in the `admins` team. Add users via
Console → Auth → Teams → `admins` → Add member (or with the server SDK/CLI).
Table write permissions and the admin-only functions are already restricted to
this team, so there is no client-side bypass.

## 6. Point the app at the project

Fill in the repo-root `.env`:

```
VITE_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
VITE_APPWRITE_PROJECT_ID="<your project id>"
VITE_APPWRITE_DATABASE_ID="straindex"
```

Works for web, Electron, and Android (Capacitor) — the app persists the session
secret in `localStorage` so sign-in survives restarts in webviews where
third-party cookies are blocked.

## Migrating data from Supabase

Export `public.strains` from Supabase as CSV (columns `name, type, thc, cbd,
description, genetics, dominant_terpene, effects, negative_effects,
medical_uses, aromas, tastes, image_url`; arrays joined with `|`), then use the
app's Admin → Bulk Upload CSV importer. License keys can be recreated in
Admin → License Keys.
