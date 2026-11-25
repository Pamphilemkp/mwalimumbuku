# Mwalimu Mbuku — Bugs and Improvement Plan

The defects below were found in the Vite client and in Postgres policies. Moving the Next.js shell to the repository root did not fix them and did not change schema. The Vite files named here are at commit `8afba27b4f5a43b16aa231f8132bf696fcce1452`.

Audit date: 24 November 2026 (Asia/Nicosia).

Each item says whether it is **confirmed** (read in source or measured) or **likely** (follows from the source, not executed against the hosted project). No exploit steps are included. Fixes are described as outcomes, not as patches, because this audit does not change the application.

Priority:

- **P0** — a student, parent, or stranger with an account can see or forge another person’s academic or personal data, or can enter an admin route.
- **P1** — a core school workflow (homework file, grade, payment, teacher account) does not do what the screen says.
- **P2** — wrong totals, dead ends, or scale problems that will hurt a real class.
- **P3** — product gaps for the DRC and for a weak network. Necessary, not a hotfix.

## 1. P0 — Authorization and data exposure

### 1.1 Route guard ignores a missing role

**Confirmed.** `src/components/ProtectedRoute.tsx` only redirects when `allowedRoles` is set **and** `role` is non-null **and** the role is not in the list. `null` falls through.

`useAuth` sets `isReady` after a 4-second timeout even if `getUserRole` has not returned, and sets `role` to `null` when the query errors or returns no row.

Admin “delete user” removes `user_roles` and `profiles` and does not delete `auth.users` (`AdminUsers.tsx`). That account can sign in again with no role and open `/dashboard/users`, `/dashboard/settings`, and the other admin URLs. RLS still blocks most admin writes, so this is not full admin power. It does render admin screens and fire admin queries (those queries return empty or error). It is still a broken boundary, and it hides the failure from the operator who thinks the user is gone.

**Fix outcome:** treat a missing role as unauthorized. Redirect to a safe holding page. Delete users through an admin edge function that removes `auth.users` (cascade) inside a transaction. Never call `signUp` from an existing session.

### 1.2 Enrolled students can read correct answers

**Confirmed.** Policy “Enrolled students view exercises” is a `SELECT` on `exercises` with no column list. `correct_answer` is a normal column. The UI uses `get_lesson_exercises`, which hides it. The API does not.

An earlier migration dropped the open select. A later migration put a student select back. The final file is `20260308231918_...sql`.

**Fix outcome:** drop the student `SELECT` on `exercises`. Teachers and admins keep their policies. Students keep the RPC. Revoke direct `SELECT` on the base table from `authenticated` if a view is used, and do not grant the view to roles that should not see it.

### 1.3 Exercise grading ignores enrollment and can be repeated forever

**Confirmed.** `check_answer` requires a session, compares strings with `=`, and inserts a `results` row on every call. `get_lesson_exercises` returns questions for every published lesson to every logged-in user.

Effects:

- A user who has not paid and has not enrolled can still submit answers and collect points.
- The retake button in `CourseView` is an official way to stack points.
- `award_badge_if_eligible` and the progress/grades pages sum every row, so the stack becomes badges and “points totaux”.

Direct `INSERT` into `results` was closed on 8 March 2026 (`20260308105746_...sql`) and was not reopened. Forging a row without calling `check_answer` is **not** possible under the final policies. Farming through the RPC is.

**Fix outcome:** require an active enrollment (and premium, when the course says so) inside both functions. Store one row per user and exercise, or store attempts but award `MAX(points_earned)` in a single SQL view that every screen uses. Normalize answers (`trim`, case) in one place.

### 1.4 Homework grade and status are client-writable

**Confirmed.** “Students create own submissions” checks only `user_id`. `grade` and `status` have no constraint. The React form does not send them. The API accepts them.

