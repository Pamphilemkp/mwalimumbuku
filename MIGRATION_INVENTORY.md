# Mwalimu Mbuku — migration inventory

Phase 1 of the root Next.js transformation. Commit this inventory describes: the working tree after the Vite application was removed and the Next.js app that lived in `apps/web` became the repository root.

Recovery commit for every file that this phase did not port:

`8afba27b4f5a43b16aa231f8132bf696fcce1452` (`Add Next.js slice 0 foundation in apps/web (#2)`)

Show a file from that commit with:

```bash
git show 8afba27b4f5a43b16aa231f8132bf696fcce1452:PATH
```

Nothing in this phase changes Supabase schema or data. Nothing here claims official DRC curriculum compliance. The product does not model the national programme, and this move does not add that claim.

## Migrated in this phase

The runnable application is the Next.js 16.4.6 App Router app at the repository root (`package.json`, `app/`, `next.config.ts`, `proxy.ts`). It is the slice that was in `apps/web` at the recovery commit, moved here and hardened. It is not a port of the Vite screens.

| Behavior | Where it lives now |
| --- | --- |
| Password sign-in | `app/(auth)/login/page.tsx`, `features/auth/login-form.tsx` |
| Cookie session (`@supabase/ssr`, `getAll` / `setAll`) | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `proxy.ts` |
| Public env reads, literal `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `lib/supabase/env.ts` |
| Session refresh and anonymous redirect off `/dashboard` and `/holding` | `proxy.ts` (`proxy()`, not `middleware.ts`) |
| `Cache-Control: private, no-store` on proxy responses, including anonymous redirects | `lib/http/security-headers.ts`, `proxy.ts` |
| Baseline security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`) | `lib/http/security-headers.ts`, `next.config.ts`, `proxy.ts` |
| Cookie `Secure` in production, `httpOnly: false` | `lib/supabase/cookie-options.ts` |
| Independent user check (`auth.getClaims`) and role read from `user_roles` | `services/auth/session.ts`, `services/auth/get-role.ts` |
| Fail closed: missing, duplicate, invalid, or failed role lookup goes to `/holding`; no session goes to `/login` | `services/auth/auth-gate.ts`, `app/(app)/layout.tsx`, `app/(app)/dashboard/page.tsx`, `app/(app)/holding/page.tsx` |
| Sign-out stays on the page when it fails, and goes to `/login` only after success | `features/auth/sign-out.ts`, `features/auth/logout-button.tsx` |
| Signed-in shell that shows role, name, and email | `app/(app)/dashboard/page.tsx` |
| Holding copy for a signed-in account that cannot open the dashboard | `features/auth/holding-view.tsx` |
| Home redirects by the same gate | `app/page.tsx` |

Roles stay `student`, `parent`, `teacher`, and `admin`. There is no public teacher or admin registration in this app. There is no `lib/supabase/admin.ts`.

React and `react-dom` are pinned to 19.2.9. `@types/react` is 19.2.9. `@types/react-dom` is 19.2.7, the latest published 19.2 line (there is no 19.2.9 types package for `react-dom`). `next` and `eslint-config-next` stay at 16.4.6.

## Preserved in place

These paths were not rewritten:

| Path | What it is |
| --- | --- |
| `supabase/migrations/` | SQL migrations. Not modified. Not replayed. |
| `supabase/functions/check-subscription/index.ts` | Stripe subscription check. Still a Deno function. |
| `supabase/functions/create-checkout/index.ts` | Stripe Checkout. Still a Deno function. |
| `supabase/functions/customer-portal/index.ts` | Stripe billing portal. Still a Deno function. |
| `supabase/functions/notify-enrollment/index.ts` | Parent message on enrollment. Still a Deno function. |
| `supabase/functions/update-subscription/index.ts` | Client-triggered downgrade to free. Still a Deno function. |
| `supabase/functions/validate-teacher-code/index.ts` | Teacher code check. No UI calls it. Still a Deno function. |
| `supabase/config.toml` | Function gateway config. Not modified. |
| `public/favicon.ico`, `public/placeholder.svg`, `public/robots.txt` | Static files kept from the Vite `public/` directory. |
| `public/logo.png` | Product logo, copied from `src/assets/logo.png` at the recovery commit. |
| `FEATURES_AND_MODULES.md`, `DATABASE_AND_BACKEND_AUDIT.md`, `BUGS_AND_IMPROVEMENT_PLAN.md`, `PROJECT_OVERVIEW.md`, `NEXTJS_MIGRATION_PLAN.md` | Audit and plan. Updated only so they point at this root app. |
| `admin.md`, `.lovable/plan.md` | Left unchanged. |

