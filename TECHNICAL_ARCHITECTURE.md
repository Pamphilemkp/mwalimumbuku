# Mwalimu Mbuku — Technical Architecture

The repository root is the Next.js application. Companion documents: [README.md](README.md), [MIGRATION_INVENTORY.md](MIGRATION_INVENTORY.md), [SECURITY.md](SECURITY.md), [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md), [MULTI_SCHOOL_ARCHITECTURE.md](MULTI_SCHOOL_ARCHITECTURE.md).

The 24 November 2026 audit below the historical heading describes the Vite SPA that used to be this repository. That UI is not the running app. Its source is commit `8afba27b4f5a43b16aa231f8132bf696fcce1452`. Supabase migrations, edge functions, and storage were not changed by the move.

## Current system

```
Browser
  └─ Next.js 16.4.6 App Router (repository root, Node)
       ├─ Server Components: /, /login, /forgot-password, /reset-password,
       │                     /dashboard, /holding
       ├─ Route handler: /auth/callback (recovery code or token only)
       ├─ Server actions: sign-in, sign-out, password recovery, password update
       ├─ Client Components: those forms and the logout button
       ├─ proxy.ts: refresh session cookies, send anonymous users
       │            off /dashboard and /holding to /login. / stays public
       └─ Server authorization (layout and each protected page):
            auth.getClaims() + one user_roles row
            missing / duplicate / invalid / error / role mismatch → /holding
            no session, expired session, or invalid token → /login

@supabase/ssr cookie client, public publishable key
  ├─ PostgREST  (this phase reads user_roles only)
  ├─ Auth       (password sign-in, recovery, and password update)
  └─ Edge functions, storage, and other tables stay in Supabase
     and are not called by this phase's UI
```

`proxy.ts` is not the authorization boundary. A page that needs a user loads the session again with `loadAppSession`.

There is one `package.json` and one npm lockfile. `npm run dev` runs `next dev`. There is no `vite.config.ts` and no Vite dependency. Product screens live in `src/` and are served by the App Router. `vercel.json` sets the framework to Next.js and does not rewrite paths to `index.html`.

| Concern | Implementation |
| --- | --- |
| Language | TypeScript 5.9, `strict: true` |
| UI runtime | React 19.2.9 and `react-dom` 19.2.9. `@types/react` 19.2.9. `@types/react-dom` 19.2.7 |
| Framework | Next.js 16.4.6, `eslint-config-next` 16.4.6. `proxy.ts` exports `proxy()` |
| Styling | Tailwind 3.4 at the root, `app/globals.css` |
| Routing | App Router. `/` is a public homepage and does not redirect. `/login`, `/forgot-password`, and `/auth/callback` are public. `/reset-password` shows a form only after a verified session. `/dashboard` and `/holding` are protected |
| Auth SDK | `@supabase/ssr` 0.12.7 and `@supabase/supabase-js` 2.119.2. Cookies, not `localStorage` |
| Public env | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, optional `NEXT_PUBLIC_SITE_URL` |
| Cookies | `httpOnly: false` so the browser client can read them. `sameSite: lax`. `path: /`. `secure: true` when `NODE_ENV` is `production` |
| Cache | Proxy responses, including anonymous redirects, send `Cache-Control: private, no-store`. Auth redirects also send `Referrer-Policy: no-referrer` |
| Headers | `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` with camera, microphone, geolocation, and payment disabled. No script content-security policy |
| Tests | `node --test` on auth decisions, redirects, rate limits, recovery, role checks, env access, cookie flags, and proxy headers. No live Supabase calls |
| Roles | `student`, `parent`, `teacher`, `admin` only. The signed-in user cannot submit a role |

Educational screens (courses, homework, assessments, games, XP, attendance, messaging, and the rest of the product) are served from `src/screens`. The database behind them is still one shared tenant. [MULTI_SCHOOL_ARCHITECTURE.md](MULTI_SCHOOL_ARCHITECTURE.md) is the design for schools, classes, and isolation. It is not applied: there is no migration and no new table in this change. This architecture does not claim official DRC curriculum compliance.

Staging is a separate Vercel project with the root directory set to the repository root. The production domain is unchanged.

## Multi-school design

The running schema has no `schools` table. A student's school and class are text on `student_profiles`. `admin` in `user_roles` is a platform-wide role. Parents link to children in `parent_student` with no school. Courses belong to `courses.teacher_id`.

