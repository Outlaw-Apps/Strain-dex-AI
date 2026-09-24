# Strain-dex AI

Search, discover, and explore cannabis strains — detailed profiles for THC, CBD,
terpenes, effects, aromas, and genetics. Built with Vite + React + shadcn-ui +
Tailwind, packaged for web, Electron (desktop), and Android (Capacitor).

**Backend: [Appwrite](https://appwrite.io)** — auth, database (TablesDB), file
storage, and serverless functions. See **[appwrite/README.md](appwrite/README.md)**
for backend setup (provisioning script included).

## Develop

```sh
# 1. Install dependencies
npm i

# 2. Configure the backend
#    Copy your Appwrite project values into .env:
#    VITE_APPWRITE_ENDPOINT / VITE_APPWRITE_PROJECT_ID / VITE_APPWRITE_DATABASE_ID
#    (First time? Run the provisioning script in appwrite/README.md.)

# 3. Start the dev server
npm run dev
```

Other scripts:

```sh
npm run build        # production build (also regenerates public/sitemap.xml)
npm run lint
npm test             # vitest
```

## Platform builds

- **Web**: `npm run build` → `dist/`
- **Android**: `npm run build` then `npx cap sync android` and build from `android/`
- **Electron**: `npm run build`, then use the `electron/` main process with your
  preferred electron-builder flow

## Tech

- Vite, TypeScript, React 18, shadcn-ui, Tailwind CSS
- Appwrite (Auth, TablesDB, Storage, Functions)
- Capacitor (Android), Electron (desktop)

