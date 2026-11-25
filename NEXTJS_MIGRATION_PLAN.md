# Mwalimu Mbuku — Next.js Migration Plan

## Status after the root transformation

Phase 1 is in the tree. The Next.js app is the repository root, the Vite app is gone, and `vercel.json` no longer rewrites every route to `index.html`. Staging notes are in [README.md](README.md). What moved and what did not is [MIGRATION_INVENTORY.md](MIGRATION_INVENTORY.md).

The text below is the 24 November 2026 plan. Where it disagrees with the phase that landed, the phase wins:

- The Vite source was not moved to `legacy/`. It remains at commit `8afba27b4f5a43b16aa231f8132bf696fcce1452`.
- There is one application, at the repository root.
- Session refresh lives in `proxy.ts` (`proxy()`). There is no `middleware.ts`.
- Public env names are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Do not add `lib/supabase/admin.ts`. Privileged keys stay in the existing Supabase edge functions.
- Roles remain `student`, `parent`, `teacher`, and `admin`.
- The production domain is unchanged.

Route steps 1–8 in the table below are not done. Removing Vite (the old step 9) happened before those routes were ported. Recover screens from the commit above. Do not recreate a Vite app to do it.

Audit date: 24 November 2026 (Asia/Nicosia).

This plan, as written on that date, did not migrate anything. It said whether a move was justified, how to keep the data, and in what order to move the UI.

## 1. Recommendation

**Move the interface to Next.js later, on the same Supabase project. Do not start with the move.**

The application is a client-rendered SPA. Its behavior lives in React pages and in Postgres policies, triggers, and six Deno functions. Next.js will not repair answer leaks, homework grades, or the role guard. Those are listed as steps A and B in [BUGS_AND_IMPROVEMENT_PLAN.md](BUGS_AND_IMPROVEMENT_PLAN.md). Shipping them on Vite is faster and safer than transplanting them.

A move is still justified once that work is in place, for three concrete reasons:

1. **First load.** The measured entry chunk is 241 KB gzipped before the 212 KB logo and Google Fonts. The landing page, login, and signup are static imports in `App.tsx`, so every visitor downloads the authenticated app shell. Next.js can serve the marketing pages as small HTML and keep the dashboard in a separate client bundle.
2. **Secrets and webhooks.** Stripe needs a server endpoint that holds the webhook secret. That endpoint does not exist today. A Next.js route handler (or a kept Supabase function) is the right home. The browser must not gain the service role during the move.
3. **Hosting fit.** `vercel.json` already assumes Vercel. Next.js on Vercel matches the current host. Lovable’s Vite plugin (`lovable-tagger`) is dev-only and can be dropped when you leave the Lovable publish loop.

A rewrite that also invents a new database, a new auth system, or a new grading rule will throw away the only specification the product has: this code and this data.

## 2. Feasibility

| Question | Answer |
| --- | --- |
| Can the React screens be reused? | Yes, mostly as client components. They already use hooks, `supabase-js`, and React Router. Router swaps are mechanical. Data calls can stay |
| Can the data stay? | Yes. Supabase Auth, Postgres, Storage, and Realtime do not care which UI hosts the JS. `auth.users` ids are the foreign keys |
| Is there a blocking framework feature? | No SSR requirement in the current product. Nothing is server-rendered today |
| What is hard? | Auth cookies vs `localStorage`, route-by-route parity, and not “fixing” RLS by querying with the service role |
| What is expensive and optional? | Rebuilding games, the toolbox, and the marketing page pixel-for-pixel. They can move late or stay |
| Big-bang rewrite feasible? | Technically possible, product-unsafe. Too many rules are implicit (which policy won after 37 migrations, which button is a toast) |

**Feasibility: high for an incremental UI move. Low for a simultaneous rewrite of the domain.**

## 3. Principles

