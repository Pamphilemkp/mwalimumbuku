# Mwalimu Mbuku — Next.js slice 0

Small App Router app for password sign-in, a cookie session, and a single role check. It does not replace the Vite app at the repository root.

## Local commands

Requires Node.js 20.9 or newer.

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

The dev server runs at `http://localhost:3000`.

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

## Environment variables

Set these in `apps/web/.env.local`. Do not commit that file.

| Name | Existing Vite name |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `VITE_SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `VITE_SUPABASE_PUBLISHABLE_KEY` |

Both are public client settings. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the same public key the Vite client passes to Supabase. There is no service-role client in this app.

## Sign-in

Password sign-in uses `signInWithPassword` and `@supabase/ssr` cookies (`getAll` / `setAll`). The browser client does not use `localStorage`.

`/dashboard` requires a session. A session with exactly one of `student`, `parent`, `teacher`, or `admin` sees a short confirmation of that role. Missing, duplicate, unrecognized, or failed role checks stay on a holding page and do not open a role dashboard.

Next.js 16 refreshes the session in `proxy.ts` (the supported replacement for `middleware.ts`) by calling `auth.getClaims()`.

This slice does not include signup. The current password cookie flow does not use an `/auth/callback` route, so that route is not included.

## Staging on Vercel

Create a **new** Vercel project. Do not attach this app to the existing production project, and do not replace `https://mwalimumbuku.vercel.app`.

- Root directory: `apps/web`
- Framework: Next.js
- Do not reuse the repository-root `vercel.json` SPA rewrite
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Deploy the new project on its own URL. Do not run a production deploy against the current Vite project.

## Security cleanup later

In a separate change, stop tracking the repository-root `.env`, and remove the personal admin mailbox recorded in `admin.md`. If this repository was shared, rotate the publishable key. This app does not print that key or that mailbox.