The design keeps `student`, `parent`, `teacher`, and `admin` as the only global roles. School administration is a membership on one school, because one person may administer one school and teach at another. A global school-admin role would grant that power on every school.

Details, the ERD, table definitions, RLS, indexes, the data migration plan, and rollback are in [MULTI_SCHOOL_ARCHITECTURE.md](MULTI_SCHOOL_ARCHITECTURE.md).

## Historical audit (Vite SPA at 8afba27)

Audit date: 24 November 2026 (Asia/Nicosia). Findings in this historical section are from that tree. “Confirmed” means the source said this. The hosted project was not queried. Do not read the present tense below as a description of the current repository layout.

## 1. System shape

```
Browser (Vite SPA)
  ├─ React Router screens
  ├─ TanStack Query cache
  ├─ supabase-js  (localStorage session)
  │     ├─ PostgREST  → public tables, RLS, RPCs
  │     ├─ Auth       → email/password
  │     ├─ Storage    → avatars, homework, materials, support files
  │     └─ Realtime   → messages, notifications
  └─ invoke() → Deno edge functions
                  ├─ Stripe (checkout, portal, subscription check)
                  ├─ validate-teacher-code (unused by the UI)
                  └─ notify-enrollment (writes messages with the service role)

Postgres triggers and pg_cron run inside Supabase.
There is no Node API in this repository.
```

The client is trusted only as far as RLS and `SECURITY DEFINER` functions allow. Several policies are wider than the UI suggests. See [DATABASE_AND_BACKEND_AUDIT.md](DATABASE_AND_BACKEND_AUDIT.md).

## 2. Stack (confirmed from package.json and config)

| Concern | Implementation |
| --- | --- |
| Language | TypeScript 5.8. `strict: false`, `noImplicitAny: false`, `noUnusedLocals: false` in `tsconfig.app.json` |
| UI runtime | React 18.3, `react-dom` client render only (`src/main.tsx`) |
| Routing | `react-router-dom` 6.30, `BrowserRouter`, no loaders or data APIs |
| Styling | Tailwind 3.4, `tailwindcss-animate`, shadcn/ui (`components.json`), CSS variables in `src/index.css` |
| Components | Full Radix set under `src/components/ui/`. Many primitives are unused by product pages |
| Motion | `framer-motion` on the landing page and most dashboards |
| Charts | `recharts` 2, imported by the student grades page only |
| Forms | `react-hook-form`, `zod`, `@hookform/resolvers` are dependencies. Signup and several wizards validate by hand instead |
| Dates | `date-fns` 3, French locale hardcoded on several student screens |
| Toasts | Both Radix toaster and Sonner are mounted in `App.tsx` |
| Server cache | `@tanstack/react-query` 5. Defaults in `App.tsx`: `staleTime` 2 minutes, `gcTime` 5 minutes, `refetchOnWindowFocus: false`, query retry 2 |
| Backend SDK | `@supabase/supabase-js` 2.98 |
| Tests | Vitest 3, jsdom, Testing Library. One placeholder test |
| Lint | ESLint 9 flat config with react-hooks and react-refresh |
| Dev-only | `lovable-tagger` injected by `vite.config.ts` when `mode === "development"` |

`npm audit` on the lockfile reports 29 advisories (2 critical, 19 high, 7 moderate, 1 low). The two critical advisories are in Vitest (`tinypool` and the Vitest UI server). Vitest is a devDependency and is not part of the production bundle. The production-relevant high advisory in this set is `react-router` / `@remix-run/router` (open redirect / XSS via crafted redirects). Most other highs are build tools (`vite`, `rollup`, `postcss`) or transitive libraries. This is a dependency-hygiene issue, not evidence that the running site is remotely exploitable through Vitest.

## 3. Repository layout

```
/workspace
├── index.html                 SPA shell, Open Graph tags, title "Mwalimu Mbuku"
├── vercel.json                rewrite all paths to /index.html
├── vite.config.ts             port 8080, alias @ → src, lovable-tagger in dev
├── tailwind.config.ts
├── components.json            shadcn
├── package.json               name: vite_react_shadcn_ts, version 0.0.0
├── package-lock.json
├── bun.lock / bun.lockb       second lockfile, Lovable/Bun era
├── .env                       tracked; see secrets note below
├── README.md                  Lovable template
├── admin.md                   operator note with a personal admin mailbox
├── .lovable/plan.md           historical onboarding plan
├── public/                    favicon, placeholder.svg, robots.txt (allow all)
├── src/
│   ├── main.tsx               createRoot
│   ├── App.tsx                providers, route table
│   ├── index.css              Tailwind, Google Fonts import, .dyslexia-mode
│   ├── pages/                 route screens
│   ├── pages/dashboard/       authenticated screens
│   ├── pages/onboarding/      wizards, not enforced
│   ├── components/            product components + games + support + ui/
│   ├── hooks/                 auth, courses, subscription, support, settings
│   ├── i18n/                  fr and en catalogs
│   ├── integrations/supabase/ client.ts (generated) and types.ts (generated)
│   ├── lib/auth.ts            signUp, signIn, getUserRole, resetPassword
│   └── test/example.test.ts
└── supabase/
    ├── config.toml            project_id and verify_jwt = false on every function
    ├── migrations/            37 SQL files, March–May 2026 timestamps in the names
    └── functions/             6 Deno functions
```