1. **One database.** The live Supabase project remains the system of record. No export/import into a new Postgres unless Supabase itself is abandoned, which this plan does not recommend.
2. **No replay of old migrations** against production. New SQL is a forward migration only.
3. **RLS stays the authorization layer** for anything the browser can call. Server code uses the user JWT (anon key + user cookie) when it acts as the user. The service role is limited to webhooks, teacher provisioning, and other jobs that have no user.
4. **Do not fork grading.** `check_answer`, `award_badge_if_eligible`, and `handle_new_user` stay in Postgres until a deliberate replacement exists and is tested against the same cases. A Next.js action that re-grades in TypeScript will drift.
5. **Parity before polish.** A route is “moved” when the same roles can do the same writes. Visual redesign is a different project.
6. **Feature flags by route**, not by a long-lived second copy of a page. One route lives in one app at a time.
7. **Staging project** cloned from production (schema + a scrubbed data sample) before the first Next deploy. The current repo has no staging target.

## 4. Target shape

```
Next.js (App Router) on Vercel
  ├─ app/(marketing)/          server-rendered, small
  │    page.tsx, mission, login, signup
  ├─ app/(dashboard)/          client components, current pages
  │    layout with the sidebar
  ├─ app/auth/callback/        Supabase session exchange
  ├─ app/api/stripe/webhook/   service role, signature checked
  └─ lib/supabase/
       client.ts               browser, publishable key, cookies
       server.ts               cookies, publishable key, user session
       (no admin client)       privileged keys stay in Supabase edge functions

Supabase (unchanged project)
  Postgres + RLS + triggers + RPCs
  Auth
  Storage
  Realtime
  Edge functions that have not yet been retired
```

App Router is the right default on current Next.js. The dashboard should be **client components** (`"use client"`) at first, because that is what the code is. Forcing Server Components onto `CourseEditor` in the first pass will rewrite every mutation. Marketing pages can be Server Components immediately; they have no Supabase session requirement except “redirect if logged in”.

Pages Router would also work and is closer to React Router mentally. It is the worse long-term default, and it does not make the RLS work any easier. Use App Router.

### Auth change (the one real migration)

Today the session is in `localStorage` (`src/integrations/supabase/client.ts`). Next.js server components and route handlers cannot see that storage.

Use `@supabase/ssr` with cookie storage for the Next app. Consequences:

- Existing users are logged out once, when they first open the Next host, unless you deliberately keep the Vite origin and only change the bundle. A one-time re-login is acceptable and should be announced.
- `emailRedirectTo` and password-reset `redirectTo` must use the new site origin, not the hardcoded `https://mwalimumbuku.vercel.app` and not the Lovable fallback inside `create-checkout`.
- Middleware should refresh the cookie and send unauthenticated visitors away from `/dashboard`. That middleware replaces `ProtectedRoute` for “is there a session?”. It does **not** replace RLS. Role checks in middleware must read `user_roles` (or a custom claim) and must fail closed when the role is missing. Copying the current null-role bug into middleware would be a failed migration.

Do not enable both cookie sessions and localStorage sessions against the same site. Pick cookies the day the dashboard moves.

### What stays in Supabase functions for a while

Keep, until the webhook and admin jobs have replacements:

- `create-checkout`, `customer-portal`, `check-subscription` (then delete `check-subscription` once the webhook is authoritative).
- Teacher provisioning, once it exists (step B2). It can be born as a Next route handler instead of a new Deno function if the Next app is already deployed. If Next is not deployed yet, add it as a Deno function first; do not block step B2 on the framework.

Retire when unused:

- `validate-teacher-code` (no caller in `src/`).
- `notify-enrollment`, after parent notifications are produced by a trigger on `course_enrollments` the way assignments already are. The exercise-complete spam path should not be ported.

`update-subscription` should disappear in favor of the webhook and the Stripe portal. A client-triggered “set me to free” that does not cancel Stripe is not worth porting.

## 5. Route move order

Each step ends with the Vite route either redirected to the Next host or deleted. Do not maintain two editable copies.