Edge functions are not moved into Next.js route handlers in this phase. Later payment work can replace `check-subscription` and `update-subscription` with a signed Stripe webhook, either as a Next route handler or as a kept Deno function. That replacement is not part of phase 1. Do not put a privileged key in browser code when it happens.

## Removed from the working tree

The Vite application is not runnable from this branch. There is no `vite.config.ts`, no Vite dependency in `package.json`, no `src/`, no `apps/web`, and no `vercel.json` rewrite to `index.html`. `npm run dev` starts Next.js. The root `vercel.json` sets `"framework": "nextjs"`.

Also removed, and still present at the recovery commit:

| Path at 8afba27 | Why it went |
| --- | --- |
| `index.html` | Vite SPA shell |
| `vite.config.ts` | Vite dev server, port 8080, `@` alias, lovable-tagger |
| `vitest.config.ts` | Vite test runner config |
| `eslint.config.js` | Vite ESLint flat config |
| `postcss.config.js` | Vite PostCSS config. The root app uses `postcss.config.mjs`. |
| `tailwind.config.ts` (root, old) | Vite Tailwind content paths. Replaced by the Next app Tailwind config. |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | Vite TypeScript projects. Replaced by the Next `tsconfig.json`. |
| `components.json` | shadcn config for the Vite tree |
| `package.json`, `package-lock.json` | Vite package `vite_react_shadcn_ts`. Replaced by one Next package and one npm lockfile. |
| `bun.lock`, `bun.lockb` | Second lockfile from the Lovable/Bun era |
| `vercel.json` rewrite `/(.*) -> /index.html` | SPA fallback. Replaced by the Next framework config. |
| `apps/web/**` | The Next slice. Its source now lives at the repository root, not in a second app. |
| `src/**` | Vite UI. Recover file by file from the recovery commit. The feature table below names each one. |

`src/test/example.test.ts` and `src/test/setup.ts` were a placeholder (`true === true`). They were not ported. The root app tests cover the auth gate, role resolution, sign-out, env access, cookie flags, proxy headers, and the toolchain boundary.

## Not yet migrated

Each row is still only in git at the recovery commit. The later path is how to bring it into this Next app. Until that port, do not recreate a second runnable Vite app beside the root.

Shared rules for every port below:

1. Recover the file with `git show 8afba27b4f5a43b16aa231f8132bf696fcce1452:<path>`.
2. Put the screen under the App Router path in the table. One route lives in this app only.
3. Keep the `(app)` layout gate, and repeat `loadAppSession` plus `decideAuthGate` inside the page. `proxy.ts` is not enough.
4. Call Postgres with the user cookie client (`lib/supabase/server.ts` or `lib/supabase/client.ts`). Do not add `lib/supabase/admin.ts`.
5. Do not add roles other than `student`, `parent`, `teacher`, and `admin`.
6. Do not add a public teacher or admin registration form. The Vite signup already limits the form to student and parent; keep that limit.
7. Do not change SQL unless the work is an explicit, reviewed migration. This inventory is not that migration.
8. Client components are for forms, Realtime, speech, and games. Prefer a server component when the screen only reads.

### Public site