There is no `src/server`, no `app/` directory, no middleware, and no CI workflow in the repository.

## 4. Frontend runtime

### Providers

`App.tsx` nests, from the outside:

1. `QueryClientProvider` — the client is also stored on `window.__queryClient` so sign-out can clear it.
2. `AuthProvider` (`src/hooks/useAuth.tsx`).
3. `LanguageProvider` (`src/i18n/LanguageContext.tsx`).
4. Tooltip, Radix toaster, Sonner.
5. `BrowserRouter`.
6. `SupportWidget` (hidden when logged out).
7. `Suspense` with a spinner, then `Routes`.

### Code splitting

Eager (in the 802 KB entry chunk): `Index`, `Login`, `Signup`, `Mission`, `NotFound`, plus the shared providers.

Lazy: every dashboard page, password reset, onboarding, and docs. Route-level `React.lazy` is present and shows up in the build as separate chunks. The grades route still pulls Recharts into a 391 KB chunk because the import is static inside that page.

### Routing

Public:

| Path | Screen |
| --- | --- |
| `/` | Landing. Redirects to `/dashboard` when a session exists |
| `/mission` | Mission statement |
| `/login`, `/signup` | Auth |
| `/forgot-password`, `/reset-password` | Email reset |
| `/onboarding/:role` | Wizard. Requires a session inside the page, not via `ProtectedRoute` |
| `*` | Not found |

Authenticated shell (`ProtectedRoute` → `OnboardingGuard` → `DashboardLayout`):

| Path | Roles allowed by the route | Notes |
| --- | --- | --- |
| `/dashboard` | any logged-in user | Picks a home by role. `null` role renders `StudentHome` |
| `/dashboard/profile` | any | |
| `/dashboard/courses`, `/dashboard/courses/:courseId` | any | Premium lock is inside `CourseView`, not the router |
| `/dashboard/courses/:courseId/edit` | teacher, admin | |
| `/dashboard/my-courses`, `/dashboard/create-course`, `/dashboard/results` | teacher, admin | |
| `/dashboard/assignments`, `/dashboard/grades` | student | |
| `/dashboard/submissions`, `/dashboard/my-students` | teacher, admin | |
| `/dashboard/live-sessions` | teacher, admin, student, parent | Same page, staff see the create dialog |
| `/dashboard/children`, `/dashboard/child-progress` | any logged-in user | Not restricted to `parent` |
| `/dashboard/my-role` | parent | |
| `/dashboard/users`, `/dashboard/manage-courses`, `/dashboard/analytics`, `/dashboard/settings`, `/dashboard/announcements`, `/dashboard/assign-teachers` | admin | |
| `/dashboard/forum`, `/dashboard/messages`, `/dashboard/games`, `/dashboard/toolbox`, `/dashboard/subscription`, `/dashboard/docs`, `/dashboard/onboarding`, `/dashboard/support`, `/dashboard/progress`, `/dashboard/badges`, `/dashboard/mood` | any logged-in user | Games and toolbox are on the student and admin menus only, but the URLs are open to every role |

`DashboardLayout` builds the sidebar from `roleNavItems`. Active state is exact path equality, so `/dashboard/courses/:id` does not highlight “courses”.

### Auth flow (confirmed)

1. `supabase.auth.getSession()` restores the session from `localStorage` (`src/integrations/supabase/client.ts`: `persistSession: true`, `autoRefreshToken: true`).
2. `getUserRole` selects `user_roles.role` with `maybeSingle()`.
3. `onAuthStateChange` repeats the role lookup.
4. A 4-second timeout marks the provider ready even if the role lookup has not finished. `ProtectedRoute` then sees `user` set and `role === null`.
5. Sign-out calls `supabase.auth.signOut()`, clears the query cache, and hard-redirects to `/login`.

