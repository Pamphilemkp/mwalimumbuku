# Mwalimu Mbuku — Project Overview

The running application is the Next.js app at the repository root. See [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) and [MIGRATION_INVENTORY.md](MIGRATION_INVENTORY.md). This overview is the 24 November 2026 audit of the Vite product. The Vite source it cites is commit `8afba27b4f5a43b16aa231f8132bf696fcce1452`. Schema and data were not changed by the root transformation.

Audit date: 24 November 2026 (Asia/Nicosia).  
Scope: the repository as it existed on `main` at the time of this audit. No application code, schema, or data was changed by the audit.

This file is the entry point. The other reports are:

| Report | What it answers |
| --- | --- |
| [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) | Stack, folders, runtime, routing, deployment |
| [FEATURES_AND_MODULES.md](FEATURES_AND_MODULES.md) | Every feature, what it does, and whether the code actually implements it |
| [DATABASE_AND_BACKEND_AUDIT.md](DATABASE_AND_BACKEND_AUDIT.md) | Postgres schema, RLS, storage, edge functions, auth |
| [BUGS_AND_IMPROVEMENT_PLAN.md](BUGS_AND_IMPROVEMENT_PLAN.md) | Defects, security, performance, low-bandwidth, sequenced fixes |
| [NEXTJS_MIGRATION_PLAN.md](NEXTJS_MIGRATION_PLAN.md) | Whether and how to move the UI to Next.js without losing data |

## How findings were verified

Confirmed findings were read directly from source: React pages and hooks, `src/integrations/supabase/types.ts`, all 37 SQL migrations under `supabase/migrations/`, all 6 edge functions, and configuration (`package.json`, `vite.config.ts`, `vercel.json`, `supabase/config.toml`).

The following checks were executed in this environment:

- `npm test` — 1 file, 1 test, passed. The test only asserts `true === true`. It does not cover product behavior.
- `npx tsc --noEmit -p tsconfig.app.json` — passed. `strict` and `noImplicitAny` are both off, so this is a weak signal.
- `npm run build` — succeeded. Bundle sizes below are from that production build.

The hosted Supabase project was **not** queried. Committed credentials were not used to read or write production data. If the live database was edited in the Supabase dashboard and those edits were not exported into `supabase/migrations/`, production can differ from this report. Those cases are marked **likely** or **not verified against the live database**.

A screen that exists is not treated as a working feature.

## Executive summary

Mwalimu Mbuku is a Lovable-generated single-page application for primary and secondary learners, their parents, their teachers, and one platform administrator. The product intent, stated on the landing page and in `admin.md`, is an accessible school companion for the Democratic Republic of Congo: courses, homework, live sessions, parent follow-up, games, and a paid tier.

The architecture is a **Vite + React 18 + TypeScript client** that talks **directly to Supabase** (Postgres with row-level security, Auth, Storage, Realtime, and six Deno edge functions). There is no application server in this repository. Stripe is wired for card checkout. Mobile money (M-Pesa, Orange Money, Airtel Money) is a simulated button. There is no school, class, or national-curriculum model. “Class” is a free-text field on a profile.

**Current state: an advanced prototype, not a production school platform.**

What is genuinely implemented in code and backed by tables:

- Email/password accounts for students and parents, with profile data collected on the signup form.
- Role-based dashboards (student, parent, teacher, admin) and a large set of dashboard routes.
- Courses, lessons, multiple-choice exercises, server-side answer checking, enrollments, and a client-side premium lock.
- Homework file upload, teacher grading, in-app notifications, and reminder SQL functions.
- Parent–child linking, a parent progress view, messaging, a forum, support tickets, and a dyslexia stylesheet toggle.
- Six browser games and a small accessibility toolbox. Game scores stay in the browser session.

What is not production-ready:

- Authorization can be skipped when the role has not loaded or has been deleted. See `ProtectedRoute`.
- Enrolled students can read `exercises.correct_answer` through the API, even though the UI uses a safer RPC.
- Points can be farmed: every correct retry inserts another `results` row, and badges sum every row.
- Homework grades can be self-assigned on insert. Stored homework file URLs point at a private bucket with a public URL, so opening the file is expected to fail.
- Stripe state is not kept honest: there is no webhook, cancellation does not downgrade the row that gates courses, and mobile money does not charge anyone.
- Creating a teacher from the admin screen uses the browser `signUp` API and can replace the admin session. The signup trigger refuses the teacher role and stores the new account as a student until a second update succeeds.
- The “assign teachers” admin page only lists teachers. Attendance exists in the database and has no screen. Game points, the points multiplier, and Lingala/Swahili UI strings are not implemented.
- The landing page advertises “10K+ learners” and “low bandwidth”. Those numbers are constants. The measured entry bundle is about **241 KB of gzipped JavaScript**, plus a **212 KB logo**, plus Google Fonts, and the grades page adds another **108 KB gzipped** for charts.

**Recommended roadmap, in dependency order (not a calendar):**

1. Close the authorization, answer-leak, homework-integrity, and secret-handling issues on the current stack. Do not start a rewrite first.
2. Make points, badges, homework files, and subscriptions tell the truth.
3. Add the missing school concepts (school, class, DRC level, subject programme) as new tables when the product requires them. Do not overload free-text fields forever.
4. Cut the first-load weight and stop depending on YouTube, Google Fonts, and always-on Realtime for core study.
5. Move the UI to Next.js only after the above, keeping this same Supabase project and its data. A big-bang rewrite would discard working RLS, triggers, and the only copy of the product behavior.

## What the product is

Mwalimu Mbuku (“teacher” + “book” in the product’s own branding) is aimed at learners who are poorly served by a standard classroom, including children with reading and attention difficulties. The in-app mission copy names dyslexia, dyscalculia, ADHD, and related needs, with the DRC called out explicitly.

The implemented product is a **single global platform**, not a multi-school system:

- Anyone can register as a student or a parent.
- Teachers and admins are supposed to be created by an administrator.
- Courses are global catalogs with a free-text subject and level (`beginner` by default), not a classe of 5e année primaire in a named school.
- Parents link to a child account with a student code, and can also store unstructured notes about children who may not have an account (`children_info`). Those two lists are not the same thing.

Two public URLs are hardcoded: `https://mwalimumbuku.vercel.app` (password-reset redirect in production) and `https://mwalimumbuku.lovable.app` (Stripe return fallback). `vercel.json` is a SPA rewrite to `index.html`.

## Repository shape

About 18,500 lines of TypeScript/TSX under `src/`, 37 SQL migrations, 6 edge functions, and a large shadcn/ui kit under `src/components/ui/` (generated primitives, not product logic).

Existing docs are not a specification:

- `README.md` is the Lovable template. The project URL is still `REPLACE_WITH_PROJECT_ID`.
- `.lovable/plan.md` is a past implementation plan for onboarding and admin pages. Parts of it shipped; the onboarding guard was later turned into a no-op.
- `admin.md` is an operator note. It names a personal mailbox as the sole administrator and describes admin powers that the database policies do not fully grant (forum moderation). It should be removed from the repository. This audit does not repeat that address.

## Technology snapshot

| Layer | Choice |
| --- | --- |
| UI | React 18, React Router 6, Tailwind, shadcn/Radix, Framer Motion, Recharts |
| Build | Vite 5, TypeScript 5.8 (`strict: false`), SWC |
| Server state | TanStack Query 5. The browser calls Supabase directly |
| Backend | Supabase Postgres 14 (per generated types), Auth, Storage, Realtime |
| Payments | Stripe Checkout + Customer Portal, via edge functions. Mobile money is a toast |
| Hosting of the UI | Vercel static SPA, and historically Lovable publish |
| Tests | Vitest + Testing Library installed; one placeholder test |
| Package managers | `package-lock.json`, `bun.lock`, and `bun.lockb` are all committed |