| Step | Routes | Why this order |
| --- | --- | --- |
| 0 | Staging Supabase, cookie auth spike, login and logout only | Proves sessions before any feature moves |
| 1 | `/`, `/mission`, `/login`, `/signup`, `/forgot-password`, `/reset-password` | Largest bandwidth win, least data risk. Signup must still send the same metadata the trigger expects (`full_name`, `role`) |
| 2 | Dashboard layout, `/dashboard`, `/dashboard/profile` | Shell, role nav, dyslexia class, sign-out |
| 3 | Courses: browser, view, create, editor, teacher list | Highest-value learning path. Calls `check_answer` and `get_lesson_exercises` unchanged |
| 4 | Homework and submissions and grades | After the file-URL and grade-policy fixes. Grades page should drop Recharts during the move if step D has not already |
| 5 | Parent children, child progress, my role | After the embed bug is fixed, so you do not port a broken query |
| 6 | Messages, forum, notifications, support | Realtime works from client components. Revisit the 5-second poll here |
| 7 | Live sessions, teacher students, admin users, announcements, settings, analytics | Admin user creation must already be the service-role function |
| 8 | Games, toolbox, docs, mood, badges | Isolated. Games stay client-side |
| 9 | Remove Vite app, Lovable tagger, SPA `vercel.json` rewrite | Only when no route remains |

`vercel.json` today rewrites every path to `index.html`. A Next app must not keep that rewrite. Replace the project’s Vercel config as part of step 1, or the Next server will never see the request.

### Mapping notes for specific files

| Current | Next | Caution |
| --- | --- | --- |
| `App.tsx` route table | `app/` folders | Role lists in `ProtectedRoute` become layout checks. Fail closed |
| `DashboardLayout.tsx` | `(dashboard)/layout.tsx` | Still a client layout at first |
| `src/integrations/supabase/client.ts` | `lib/supabase/client.ts` | Generated types file moves as-is. Do not hand-edit it |
| `src/i18n/LanguageContext.tsx` | Can stay a client context | `fr` default. Do not add Lingala during the move |
| `src/hooks/useCourses.ts` | Same hook, client | Query keys stay, including the badge-key fix |
| `window.__queryClient` | Delete | Sign-out should call `queryClient.clear()` via context |
| Lazy `React.lazy` | File-system routes | Next splits by route. The grades/Recharts problem remains if the import stays static |
| `SupportWidget` in `App.tsx` | Mount inside the dashboard layout only | It currently sits on every route, but returns null when logged out. Still avoid loading it on marketing pages |

## 6. Data preservation

Nothing in the move requires a row to change.

Preserve without transformation:

- All `auth.users` ids. Every `user_id` and `teacher_id` points here.
- `user_roles`, `profiles`, role profile tables, `children_info`, `parent_student`.
- Catalog and learning rows: `courses`, `lessons`, `exercises`, `results`, `course_enrollments`, `assignments`, `homework_submissions`, `course_materials`.
- `badges`, `user_badges`, `daily_moods`.
- `messages`, `forum_posts`, `forum_replies`, `notifications`.
- `subscriptions`, `payment_history`, `renewal_history`.
- `live_sessions`, `attendance`, `teacher_recommendations`, support tables, `platform_settings`.
- Storage objects in `avatars`, `homework-files`, `course-materials`, `support-files`. Buckets stay. If step A5 makes a bucket private, existing public URLs in `file_url` columns will break until a backfill stores paths and the UI signs them. Do that backfill **before** or **with** the privacy change, not “during Next”.

Safe operational steps:

- Snapshot the database and the storage bucket list before the first policy migration and before cutover.
- Point the Next app at the same project only after staging has passed the parity checks below.
- Keep the Vite production deployment on a frozen URL until step 9, so a bad Next release can be reversed by DNS or by Vercel rollback. Do not delete the Vite project the same day.

Unsafe:

- `supabase db reset` on the production ref.
- A new Supabase project with “we will copy later”.
- Generating new user ids and rewriting foreign keys.
- Running the 37 historical migrations on a database that already applied them.

### Parity checks before cutover of a step

For the routes in that step, on staging, with one user of each role:

- Student can enroll, open a lesson, submit an answer, see a stored `results` row, upload homework, and (after the file fix) download it.
- Teacher can create a lesson and an exercise, see the submission, set a grade, and not see another teacher’s draft course.
- Parent can see a linked child and cannot see an unlinked student.
- Admin can change a role and cannot do so from a student session.
- A user with no `user_roles` row cannot open an admin URL.
- Premium flag: a non-premium student does not receive lesson rows for a premium course from PostgREST (this is a policy test, and it fails today; it must pass before you call the course module done).