Signup (`src/lib/auth.ts`):

- Sends `full_name` and `role` in `options.data`.
- `emailRedirectTo` is `window.location.origin` in dev and `https://mwalimumbuku.vercel.app` in production builds.
- `handle_new_user` (latest definition, migration `20260529160934_...sql`) inserts `profiles`, `user_roles`, `subscriptions` (`free`), and a blank `student_profiles` or `parent_profiles` row.
- Roles other than `student` and `parent` are stored as `student`. Admin and teacher cannot be self-assigned through metadata. This part is confirmed and is the right control.
- The client then updates `profiles` and upserts the role profile **only if `signUp` returned a session**. If email confirmation is required, those fields are dropped on the floor and the user sees “check your email”. `onboarding_completed` stays false, but nothing forces the wizard.

Password reset uses `resetPasswordForEmail` and `updateUser` on `/reset-password`.

### Internationalization

`translations.ts` exports two catalogs. `Language` is `keyof typeof translations`, and the provider only accepts `fr` and `en` (default `fr`, persisted as `mwalimu-lang`).

Signup still offers Swahili and Lingala as `preferred_language` / `learning_language` values stored on the profile. Those codes do not switch the interface. Several screens ignore the catalog and hardcode French (`StudentAssignments`, `TeacherLiveSessionsPage`, `ParentRolePage`) or English (`ChildProgress`).

### Accessibility that exists

- `profiles.dyslexia_mode` toggles a `dyslexia-mode` class on `document.body` (`ProfilePage`). The CSS in `index.css` adjusts letter spacing and font. It does not change content.
- `TextToSpeech` uses the browser `speechSynthesis` API.
- `SpeechToText` uses the Web Speech API (`webkitSpeechRecognition` path). Toolbox dictation and the vocal calculator depend on it.
- `AudioRecorder` uses `MediaRecorder` and keeps a blob in memory. The toolbox does not upload it.

These APIs are uneven on low-cost Android browsers and need a network for some vendor speech engines. They are not an offline mode.

## 5. Data access pattern

There is no repository layer. Pages call `supabase.from(...)`, `supabase.rpc(...)`, `supabase.storage`, or `supabase.functions.invoke(...)` directly. Shared hooks cover only a slice:

| Hook | Responsibility |
| --- | --- |
| `useAuth` | session, role, sign-out |
| `useCourses` | published courses, teacher courses, lessons, exercise RPC, create course/lesson/exercise, `check_answer`, results, badges, publish toggle |
| `useSubscription` | read own `subscriptions` row; `isPremium` is `tier === 'premium' && is_active` |
| `usePlatformSettings` | `platform_settings` key/value JSON |
| `useSupport` | tickets, messages, typing, file upload |
| `useOnboarding` | `onboarding_completed`, `onboarding_step` |
| `usePagination` | client-side paging of an already fetched array |

Implications:

- Query keys are inconsistent. Badge claim invalidates `['user-badges']` while `useUserBadges` uses `['badges', 'user', userId]`. The claim button does not refresh the list until a reload.
- Admin screens issue unbounded `select('*')` (profiles, results, enrollments, subscriptions).
- `TeacherResults` loads enrollments, then lessons, then exercises, then results, then profiles. Five round trips, no pagination, and results are not limited to that teacher’s exercises in the last query filter beyond an `in` list built in the client.
- Errors are often a toast of `error.message` from PostgREST, which leaks policy and schema phrasing to the user.

## 6. Backend

Supabase project id is recorded in `supabase/config.toml`. The browser reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`src/integrations/supabase/client.ts`). Generated types say PostgREST 14.1.

### What runs in the database

- Row Level Security on every product table that the migrations create.
- `SECURITY DEFINER` functions: `has_role`, `handle_new_user`, `check_answer`, `get_lesson_exercises`, `link_parent_child`, `award_badge_if_eligible`, notification helpers, `run_scheduled_notifications`.
- Triggers on signup, assignment insert, homework insert/update, materials, live sessions, recommendations, payments, support.
- `pg_cron` job `run-scheduled-notifications` hourly, created in `20260529162956_...sql`. Whether the extension is enabled on the hosted project is **not verified**. The migration will fail closed if `pg_cron` is unavailable; it is not something the client can start.

### Edge functions