There is no Next.js, no custom API route layer, no ORM, no background worker in the repo (scheduling is `pg_cron` inside Postgres), and no PWA/service worker.

## User roles

The enum `app_role` is `student | parent | teacher | admin`. A user has one row in `user_roles` in practice (the client uses `maybeSingle()`). The table allows multiple roles per user (`UNIQUE (user_id, role)`), but the UI cannot represent that.

| Role | How the account is created | What the UI is for |
| --- | --- | --- |
| Student | Public signup. Trigger allows this role | Courses, exercises, homework, grades, games, toolbox, mood, forum, messages |
| Parent | Public signup. Trigger allows this role | Linked children, progress, static coaching tips, messages, forum |
| Teacher | Intended: admin creates the user. Public signup cannot select this role. The database trigger downgrades any other requested role to `student` | Own courses, exercises, grading, results, recommendations, live-session links |
| Admin | Not self-serve. `admin.md` describes a single operator. The trigger also refuses `admin` from signup metadata | Users, courses, announcements, settings, analytics, plus most teacher tools |

Authorization is enforced in two places that do not fully agree:

1. **Route guard** (`ProtectedRoute`) — client only. If `role` is `null`, a route that lists `allowedRoles` still renders. Nav items also fall back to the student menu when `role` is null, but the URL is not blocked.
2. **Row Level Security** — the real control, for users whose JWT is valid. Several policies are wider than the product rules. Details are in the database report.

`OnboardingGuard` is an empty wrapper. The comment in the file says onboarding is collected at signup, so the guard was disabled. The wizard routes still exist.

## Feature status at a glance

| Area | Status | Why |
| --- | --- | --- |
| Signup and login for student and parent | Functional in code | Auth + trigger + profile writes. Email-confirmation branch skips profile updates |
| Teacher and admin provisioning | Partial and fragile | Browser `signUp` from the admin page; role forced in a second call; no `teacher_profiles` row from the trigger |
| Courses, lessons, exercises | Functional in code | Create, publish, enroll, answer via `check_answer` |
| Premium courses | Partial | UI lock only. Lessons of published courses are readable by any logged-in user. Stripe can drift from `subscriptions` |
| Homework | Partial | Upload and grade screens exist. File URL and grade integrity are wrong |
| Live sessions | Partial | Schedule a URL. No video stack. Attendance table unused |
| Games and XP | Split | Exercises write points. Games do not. Points inflate on retakes. Badges are manual claims |
| Parent progress | Partial | `ChildrenPage` uses two queries and should work. `ChildProgress` embeds a relationship the generated schema does not have |
| Messaging and forum | Functional with weak rules | Any logged-in user can message any user id. Forum does not give admins a delete policy |
| Support tickets | Functional in code | Teachers can read every ticket. Attachments sit in a public bucket |
| Mobile money | Frontend-only | Explicit test-mode toast, no provider call |
| Offline / low bandwidth | Not implemented | Marketing claim only |
| Analytics | Partial | Four counts. Landing-page statistics are literals (`10K+`, `500+`, `98%`, `15+`) |

The full module list is in [FEATURES_AND_MODULES.md](FEATURES_AND_MODULES.md).

## Security posture (short)

The anon/publishable Supabase key is committed in `.env` and is not gitignored. That key is designed to ship in a browser, but together with the RLS gaps below it is enough to call the API as any signed-in user. This report does not copy the key, the admin mailbox, or Stripe secrets.

Highest-impact issues confirmed in source:

- Role bypass when `role` is null, including after an admin “delete” that removes `user_roles` but leaves `auth.users`.
- `correct_answer` is selectable by enrolled students.
- `check_answer` does not require enrollment, does not cap attempts, and compares answers with exact equality.
- Homework insert lets the student set `grade` and `status`.
- Notifications and payment-history inserts are allowed for any authenticated user (`WITH CHECK (true)`).
- Forum authors’ full profile rows (phone, address, date of birth, student code) are readable by any authenticated user.
- All six edge functions are deployed with `verify_jwt = false`. Each function checks a bearer token itself. CORS is `*`.
- `update-subscription` reads `SUPABASE_PUBLISHABLE_KEY`, which is not one of Supabase’s standard function secrets (`SUPABASE_ANON_KEY` is). Downgrade is **likely broken** in the hosted project unless that custom secret was added by hand. Not verified live.
- No Content-Security-Policy. Sessions live in `localStorage`.

## Performance and the DRC network

Measured production build:

| Asset | Size | Gzip |
| --- | ---: | ---: |
| `index-*.js` (shared entry, auth, landing) | 802 KB | 241 KB |
| `StudentGradesPage` (Recharts) | 391 KB | 108 KB |
| `CourseEditor` | 56 KB | 18 KB |
| `index-*.css` | 84 KB | 14 KB |
| `logo-*.png` | 212 KB | n/a (already compressed as PNG) |

Vite also warned that the entry chunk exceeds 500 KB. `index.html` loads two Google Font families (Space Grotesk and DM Sans) from `fonts.googleapis.com` before paint. There is no service worker, no lesson cache, and no responsive image pipeline.

On a congested mobile link this first load is a multi-megabyte experience once fonts, the logo, and a YouTube lesson embed are included. Messaging polls every 5 seconds and also subscribes to Realtime. Admin user management downloads every profile, role, enrollment, subscription, and result row into the browser.

## Data that must be preserved

If a migration to Next.js happens, the system of record stays the existing Supabase project:

- `auth.users` and `user_roles`
- `profiles` and the role profile tables (`student_profiles`, `parent_profiles`, `teacher_profiles`, `children_info`)
- `courses`, `lessons`, `exercises`, `course_enrollments`, `course_materials`, `assignments`, `homework_submissions`, `results`, `badges`, `user_badges`
- `parent_student`, `messages`, `forum_posts`, `forum_replies`, `notifications`
- `subscriptions`, `payment_history`, `renewal_history`
- `live_sessions`, `attendance`, `teacher_recommendations`, `support_*`, `platform_settings`, `daily_moods`
- Storage buckets: `avatars`, `homework-files`, `course-materials`, `support-files`

Do not replay migrations from an empty database onto the live project. They are history, and several of them drop and recreate policies. A fresh `supabase db reset` against production would destroy data.

## Recommended development roadmap

### Phase A — Make the current app safe to keep using

Stay on Vite. Fix RLS and the route guard. Stop trusting the client for grades, roles, and file URLs. Remove `admin.md` and stop tracking `.env`. Add a Stripe webhook before taking real payments. This phase is detailed as P0/P1 in the bugs report.

### Phase B — Make learning records honest

One attempt policy (or a best-score rule) for exercises. Persist nothing from games until there is a `game_sessions` table. Signed URLs for homework. Teacher creation through an admin-only edge function using the service role, not `supabase.auth.signUp` in the browser.

### Phase C — Shape it for Congolese schools

Schools, classes, and a level list that matches primaire/secondaire. Link a parent’s declared child to a real student account. Curriculum-shaped subjects instead of free text. French first, then Lingala and Swahili as real catalogs, not unused signup options. Payments that match how families pay (mobile money), after a real merchant integration.

### Phase D — Make it usable on a weak connection

Subset the entry bundle, self-host one font, compress the logo, defer charts, make YouTube optional, cache published lesson text, and drop the 5-second message poll where Realtime is connected.

### Phase E — Next.js, without a data migration

Incremental UI move onto the same Supabase project, described in [NEXTJS_MIGRATION_PLAN.md](NEXTJS_MIGRATION_PLAN.md). Do not start here.

## What this audit did not do

- It did not rewrite screens, change RLS, or run SQL against production.
- It did not create accounts or complete a purchase.
- It did not prove which migrations have actually been applied on the hosted project. The report describes the schema **if every file in `supabase/migrations/` has been applied in filename order**.