| Feature | Source at 8afba27 | Later path |
| --- | --- | --- |
| Landing page | `src/pages/Index.tsx`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/App.css` | Replace the session-only `app/page.tsx` redirect with a server-rendered landing, and redirect a signed-in visitor with `decideAuthGate`. Do not copy the Vite entry or `BrowserRouter`. |
| Mission | `src/pages/Mission.tsx` | `app/mission/page.tsx` as a server component. |
| In-app docs | `src/pages/dashboard/DocsPage.tsx` | `app/(app)/dashboard/docs/page.tsx`. |
| Not found | `src/pages/NotFound.tsx` | `app/not-found.tsx`. |

### Identity, profile, and onboarding

| Feature | Source at 8afba27 | Later path |
| --- | --- | --- |
| Signup (student and parent only) | `src/pages/Signup.tsx`, `src/lib/auth.ts` (`signUp`) | `app/(auth)/signup/page.tsx`. Send the same `full_name` and `role` metadata `handle_new_user` expects. Offer only `student` and `parent`. Do not add teacher or admin self-serve. Do not hardcode the production domain in a new redirect; use the request origin. |
| Forgot password | `src/pages/ForgotPassword.tsx`, `src/lib/auth.ts` (`resetPassword`) | `app/(auth)/forgot-password/page.tsx`. |
| Reset password | `src/pages/ResetPassword.tsx` | `app/(auth)/reset-password/page.tsx`. |
| Vite login | `src/pages/Login.tsx`, `src/lib/auth.ts` (`signIn`) | Already replaced by the root login. Do not port `localStorage` from `src/integrations/supabase/client.ts` or `src/hooks/useAuth.tsx`. |
| Vite sign-out | `src/lib/auth.ts` (`signOut`), `src/hooks/useAuth.tsx` | Already replaced. Do not port `window.__queryClient`. |
| Role lookup that treats a missing role as usable | `src/lib/auth.ts` (`getUserRole` uses `maybeSingle`), `src/components/ProtectedRoute.tsx` | Do not port. The root `resolveRole` fails closed on missing, duplicate, invalid, and error. |
| Profile and dyslexia class | `src/pages/dashboard/ProfilePage.tsx`, dyslexia rules in `src/index.css` | `app/(app)/dashboard/profile/page.tsx`. |
| Onboarding wizards | `src/pages/onboarding/OnboardingRouter.tsx`, `src/pages/onboarding/StudentOnboarding.tsx`, `src/pages/onboarding/ParentOnboarding.tsx`, `src/pages/onboarding/TeacherOnboarding.tsx`, `src/pages/dashboard/OnboardingPage.tsx`, `src/components/OnboardingGuard.tsx`, `src/components/OnboardingWizard.tsx`, `src/hooks/useOnboarding.ts` | `app/onboarding/[role]/page.tsx` and `app/(app)/dashboard/onboarding/page.tsx`. Keep the wizard from opening a dashboard when the role resolution is not `ok`. |
| Admin user management | `src/pages/dashboard/AdminUsers.tsx` | `app/(app)/dashboard/users/page.tsx`, allowed role `admin` only, checked in the page. |
| Assign teachers | `src/pages/dashboard/AdminAssignTeacherPage.tsx` | `app/(app)/dashboard/assign-teachers/page.tsx`, admin only. The page does not assign today; fix the action in that port, do not copy the dead control as if it worked. |
| Platform settings | `src/pages/dashboard/AdminSettingsPage.tsx`, `src/hooks/usePlatformSettings.ts` | `app/(app)/dashboard/settings/page.tsx`, admin only. |
| Password strength widget | `src/components/PasswordStrength.tsx` | Use it from the signup form when that form is ported. |
| Avatar upload | `src/components/AvatarUpload.tsx` | Use it from the profile page. Bucket `avatars` stays. |
| Language switcher and catalogs | `src/i18n/LanguageContext.tsx`, `src/i18n/translations.ts`, `src/components/LanguageSwitcher.tsx` | Client provider in the root layout when a ported screen needs it. Default `fr`. Do not add Lingala or Swahili UI in that port; those codes exist only as profile values. |
| Generated browser client and types | `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts` | Copy `types.ts` to `lib/supabase/types.ts` when a screen needs the generated `Database` type. Do not copy `client.ts`. |

### Courses

| Feature | Source at 8afba27 | Later path |
| --- | --- | --- |
| Catalog | `src/pages/dashboard/CourseBrowser.tsx`, `src/hooks/useCourses.ts` | `app/(app)/dashboard/courses/page.tsx`. Read `courses` with the user cookie. |
| Course player | `src/pages/dashboard/CourseView.tsx`, `src/hooks/useCourses.ts` | `app/(app)/dashboard/courses/[courseId]/page.tsx`. Keep grading in the `check_answer` RPC and lesson reads in `get_lesson_exercises`. Do not reimplement grading in TypeScript. |
| Teacher course list | `src/pages/dashboard/TeacherCourses.tsx` | `app/(app)/dashboard/my-courses/page.tsx`, roles `teacher` and `admin`. |
| Create course | `src/pages/dashboard/CreateCourse.tsx` | `app/(app)/dashboard/create-course/page.tsx`, roles `teacher` and `admin`. |
| Course editor and materials | `src/pages/dashboard/CourseEditor.tsx`, `src/components/CourseMaterialsSection.tsx` | `app/(app)/dashboard/courses/[courseId]/edit/page.tsx`. Bucket `course-materials` stays. |
| Admin course moderation | `src/pages/dashboard/AdminCourses.tsx` | `app/(app)/dashboard/manage-courses/page.tsx`, role `admin`. |

### Homework, assessments, grades, and XP

| Feature | Source at 8afba27 | Later path |
| --- | --- | --- |
| Student homework | `src/pages/dashboard/StudentAssignmentsPage.tsx`, `src/components/StudentAssignments.tsx`, `src/components/HomeworkUpload.tsx` | `app/(app)/dashboard/assignments/page.tsx`, role `student`. Bucket `homework-files` is private. Do not store a public URL as the way to open a file; sign a download on the server with the user cookie when this is ported. |
| Teacher grading | `src/pages/dashboard/TeacherSubmissionsPage.tsx` | `app/(app)/dashboard/submissions/page.tsx`, roles `teacher` and `admin`. The known client-writable grade problem is in Postgres policies (see `BUGS_AND_IMPROVEMENT_PLAN.md`). A UI port does not fix it. A later SQL migration has to. |
| Student grades | `src/pages/dashboard/StudentGradesPage.tsx` | `app/(app)/dashboard/grades/page.tsx`, role `student`. Do not pull Recharts into the first paint; the Vite page did. |
| Teacher results | `src/pages/dashboard/TeacherResults.tsx` | `app/(app)/dashboard/results/page.tsx`, roles `teacher` and `admin`. |
| Progress | `src/pages/dashboard/ProgressPage.tsx` | `app/(app)/dashboard/progress/page.tsx`. |
| Badges | `src/pages/dashboard/BadgesPage.tsx` | `app/(app)/dashboard/badges/page.tsx`. Keep `award_badge_if_eligible` in Postgres. |
| XP / points | No `xp` table. Sums of `results.points_earned` are computed in `src/pages/dashboard/ProgressPage.tsx`, `src/pages/dashboard/BadgesPage.tsx`, and `src/pages/dashboard/StudentGradesPage.tsx` | When those three pages are ported, use one shared read of `results.points_earned`. Do not add an XP table in that port. |

### Games

Frontend-only session scores. Not a learning record and not a curriculum.

| Feature | Source at 8afba27 | Later path |
| --- | --- | --- |
| Games page | `src/pages/dashboard/GamesPage.tsx` | `app/(app)/dashboard/games/page.tsx` as a client component. |
| Memory | `src/components/games/MemoryGame.tsx` | Client component imported by the games page. |
| Word scramble | `src/components/games/WordScrambleGame.tsx` | Same. |
| Math | `src/components/games/MathGame.tsx` | Same. |
| Alphabet | `src/components/games/AlphabetGame.tsx` | Same. |
| Color match | `src/components/games/ColorMatchGame.tsx` | Same. |
| Typing | `src/components/games/TypingGame.tsx` | Same. |
| Difficulty, timer, types | `src/components/games/DifficultySelector.tsx`, `src/components/games/GameTimer.tsx`, `src/components/games/types.ts` | Same. Timer defaults still come from `game_settings` when that read is ported. `points_multiplier` is stored and unused; do not pretend it scores the games. |

### Toolbox

| Feature | Source at 8afba27 | Later path |
| --- | --- | --- |
| Toolbox page | `src/pages/dashboard/ToolboxPage.tsx` | `app/(app)/dashboard/toolbox/page.tsx`, client component. |
| Vocal calculator | `src/components/VocalCalculator.tsx` | Client child of the toolbox page. |
| Spell checker | `src/components/SpellChecker.tsx` | Same. |
| Speech to text | `src/components/SpeechToText.tsx` | Same. |
| Text to speech | `src/components/TextToSpeech.tsx` | Same. |
| Audio recorder | `src/components/AudioRecorder.tsx` | Same. The blob stays in memory. Do not upload it as part of the port. |

### Live class and attendance

| Feature | Source at 8afba27 | Later path |
| --- | --- | --- |
| Live sessions | `src/pages/dashboard/TeacherLiveSessionsPage.tsx` | `app/(app)/dashboard/live-sessions/page.tsx`. Roles on the Vite route were teacher, admin, student, and parent. Keep that allow-list in the page, not only in a menu. |
| Attendance | No page. Table `attendance` is created in `supabase/migrations/`. Statuses `present`, `absent`, `late`, `excused`. | There is no file to port. A later screen on the live-sessions route can insert attendance with the user cookie and the existing RLS. Do not add a migration just to show the table. |

### Parents

| Feature | Source at 8afba27 | Later path |
| --- | --- | --- |
| My children | `src/pages/dashboard/ChildrenPage.tsx` | `app/(app)/dashboard/children/page.tsx`. Keep `link_parent_child`. The Vite route was not limited to `parent`; the port should allow `parent` only unless a reviewed reason says otherwise. |
| Child progress | `src/pages/dashboard/ChildProgress.tsx` | `app/(app)/dashboard/child-progress/page.tsx`. The embed `profiles!parent_student_student_id_fkey` does not match the schema (`parent_student.student_id` references `auth.users`). Port the two-query shape used by `ChildrenPage`, not that embed. |
| Parent role tips | `src/pages/dashboard/ParentRolePage.tsx` | `app/(app)/dashboard/my-role/page.tsx`, role `parent`. |

### Communication

| Feature | Source at 8afba27 | Later path |
| --- | --- | --- |
| Messages | `src/pages/dashboard/MessagesPage.tsx` | `app/(app)/dashboard/messages/page.tsx`, client component for Realtime. Drop the 5-second poll in that port if the subscription is enough. |
| Forum | `src/pages/dashboard/ForumPage.tsx` | `app/(app)/dashboard/forum/page.tsx`. |
| Notifications | `src/components/NotificationBell.tsx` | Client component in the `(app)` header when a screen needs it. |
| Admin announcements | `src/pages/dashboard/AdminAnnouncementsPage.tsx` | `app/(app)/dashboard/announcements/page.tsx`, role `admin`. |

### Mood, subscriptions, support, dashboards, analytics

| Feature | Source at 8afba27 | Later path |
| --- | --- | --- |
| Mood | `src/pages/dashboard/MoodPage.tsx` | `app/(app)/dashboard/mood/page.tsx`. |
| Subscription page | `src/pages/dashboard/SubscriptionPage.tsx`, `src/hooks/useSubscription.ts` | `app/(app)/dashboard/subscription/page.tsx`. Keep calling the existing edge functions until a webhook exists. Mobile-money buttons are a toast, not a payment. Do not port them as if they charge. |
| Support | `src/pages/dashboard/SupportPage.tsx`, `src/components/support/SupportWidget.tsx`, `src/components/support/SupportChat.tsx`, `src/components/support/NewTicketDialog.tsx`, `src/hooks/useSupport.ts` | `app/(app)/dashboard/support/page.tsx`. Mount the widget in the authenticated layout only. Bucket `support-files` stays. |
| Teacher student list | `src/pages/dashboard/TeacherStudentsPage.tsx` | `app/(app)/dashboard/my-students/page.tsx`, roles `teacher` and `admin`. |
| Dashboard homes | `src/pages/Dashboard.tsx`, `src/pages/dashboard/StudentHome.tsx`, `src/pages/dashboard/TeacherHome.tsx`, `src/pages/dashboard/ParentHome.tsx`, `src/pages/dashboard/AdminHome.tsx`, `src/components/DashboardLayout.tsx` | Replace the short `app/(app)/dashboard/page.tsx` confirmation with the role home, chosen only when `resolution.status === "ok"`. A missing role must stay on `/holding`, which is the opposite of the Vite home (it rendered `StudentHome` for a null role). Sidebar: port `DashboardLayout.tsx` into `app/(app)/layout.tsx`. |
| Analytics | `src/pages/dashboard/AdminAnalytics.tsx` | `app/(app)/dashboard/analytics/page.tsx`, role `admin`. Four counts only. |

### Shared UI used by the screens above

Port a component only when a screen in the tables needs it. Do not copy the whole kit first.

| Path at 8afba27 | Later path |
| --- | --- |
| `src/components/ui/*` | `components/ui/*` when a ported screen imports it. Includes accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip, `use-toast.ts`. |
| `src/components/NavLink.tsx` | Replace with `next/link` in the ported layout. |
| `src/components/PaginationControls.tsx` | Beside the list that needs it. |
| `src/hooks/usePagination.ts`, `src/hooks/use-toast.ts`, `src/hooks/use-mobile.tsx` | Beside the screen that needs them. |
| `src/lib/utils.ts` | `lib/utils.ts` when a shadcn component needs `cn`. |
| `src/vite-env.d.ts` | Do not port. |

## Staging and rollback

Staging is a new Vercel project. Root directory is the repository root. Framework is Next.js. Environment names are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Do not point the production domain `https://mwalimumbuku.vercel.app` at this app in this phase.

Rollback of this phase is reverting the merge commit. The production domain stays on the previous deployment. Supabase is unchanged, so a revert does not need a database down migration.