**Fix outcome:** insert policy (or a definer function) forces `grade` null and `status = 'pending'`. Teacher update policy may set grade and comment and must not be usable by the student. Add a check `grade between 0 and 100`.

### 1.5 Forum participation exposes the whole profile

**Confirmed.** Policy “Forum participants view profiles” is true for any profile that owns any post or reply, for any authenticated caller. `profiles` includes phone, address, date of birth, and student code.

**Fix outcome:** remove that policy. Expose a `public_profiles` view with `user_id` and `full_name` only, and use it for forum and message labels.

### 1.6 Anyone can insert notifications and payment rows

**Confirmed.**

- `notifications` insert: `WITH CHECK (true)`.
- `payment_history` insert: `WITH CHECK (true)`.

Payment inserts do not flip `subscriptions.tier` (the trigger only writes notifications). They do create fake receipts and can notify an arbitrary user. Notification inserts can address any `user_id`.

**Fix outcome:** drop both policies. Admin announcements go through a `SECURITY DEFINER` function that checks `has_role(..., 'admin')` and inserts the fan-out on the server. Stripe writes payments from a webhook using the service role.

### 1.7 Privileged account notes and the publishable key are in git

**Confirmed.** `.env` is tracked and is not in `.gitignore`. It holds the Supabase URL, project id, and publishable key. `admin.md` names a personal mailbox as the only administrator. This audit does not repeat either value.

The publishable key is intended for browsers. It becomes an attack credential while sections 1.2–1.6 stand. The mailbox in `admin.md` is a targeting aid (password reset against a known admin).

**Fix outcome:** stop tracking `.env`, add it to `.gitignore`, and scrub it from history if the remote was ever public. Remove `admin.md`. Prefer a hosted secret store for local dev. Rotating the publishable key is warranted if the repository has been shared; the service role was not in the file that was inspected (only the three `VITE_` names).

### 1.8 Edge functions do not verify JWT at the gateway

**Confirmed.** `supabase/config.toml` sets `verify_jwt = false` for all six functions. Each function checks the bearer token in code. `update-subscription` authenticates with `SUPABASE_PUBLISHABLE_KEY`, which is not a default Supabase function secret. **Likely** the downgrade call fails in production until that secret is created by hand. Not invoked live.

`notify-enrollment` uses the service role and inserts parent messages for any authenticated caller, with no enrollment check and no rate limit. `exercise_id` is unused. Repeated calls spam parents.

`create-checkout` trusts the `Origin` header for the return URL.

**Fix outcome:** turn gateway JWT verification on, keep the in-function check, allow-list return origins, and require enrollment inside `notify-enrollment` or delete the function and use the existing notification triggers.

### 1.9 Support and course files are world-readable if the URL leaks

**Confirmed.** Buckets `course-materials` and `support-files` are created with `public = true`. Teachers can `SELECT` every support ticket, including subscription and parent-guidance categories.

**Fix outcome:** private buckets, signed URLs with short expiry, and a staff policy that is admin-only for tickets outside the teacher’s own students.

### 1.10 Received messages can be rewritten

**Confirmed.** `messages` update policy is `USING (auth.uid() = receiver_id)` with no column restriction. Mark-as-read uses this policy. The same policy allows the receiver to change `content`.

**Fix outcome:** a definer function that sets `is_read` only, or a policy that cannot be satisfied unless `content` is unchanged. Postgres RLS cannot express column lists; a function is the straightforward fix.

## 2. P1 — Workflows that do not complete

### 2.1 Homework files cannot be opened

**Confirmed in code.** `HomeworkUpload` saves `getPublicUrl()` for bucket `homework-files`, created as private. The teacher grading screen will link to a URL that storage should reject.

**Likely user-visible bug:** “submit succeeded” and then neither party can download. Not clicked through against the live bucket.

