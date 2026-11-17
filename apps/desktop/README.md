# Besire Desktop

Besire Desktop is a Tauri v2 and React application. It uses the existing Clerk
account and the Fastify API in `../backend`; it does not run a second billing or
course API.

## Run

From this directory:

```sh
pnpm install
npm --prefix ../backend install
npm run dev
```

Install the desktop dependencies with pnpm because this app is managed by
`pnpm-lock.yaml`. The `npm run` commands below can be used after `pnpm install`
has linked the desktop tools.

`npm run dev` starts the desktop's local profile API, the Fastify API in
`../backend`, and the frontend together. The local profile API uses the
embedded SQLite database at `data/besire.sqlite` and stores document files in
`data/profile-documents/`. The Fastify API uses its own `.env` file; configure
its required backend settings there. The desktop frontend defaults to
`http://localhost:3001` for the Fastify API.

Open `http://localhost:1420` to use the frontend in a browser. To open the
native desktop window while starting the same services, run `npm run tauri dev`;
the Tauri configuration starts `npm run dev` automatically.

Career profiles are stored locally and can be named independently of the
person's name in the profile details. Attach PDF or DOCX resumes/CVs (up to
20 MB each), then browse, edit, or delete profiles in the private gallery.

Resume documents are stored separately in the same local SQLite database. The
local API supports these operations:

- `GET` / `POST /api/resumes` — list or create blank resume documents.
- `GET` / `PUT` / `DELETE /api/resumes/:resumeId` — read, update, or delete.
- `POST /api/resumes/import` — import Reactive Resume JSON.
- `GET /api/resumes/:resumeId/export` — export Reactive Resume JSON.

Resume data retains the Reactive Resume structure; this milestone does not add
resume editor screens, PDF/DOCX generation, cloud sync, or public sharing. The
packaged Tauri app does not bundle the local API yet; bundle it as a sidecar or
move these operations into Tauri commands before shipping these routes in an
installer.

Build the web bundle with `npm run build`, or package the desktop app with
`npm run tauri build`.
On Windows, use `npm run package:windows` to create a single NSIS installer
`.exe` in `src-tauri/target/release/bundle/nsis/`.

Copy `.env.example` to `.env` and configure:

- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key for the existing Besire
  Clerk application.
- `VITE_API_URL` — Fastify API origin; use `http://localhost:3001` for local
  development. This must be configured when building a packaged app.
- `VITE_WEB_APP_URL` — Besire Web origin for the existing course catalogue and
  billing/payment flows. Checkout is opened externally; the desktop app
  refreshes entitlement state from the API when the user returns.

The backend must have its required database settings, plus
`CLERK_SECRET_KEY` and `CLERK_AUTHORIZED_PARTIES` configured. Include the
deployed Besire Web origin, desktop development origins
(`http://localhost:1420` and `http://127.0.0.1:1420`), and the Tauri origin
used by the target platform (`tauri://localhost` on macOS/Linux and
`http://tauri.localhost` on Windows). Include these origins in `WEB_ORIGIN` as
well so API preflight requests pass CORS.

## Packaging model

The Tauri installer currently contains the desktop UI and app shell; it does
not bundle the local profile API or launch the Fastify backend. The desktop app
connects to `VITE_API_URL` for account, course, and billing services, which keep
their secrets server-side. For a standalone installer that also supports local
profiles, bundle the local profile API as a Tauri sidecar (or move this local
API into Tauri commands) and use a per-user writable app-data directory.

## Access and feature status

The dashboard and route shell require Clerk sign-in. Plan and course access are
loaded from authenticated Fastify APIs; failed access checks do not unlock Pro
features. Career profiles and their attached files are stored by the local
desktop profile API. Job-search, IAN, and premium feature pages are currently
route shells, not implementations of those planned product features.