Automate the policy checks as SQL scripts. A screenshot of the Next page is not a parity test.

## 7. Low-bandwidth work that belongs to this move

Do these as part of steps 1 and 4, not as a separate redesign:

- Marketing and login ship without the dashboard graph, without Framer Motion if the page can be static, and without the Google Fonts `@import`.
- Logo under 20 KB.
- Grades without Recharts, or with a dynamic import.
- Lesson video behind a user action.
- No Realtime socket on pages that do not show messages or the notification bell.

The games can stay a client chunk. They are already local after download. Do not server-render them.

## 8. Risks

| Risk | Why it happens | Mitigation |
| --- | --- | --- |
| Privileged key imported into a client component | A server-only helper looks convenient | Do not add `lib/supabase/admin.ts`. Keep privileged keys in the existing edge functions. `import 'server-only'` stays on `lib/supabase/server.ts` |
| Two sources of grading | A server action reimplements `check_answer` | Call the RPC |
| Session split-brain | Vite localStorage and Next cookies on one origin | One origin, one storage, cut over per route group |
| Broken reset emails | Hardcoded Vercel and Lovable origins | Centralize the site URL in one env var, used by signup, reset, and Stripe return URLs |
| Policy “fixes” written only in the Next server | Browser can still call PostgREST with the anon key | Every restriction from the bugs report is SQL, even if the UI also hides the button |
| Orphan `file_url` values | Bucket flipped to private | Backfill paths, then flip |
| Lovable overwrites the repo | README still describes two-way Lovable sync | Decide that Git is the source of truth before step 1, and stop publishing from Lovable |
| Scope creep into a school ERP | The move feels like a chance to add classes | Classes are Phase C in the bugs report, on whichever UI is current. They are not a Next.js feature |
| Time lost on ui kit | shadcn components move fine | Copy `src/components/ui` as-is. Do not restyle |

## 9. What not to migrate into Next

- The `lovable-tagger` plugin.
- The placeholder Vitest test, except as a reminder to add real tests. Vitest can stay for unit tests of pure helpers. Policy tests belong next to SQL.
- `window.__queryClient`.
- The mobile-money test toast, unless a real provider is in scope.
- `validate-teacher-code`.
- Dual lockfiles. Pick npm (the audit build used `npm ci`) or Bun, and delete the other lockfile in a cleanup commit. That cleanup is independent of Next and can happen first.
- A second copy of `translations.ts` “for the App Router”. Move the file once.

## 10. Suggested first implementation slice (when work is allowed)

When implementation starts, the first pull request that touches Next should be small enough to revert:

1. New Next app in `web/` or at the repo root after the Vite app is moved to `legacy/` (do not delete it).
2. Login, logout, and a blank dashboard that prints the role from `user_roles`.
3. Cookie session via `@supabase/ssr`.
4. Middleware that sends missing roles to `/login`.
5. Deployed to a preview URL pointed at **staging** Supabase.
6. No course code, no service role, no visual redesign.

Only after that preview can create a session and refuse a student on an admin path should `CourseBrowser` be copied.

## 11. Decision log

| Decision | Choice | Reason |
| --- | --- | --- |
| When | After P0 and P1 on the current app | Framework moves transplant bugs |
| Database | Keep Supabase | Data, RLS, and triggers are the product |
| Next style | App Router, dashboard as client components first | Matches the current code |
| Auth storage | Cookies via `@supabase/ssr` | Server and webhooks need the session |
| Payments | Webhook in Next or in Deno, not in the browser | Stripe must be verified server-side |
| Cutover | Route group by route group, Vite kept until the end | Reversible |
| Out of scope for the move | School model, mobile money, new languages, AI tutor | Separate product work |

The current Vite application can serve a pilot class **after** the P0 items in the bugs report, without Next.js. Next.js is the right shell for the public site and for webhooks. It is not the thing that makes the school records true.