**Fix outcome:** store the object path, not a public URL. Teachers and the owning student request a signed URL from an edge function (or from the client, if the storage select policy already allows that user). The existing teacher policy matches on filename text; replace it with a path convention `{teacherId}` is the wrong owner — the folder is the student id — so the teacher policy must join `homework_submissions` on the object name explicitly and should be tested with one real file.

### 2.2 Teacher creation can log the admin out and leave a student account

**Confirmed code path.** `AdminUsers` calls `supabase.auth.signUp` while the admin is logged in, then updates `user_roles`. Supabase returns a session when email confirmation is disabled and the client will adopt it. The trigger has already stored the new person as `student`. The role update then runs with the new user’s JWT and fails the admin policy.

**Not verified:** the live Auth “confirm email” switch. If confirmation is on, the admin session survives and the role update can succeed, but `teacher_profiles` is still missing and the new teacher is not sent through onboarding.

**Fix outcome:** one admin-only edge function: service role `auth.admin.createUser`, insert role `teacher`, insert `teacher_profiles`, do not touch the caller’s session. Send the teacher an invite link.

### 2.3 Child progress embed does not match the schema

**Confirmed mismatch.** `ChildProgress.tsx` and `ParentRolePage.tsx` embed `profiles` through `parent_student_student_id_fkey`. That foreign key points at `auth.users`. `types.ts` shows no relationship from `parent_student` to `profiles`.

**Likely:** the page errors or renders no children. `ChildrenPage.tsx` loads profiles in a second query and should work. Not executed live.

**Fix outcome:** use the two-query pattern already in `ChildrenPage`. Add a real FK from `parent_student.student_id` to `profiles.user_id` only if you want embeds later; do not add it casually if existing orphan ids would violate it.

### 2.4 Student codes in the UI do not match generated codes

**Confirmed.** Trigger writes 8 digits. Placeholders and help text say `STU-...`. Admin link and course enroll search use equality on `student_code`. A parent who types the hint format will get “student not found”.

**Fix outcome:** show the real code on the student profile, search on that exact value, and add a unique index after deduplicating.

### 2.5 Premium access does not follow Stripe

**Confirmed.**

- No webhook function in the repo.
- `check-subscription` writes premium when Stripe is active and does nothing when it is not.
- `isPremium()` ignores `expires_at`.
- `CourseView` trusts the table, not the Stripe response.
- `update-subscription` sets the table to free and does not cancel Stripe.
- Mobile money shows a test-mode toast and writes nothing (`submitMobileMoney` in `SubscriptionPage.tsx`).
- `payment_history` and `renewal_history` have no writer in the application code.

**Fix outcome:** a signed Stripe webhook is the only writer of `tier`, `is_active`, `expires_at`, and payment rows. The course gate reads a single SQL function `has_active_premium(uid)` that checks tier, flag, and expiry. Remove the mobile-money button until a provider exists, so families are not told a test payment did something.

### 2.6 Onboarding is both required and disabled

**Confirmed.** Signup sets `onboarding_completed` only when a session exists. The guard is a no-op (`OnboardingGuard.tsx` comment: “Kept as a pass-through”). Wizard routes still exist. Teachers never enter `TeacherOnboarding` on the admin-create path.

**Fix outcome:** pick one. Either delete the wizard routes or, after admin creates a teacher, set `onboarding_completed` false and send them to the wizard once. Do not keep both stories.

### 2.7 Badge claim does not refresh

**Confirmed.** `BadgesPage` invalidates `['user-badges']`. `useUserBadges` uses `['badges', 'user', userId]`. No badges are seeded in SQL, and no admin screen creates them.

**Fix outcome:** one query key, and an admin form for the badge catalog (or a seed migration). Award from the server when points cross the threshold so students do not have to find a claim button.

### 2.8 Assign-teachers page does not assign

**Confirmed.** `AdminAssignTeacherPage.tsx` is a read-only list. The nav label promises an assignment action.

**Fix outcome:** rename it to “Teachers” until an assignment model exists, or build the action against a real class entity (Phase C). Do not pretend `course_enrollments` is a class assignment.

