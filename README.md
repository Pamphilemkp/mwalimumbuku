# Mwalimu Mbuku

Next.js App Router application at the repository root. This phase covers password sign-in, a cookie session, and a single role check. Courses, homework, assessments, games, and the other product screens are not in this tree yet. See [MIGRATION_INVENTORY.md](MIGRATION_INVENTORY.md).

## Local commands

Requires Node.js 20.9 or newer.

```bash
cp .env.example .env.local
npm install
npm run dev
```

The dev server runs at `http://localhost:3000`. `npm run dev` starts Next.js.

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Tests use the Node.js test runner. They do not call Supabase and they do not use a password.

## Environment variables

Set these in `.env.local`. Do not commit that file.

| Name | Previous Vite name |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `VITE_SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `VITE_SUPABASE_PUBLISHABLE_KEY` |

Both are public client settings. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the same public key the previous Vite client passed to Supabase. This app has no privileged server client.

## Sign-in

Password sign-in uses `signInWithPassword` and `@supabase/ssr` cookies (`getAll` / `setAll`). The browser client does not use `localStorage`.

`/dashboard` and `/holding` require a session. A session with exactly one of `student`, `parent`, `teacher`, or `admin` sees a short confirmation of that role. Missing, duplicate, unrecognized, or failed role checks stay on a holding page and do not open a role dashboard.

Next.js 16 refreshes the session in `proxy.ts` (the supported replacement for `middleware.ts`) by calling `auth.getClaims()`. The app layout and each protected page verify the user and the role again. `proxy.ts` alone is not the authorization boundary.

Anonymous visitors go to `/login`. Sign-out checks the error and navigates to `/login` only after success.

Proxy responses, including anonymous redirects, send `Cache-Control: private, no-store`. Session cookies are readable by the browser client (`httpOnly: false`). The `Secure` flag is on when `NODE_ENV` is `production`.

This app does not include signup. The current password cookie flow does not use an `/auth/callback` route, so that route is not included.

## Staging on Vercel

Create a **new** Vercel project. Do not attach this app to the existing production project, and do not replace `https://mwalimumbuku.vercel.app`.

- Root directory: the repository root
- Framework: Next.js
- `vercel.json` sets the framework to Next.js and does not rewrite routes to `index.html`
- Environment variable names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Use the same values as the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`

Deploy the new project on its own URL. Do not cut over the production domain.

## Roles

The only roles are `student`, `parent`, `teacher`, and `admin`.
