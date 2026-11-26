# Security audit

Scope is the Next.js app on this branch. This review pass ran `npx tsc --noEmit` and `npm test` (114 passed, 1 failed), including `supabase/tests/admin-boundaries.test.mts`. The earlier pass on this branch ran `npm run build`; this pass did not. No request was sent to the hosted Supabase project, and no migration was applied there. The signed-in product was not exercised in a browser.

The one failing test, `features/auth/privilege.test.mts`, reports `signUp(` in `features/auth/actions.ts`. That call is public student/parent registration and is already on `main`. Signup metadata still cannot become `admin` or `teacher`: `public.signup_role` maps anything else to `student`, and the PGlite test checks that.

## Fixed in this branch

| Severity | Issue | Evidence | Change |
| --- | --- | --- | --- |
| High | A signed-in user, including a platform admin, could treat the checkout return URL as payment and write `subscriptions.tier`. The old screen also passed `child_id` from the query string | `src/screens/dashboard/SubscriptionPage.tsx` previously updated the row when `success=true` | The screen no longer writes a tier. `prevent_subscription_self_update` rejects a signed-in insert, delete, or change to tier, `is_active`, and `expires_at`. PGlite: a platform admin update, insert, and delete each raise. A write with no signed-in user still changes the tier |
| High | `update-subscription` accepted a user JWT and wrote `tier` with the function's privileged key | `supabase/functions/update-subscription/index.ts` | The function now returns 403 after it checks the JWT. Cancellation stays with Stripe and `supabase/functions/stripe-webhook/index.ts` |
| High | `payment_history` allowed any signed-in insert (`WITH CHECK (true)`), so a student could insert `status = succeeded` | `supabase/migrations/20260529162956_9ee10810-cb4f-411e-b3c4-4b8858f74427.sql` | The new migration drops that policy. PGlite: the student insert fails |
| High | The user screen updated `user_roles` and deleted profiles, results, and related rows from the browser. A platform admin could grant `admin`. Creating a teacher called `signUp` in the admin session | `src/screens/dashboard/AdminUsers.tsx` | Role changes and deletion are gone from that screen. `user_roles_no_self_grant` blocks a self-grant of `admin` or `teacher`. A school admin cannot insert `admin` (PGlite). Teachers are attached with `provision_teacher` for an existing account |
| High | A school admin could be aimed at another school by changing an id | `lib/admin/scope.ts` and `provision_teacher` | PGlite: `provision_teacher` for the other school raises `not authorized for that school`. A teacher is refused the same way. Platform settings updates by a school admin and a teacher change 0 rows |
| High | Homework objects for teachers matched `file_url LIKE '%' \|\| filename`, so the same file name in another folder could match | `supabase/migrations/20260411195048_cddc23fc-a733-48e3-990f-6256b67af060.sql` | The new migration replaces that policy with an exact `file_url = storage.objects.name` match, plus the course teacher or that school's admin. Parents use `parent_of` on the folder id. This was not executed against a live bucket |
| High | `support-files` was a public bucket and the client stored `getPublicUrl` | `supabase/migrations/20260529161640_25bad64a-484d-429b-8d64-100ad217dcec.sql`, `src/hooks/useSupport.ts` | The migration sets the bucket private and limits select to the owner folder or a visible ticket. The client stores the object path and requests a 120-second signed URL. `lib/storage/support-files.test.mts` rejects another user and a mismatched type. The hosted bucket was not updated |

Audit rows are append-only. PGlite: `DELETE FROM admin_audit_log` raises, including as the table owner. Email outcome rows store a fixed detail code, and a token-like detail is rejected.

## Checked and holding

- School isolation for classes, family links, and grades: `supabase/tests/multi-school-isolation.test.mts`.
- Exercise answers are not returned by `get_lesson_exercises`: `supabase/tests/courses-and-assessment.test.mts`. `student_exercises` in `src/integrations/supabase/types.ts` has no `correct_answer` column.
- A student cannot set `homework_submissions.grade`: courses test and portals test.
- Homework upload validation rejects another owner, a script, an oversize file, and a PDF name with `text/html`: `lib/assessment/grade.test.mts`.
- Game scores ignore a client score and XP field: `lib/games/engine.test.mts` and `supabase/tests/games-parity.test.mts`.
- Webhook decisions reject a bad signature, a timestamp older than 300 seconds, a replayed event id, an unpaid checkout, and a refund that would leave the user premium: `lib/payments/webhook.test.mts`. The edge function checks `stripe-signature` and calls `apply_payment_event`, which stores `payment_events` in the same transaction as the entitlement and payment history. An older event does not restore a newer cancellation. PGlite covers that order.
- Auth, contact, games, and portal actions use `lib/auth/limits.ts` through `authRateLimiter`. The limiter is process-local (`lib/auth/limiter.ts`).
- Password recovery records `provider_rejected` or `provider_unreachable` and does not put the address in the outcome (`lib/email/delivery.ts`). Signup and recovery send that outcome to `record-auth-email` before sign-in. `anon` and `authenticated` cannot execute `record_email_delivery`. A school notice still records its outcome inside `admin_notify_school`.

## Documented, not changed

| Severity | Finding | Evidence |
| --- | --- | --- |
| Medium | `course-materials` is a public bucket. A file uploaded there is readable without a relationship check. Avatars are public by design | `supabase/migrations/20260529162246_dfaf2de9-1cc7-4eef-b36a-186b08e5e897.sql`, `supabase/migrations/20260529160934_27cd63b1-4f45-49ed-a7cb-7b4459e207d7.sql` |
| Medium | `check-subscription` still writes `tier = premium` when Stripe reports an active subscription. That path uses the function's server key and a Stripe read, not the browser return URL. It does not downgrade when Stripe has no active subscription. This environment did not call Stripe | `supabase/functions/check-subscription/index.ts` |
| Medium | Forum read rules are in SQL and were not asserted by the portals test. See `PARITY.md` | `supabase/migrations/20261125170000_portals_comms_attendance.sql` |
| Low | Auth cookies are not `httpOnly`, which the existing cookie test records so the browser client can read the session | `lib/supabase/cookie-options.test.mts` |
| Low | Rate limits are per Node process. Several instances would not share one counter. This was not load-tested | `lib/auth/limiter.ts` |

Homework retention is 24 months after `homework_submissions.created_at` (`HOMEWORK_RETENTION_MS` in `lib/assessment/files.ts`). The migration comments that rule and does not delete files.

Live email delivery, the hosted storage buckets, and a signed Stripe webhook delivery were not run.