### 2.9 Recommendations are written and not shown

**Confirmed.** `TeacherStudentsPage` inserts `teacher_recommendations`. No parent or student page selects that table. `ParentRolePage` reads `children_info` and recent messages instead.

**Fix outcome:** show the rows on the student home and the parent child page. Until then, teachers believe a parent has been advised.

### 2.10 Parent cannot unlink a child

**Confirmed.** No parent `DELETE` policy on `parent_student`.

**Fix outcome:** parent delete of own link, after a confirm step.

## 3. P2 — Correctness, performance, scale

### 3.1 Duplicate and unbounded reads

**Confirmed.**

- `AdminUsers` downloads profiles, roles, links, enrollments, subscriptions, and every result.
- `CourseBrowser` counts enrollments in the client from an unfiltered `select('course_id')`. RLS hides other people’s rows, so a student sees 1 or 0, not the real class size. An admin does download every enrollment.
- `TeacherResults` chains five queries and holds all matching results.
- Admin announcements insert one row per user from the browser.

**Fix outcome:** `count` queries and grouped SQL (`enrollment_counts` view). Paginate admin users on the server (`range`). Announcements become one row plus an audience, not N inserts, or they stay N but run in a function.

### 3.2 Missing indexes on the paths those screens use

**Confirmed absent** from migrations: indexes on `results(user_id)`, `results(exercise_id)`, `course_enrollments(user_id)`, `course_enrollments(course_id)`, `messages(sender_id)`, `messages(receiver_id)`, `notifications(user_id, created_at)`, `exercises(lesson_id)`, `lessons(course_id)`, `profiles(student_code)`.

**Fix outcome:** add them in a forward migration. Deduplicate enrollments before adding `UNIQUE (course_id, user_id)`.

### 3.3 Messages poll every 5 seconds and subscribe to Realtime

**Confirmed.** `MessagesPage.tsx` `refetchInterval: 5000` plus a channel on `messages` INSERT.

**Fix outcome:** Realtime only, with a slow fallback when the socket is down. Do not run both on a metered radio.

### 3.4 Live session policy does not tie the teacher to the course

**Confirmed.** Insert check is `teacher_id = auth.uid()` only. `course_id` is not validated against `courses.teacher_id`.

**Fix outcome:** `WITH CHECK` includes ownership of the course (or admin).

### 3.5 Orphans and weak constraints

**Confirmed** from `CREATE TABLE` statements:

- `course_materials`, `live_sessions`, `notifications`, `homework_submissions.user_id`, `payment_history.user_id` have no foreign key to `auth.users` or `courses` where the column implies one.
- `student_profiles`, `parent_profiles`, `teacher_profiles`, `children_info` are not declared `REFERENCES auth.users ON DELETE CASCADE`.
- `student_code` is not unique.
- `(course_id, user_id)` on enrollments is not unique.
- Homework status is free text.

Admin course delete therefore leaves materials and live sessions behind.

**Fix outcome:** add FKs after a cleanup query. This is a schema change; do it in its own migration, not as part of a UI rewrite.

### 3.6 TypeScript is not guarding the loose edges

**Confirmed.** `strict` and `noImplicitAny` are false. `tsc --noEmit` still exits 0, which only means the loose project typechecks. Several screens use `as any` for tables that are now in `types.ts`.

**Fix outcome:** turn `strict` on in a dedicated pass and fix the fallout before the Next.js move, so the move does not mix type repairs with framework repairs.

### 3.7 Tests do not protect behavior

**Confirmed.** `src/test/example.test.ts` asserts `true`. `npm test` passes that single test. There is no RLS test, no Playwright script, and no CI workflow in the repo.

**Fix outcome:** a small SQL test (or pgTAP) for `check_answer`, role trigger, and the homework insert policy, plus one browser test for login once a staging project exists. Do not point tests at production.

