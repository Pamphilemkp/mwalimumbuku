# Feature parity

The product is the Next.js app at the repository root. Screens live in `src/screens` and are mounted by `app/`. There is no second runnable Vite app: `package.json` has no Vite dependency, `vercel.json` sets `"framework": "nextjs"` and has no SPA rewrite, and `services/auth/toolchain.test.mts` asserts that `vite.config.ts`, `index.html`, and a second app directory are absent. That was already true on `origin/main`. This branch did not delete a remaining Vite runtime.

A row is **Migrated and verified** only when a test exercised the behavior and that test passed in this run (`npm test`: 114 passed, 1 failed). The failed test is `features/auth/privilege.test.mts`, which still finds `signUp(` in `features/auth/actions.ts`. That call is the existing public student/parent registration and was already on `main`. The signed-in dashboard was not opened in a browser (no session).

| Feature | Classification | Evidence |
| --- | --- | --- |
| Authentication | Migrated and verified | `features/auth/sign-in.test.mts`, `request-password-reset.test.mts`, `register.test.mts`, `update-password.test.mts`, `app/auth/callback/route.ts` |
| Roles | Migrated and verified | `services/auth/get-role.test.mts`, `lib/auth/access.test.mts`, `supabase/tests/multi-school-isolation.test.mts`, `supabase/tests/admin-boundaries.test.mts` |
| Courses | Migrated and verified | `supabase/tests/courses-and-assessment.test.mts` (visibility and enrollment). Pages: `app/(app)/dashboard/courses` |
| Lessons | Migrated and verified | Same test calls `get_lesson_exercises` and hides an unpublished lesson |
| Exercises | Migrated and verified | `lib/assessment/grade.test.mts` and the courses test (answer not returned by `get_lesson_exercises`) |
| Homework | Migrated and verified | `lib/assessment/grade.test.mts` (type, size, owner, short-lived path). Storage policies: `supabase/migrations/20261126120000_admin_audit_storage_payments.sql`. The hosted bucket was not updated from this environment |
| Grades | Migrated and verified | `lib/assessment/grade.test.mts`. The courses test rejects a student writing `homework_submissions.grade` |
| Parent portal | Migrated and verified | `lib/portals/access.test.mts`, `supabase/tests/portals-comms-attendance.test.mts` |
| Teacher portal | Migrated and verified | `supabase/tests/portals-comms-attendance.test.mts` (class attendance and sessions) |
| Messaging | Migrated and verified | Same portals test: an outsider reads no thread and cannot send as someone else |
| Forum | Partially migrated | Page `app/(app)/dashboard/forum/page.tsx` and policies in `supabase/migrations/20261125170000_portals_comms_attendance.sql`. The portals test inserts posts and does not assert who can read them |
| Notifications | Migrated and verified | Portals test: an outsider cannot insert a notification for another user, and `notification_preview` is empty for them. Admin notices: `admin_notify_school` in the new migration. Mail for those notices is recorded as unconfigured (`lib/email/delivery.test.mts`) |
| Support | Partially migrated | Ticket visibility is asserted in the portals test. File type and owner checks: `lib/storage/support-files.test.mts`. The chat screen was not opened, and the hosted `support-files` bucket was not changed |
| Attendance | Migrated and verified | Portals test: the assigned teacher reads and updates the register; another teacher and the student do not write it; `attendance_audit` keeps the previous status |
| Live sessions | Migrated and verified | Portals test: a student cannot create a session; a student outside the class cannot read the class session |
| Games | Migrated and verified | `lib/games/engine.test.mts`, `supabase/tests/games-parity.test.mts` |
| XP | Migrated and verified | `lib/rewards/economy.test.mts` (`xpGrant`, daily cap 400) and the games parity reward test |
| Points | Migrated and verified | Exercise points stay on `results` (`lib/assessment/grade.ts`, courses test). Game points are the verified score, not a client field (`lib/games/engine.test.mts`) |
| Badges | Migrated and verified | `lib/rewards/economy.test.mts` awards from verified stats and one grant per idempotency key |
| Administration | Partially migrated | Privilege rules passed in `supabase/tests/admin-boundaries.test.mts` and `lib/admin/scope.test.mts`. Screens: `app/(app)/dashboard/academic/page.tsx`, `app/(app)/dashboard/users/page.tsx`, `app/(app)/dashboard/settings/page.tsx`. Those screens were not used while signed in |
| Payments | Partially migrated | Stripe checkout remains in `supabase/functions/create-checkout/index.ts` and now sends `client_reference_id`. Signature, replay, refund, and unpaid decisions: `lib/payments/webhook.test.mts`. The webhook function was not called with a live Stripe event |
| Mobile-money checkout | Intentionally retired | The subscription screen no longer submits a simulated M-Pesa, Orange Money, or Airtel payment. No provider is configured in this repo |

Counts: 17 migrated and verified, 4 partially migrated, 0 missing, 1 intentionally retired.

`features/auth/privilege.test.mts` is the one failing test and is not used above as proof that registration is free of `signUp(`.