| Function | JWT verified by the gateway | What the code does |
| --- | --- | --- |
| `create-checkout` | no (`verify_jwt = false`) | Checks the bearer token, creates a Stripe Checkout session for a hardcoded price, success/cancel URLs on the request `Origin` |
| `customer-portal` | no | Stripe billing portal for the customer matched by email |
| `check-subscription` | no | Lists Stripe subscriptions by email. If one is active, upserts `subscriptions` to premium with the service role. If none is active, it returns `subscribed: false` and **does not** downgrade the row |
| `update-subscription` | no | Allows only `tier: "free"`. Uses the service role to write `subscriptions`. Looks up the user with `SUPABASE_PUBLISHABLE_KEY`, which is non-standard |
| `validate-teacher-code` | no | Compares a code to `TEACHER_ACCESS_CODE`. No UI calls it anymore |
| `notify-enrollment` | no | Service role. On `enrollment` or `exercise_complete`, inserts a `messages` row to each linked parent. No rate limit, no check that the caller is enrolled, `exercise_id` is ignored |

There is **no Stripe webhook function** in the repository. Payment state changes that happen in Stripe while the user is away are invisible until someone opens the subscription page and `check-subscription` runs, and even then a lapsed subscription is not written back.

Secrets such as `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `TEACHER_ACCESS_CODE` are read from the function environment. They are not in the repo. The publishable key and project URL are.

## 7. Storage

| Bucket | Public flag in migrations | Who can write |
| --- | --- | --- |
| `avatars` | public | folder name must equal `auth.uid()` |
| `homework-files` | private | student folder must equal `auth.uid()` |
| `course-materials` | public | teachers of the course |
| `support-files` | public | ticket participants (see database report) |

`HomeworkUpload` stores `getPublicUrl()` even though the bucket is private. A public URL for a private object does not authorize a download. Teachers and students opening `file_url` should receive an authorization error. **Confirmed in code. Not exercised against live storage.**

## 8. Deployment and environments

- Local dev server: Vite, host `::`, port **8080**, HMR overlay disabled.
- Production UI: static files. `vercel.json` sends every path to `index.html` so client routing works. No cache headers, no image CDN config, no security headers.
- Lovable: `lovable-tagger` and the README publish flow. The tagger does not run in production builds (`mode === "development"` only).
- Auth redirects assume the Vercel host in production. A Lovable host or a future custom domain will send reset links to the Vercel host unless `signUp` / `resetPassword` are changed.
- Stripe fallback origin is the Lovable host (`create-checkout`, `customer-portal`).

No staging project is defined in the repo. Client and migrations point at one Supabase project.

## 9. Build characteristics (measured)

`npm run build` (Vite 5.4.19) succeeded and emitted:

- Entry JS: 801.54 KB, gzip 241.09 KB.
- Grades page: 390.90 KB, gzip 107.63 KB.
- CSS: 84.03 KB, gzip 13.98 KB.
- Logo: 212.05 KB PNG.
- Vite warning: entry chunk larger than 500 KB.

`npx tsc --noEmit -p tsconfig.app.json` exited 0 under the loose compiler settings.

The landing page, login, and signup cannot be smaller than the entry chunk with the current split, because they are statically imported from `App.tsx`.

## 10. Quality baseline

- No end-to-end tests, no RLS tests, no fixture users.
- Duplicate lockfiles (`npm` and `bun`) can drift.
- Generated Supabase files are marked “do not edit” and have drifted from some hand-written queries (embedded `profiles` on `parent_student`, which has an empty `Relationships` array in `types.ts`).
- `as any` is used where tables were added after an older type generation pass (`live_sessions`, `teacher_recommendations`). Current `types.ts` does include those tables, so the casts are leftover, not evidence the tables are missing.
- Error handling is local to each mutation. There is no error boundary around routes.
- `robots.txt` allows all crawlers. Dashboard HTML is the same `index.html` for every URL, so private screens are not server-rendered into the crawl, but Open Graph metadata is global.

## 11. Architectural constraints that matter for a Next.js move

- Almost every feature assumes it runs in the browser with the user JWT. Moving a page to a Server Component requires an explicit decision: keep the call on the client, or call PostgREST on the server with the user cookie. The service role must not be used to “make RLS easier”.
- Authorization bugs are in Postgres policies and in one React guard. Rewriting the UI framework does not fix them.
- Business rules that are real live in SQL functions (`check_answer`, `handle_new_user`, `award_badge_if_eligible`) and triggers. A Next.js route handler that reimplements grading would fork the rules.
- The data model has no tenant id. Any future school tenancy is a schema change, not a framework change.