### 3.8 Dependency advisories

**Confirmed** by `npm audit` on 24 November 2026: 29 advisories, 2 critical, 19 high. The critical items are Vitest and tinypool (dev server / test runner), not the production bundle. `react-router-dom` 6.30 is in the production bundle and is listed as high (open redirect / XSS via redirects). Vite, Rollup, and PostCSS highs affect the build toolchain.

**Fix outcome:** upgrade React Router to a patched 6.x, and upgrade Vite/Vitest in the same maintenance window. Re-run the production build and the placeholder test. Do not treat `npm audit fix --force` as safe; it will jump major versions.

### 3.9 Inconsistent copy and locale

**Confirmed.** `ChildProgress` is English. Homework and live sessions are French. The catalog is `fr`/`en`. Signup offers `sw` and `ln` and stores them. `date-fns` French locale is hardcoded on student homework and grades, so an English UI still formats dates in French.

**Fix outcome:** one language rule per screen. Do not advertise Lingala and Swahili until the catalogs exist.

## 4. P3 — Low-bandwidth DRC

Measured with `npm run build` on this audit:

| Piece | Raw | Gzip | When it downloads |
| --- | ---: | ---: | --- |
| Entry JS | 802 KB | 241 KB | Every first visit, including login |
| Grades page | 391 KB | 108 KB | First open of grades |
| CSS | 84 KB | 14 KB | First visit |
| Logo PNG | 212 KB | n/a | First visit, imported from `src/assets/logo.png` |
| Google Fonts | external | external | Render-blocking `@import` in `src/index.css` (Space Grotesk and DM Sans, several weights) |

Vite printed the 500 KB chunk warning. There is no service worker, no `precache`, and no `Cache-Control` in `vercel.json`.

Other confirmed costs:

- YouTube iframes in lessons (`CourseView`) pull a third-party player. A lesson that is a video is unusable on a bad link, and there is no text fallback required by the editor.
- Framer Motion wraps landing, games, and most dashboards.
- Recharts is the grades chunk. A table of numbers would do the same job.
- Realtime plus 5-second polling (section 3.3).
- `SupportWidget` calls `useTickets` for every authenticated page, including ones that are not support.
- Landing statistics and “low bandwidth” / “offline access” copy are not backed by code. Premium features in `translations.ts` list offline and AI tutoring as “coming soon”.

What already helps, and should be kept:

- Route-level `React.lazy` for dashboard pages.
- React Query `staleTime` of 2 minutes and `refetchOnWindowFocus: false`.
- Games are local once loaded.
- Lesson text is plain content, not a video requirement.
- Admin analytics uses `count` with `head: true`.

**Fix outcome, in order of bytes saved:**

1. Move the logo to a small SVG or a compressed WebP under 20 KB. 212 KB for a nav icon is the single easiest win.
2. Self-host one font weight, or use a system stack (`ui-sans-serif`). Drop the Google `@import`.
3. Keep landing, login, and signup out of the shared client graph. They are currently static imports in `App.tsx`, which is why they sit in the 241 KB gzip entry.
4. Replace the grades chart with the numbers already on the page, or dynamically import Recharts only when the chart scrolls into view.
5. Make video URLs collapsible and off by default. Store a transcript in `lessons.content`.
6. Cache published lesson JSON aggressively (short `staleTime` is already a start; HTTP caching of a public lesson endpoint comes with Next.js or with a CDN in front of storage).
7. Add a real offline pack only after lesson content is stable: a service worker that caches the shell and the last opened lesson text. Do not promise this on the pricing card until it exists.

Target for a first meaningful visit on a slow phone: HTML + CSS + JS + logo under **150 KB gzipped**, no third-party font, no video until the learner asks. The current entry alone is already over that target.

### Devices and input

Confirmed from the forms, not from a device lab:

- Signup is one long page with many required fields (phone, city, school, class). On a small screen this is a single scroll with no step save if email confirmation discards the profile write.
- Password auth assumes an email inbox. There is no phone OTP.
- Several hit targets are icon buttons in the 16 px header. The sidebar becomes a drawer under `lg`, which is the right pattern.
- Dyslexia mode only tweaks CSS on `body`. It is real and small. It does not change lesson line length or offer a readable font file (OpenDyslexic is not bundled).

## 5. Product gaps to schedule after the fixes

These are not bugs in existing code. They are the difference between this prototype and a school platform. Do them after P0 and P1, because a new module on top of forgeable grades will not be trusted.

1. **School and class.** A `schools` row, a `classes` row (year, niveau), and membership. Courses belong to a class or to a public library, not only to “whoever clicked create”.
2. **Niveau and subject lists** aligned with primaire and secondaire, instead of `level default 'beginner'` and free-text subject.
3. **One learning record.** A SQL view `student_progress` that outputs best exercise score, homework grade, and (later) game score. Delete the three client-side sums.
4. **Games that count, or games that do not pretend to.** Either persist `game_sessions` with server-side checks, or remove the session trophy from anything that looks like a grade. The current math game checks the answer in the browser; those points must not enter `results` without a server check.
5. **Attendance UI** on top of the existing table, with the policy fixed so the session belongs to the course.
6. **Report for the parent** that uses `parent_student` only (not `children_info`) and shows recommendations, attendance, and the progress view.
7. **Mobile money** only with a real aggregator, server-side verification, and the same webhook discipline as Stripe. Until then, keep the button off.
8. **Phone login** as a first-class method if email is the drop-off observed in the field. This is an Auth configuration plus UI change, not a Next.js change.
9. **Age and consent.** If date of birth says the student is a child, require a linked parent before the account can enroll. This is a product and legal decision; the column is already there and unused.
10. **Audit log** for role changes, deletes, grade changes, and subscription writes.

## 6. Suggested sequence

The order is by dependency. It is not a staffing estimate.

| Step | Outcome | Touches |
| --- | --- | --- |
| A1 | Role guard fails closed. User delete goes through Auth admin API | `ProtectedRoute`, one edge function |
| A2 | Drop student `SELECT` on `exercises`. Tighten `check_answer` and `get_lesson_exercises` | New SQL migration |
| A3 | Homework insert cannot set grade. Signed file URLs | SQL + `HomeworkUpload` |
| A4 | Remove open inserts on notifications and payments. Forum profile view | SQL |
| A5 | Private buckets for materials and support. Teacher ticket scope | SQL storage policies |
| A6 | Untrack `.env`, remove `admin.md`, turn on function JWT verification | Config, git history |
| B1 | Stripe webhook, single premium predicate, hide mobile-money test mode | New function, subscription page |
| B2 | Teacher provisioning via service role, teacher profile row | New function, retire browser `signUp` |
| B3 | Fix child-progress queries, student code display, badge query key, recommendations list | React only |
| B4 | Best-score view, indexes, stop double message fetch | SQL + React |
| C | School/class model, progress view, attendance UI, parent report | New tables, new screens |
| D | Bundle diet in section 4 | Vite/React, no schema |
| E | Next.js incremental move | [NEXTJS_MIGRATION_PLAN.md](NEXTJS_MIGRATION_PLAN.md) |

Steps A and B should land on the current Vite app. Moving to Next.js first would transplant every P0 bug into a second codebase.

## 7. What not to do

- Do not reset the Supabase database to “match” the migrations. They are history.
- Do not turn off RLS to make the admin screens easier.
- Do not put the service role in `VITE_` variables or in the browser.
- Do not add game points into `results` until the server, not the browser, decides the score.
- Do not start Lingala/Swahili translations as a side effect of a framework upgrade. Ship French correctly first.
- Do not build an AI tutor (the pricing card mentions it) on top of exercises whose answers are readable.
