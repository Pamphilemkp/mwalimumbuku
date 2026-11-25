# Mwalimu Mbuku — Database and Backend Audit

The root Next.js transformation did not modify `supabase/migrations`, edge functions, or data. Generated types cited as `src/integrations/supabase/types.ts` are in commit `8afba27b4f5a43b16aa231f8132bf696fcce1452`.

Audit date: 24 November 2026 (Asia/Nicosia).

This report describes the database **as the SQL migrations define it**, applied in filename order. The live Supabase project was not queried. Dashboard edits that were never committed would not appear here.

Generated client types (`src/integrations/supabase/types.ts`) match this table list and report PostgREST 14.1. `parent_student` is generated with `Relationships: []`, which matches the lack of a foreign key to `profiles`.

## 1. How the backend is split

| Piece | Where it lives | Called by |
| --- | --- | --- |
| Tables, RLS, triggers, RPCs | `supabase/migrations/*.sql` | `supabase-js` from the browser |
| Auth users | Supabase Auth (`auth.users`) | `supabase.auth` |
| Files | Storage buckets created in SQL | `supabase.storage` |
| Stripe and a few privileged writes | `supabase/functions/*/index.ts` | `supabase.functions.invoke` |
| Scheduled reminders | `pg_cron` → `run_scheduled_notifications()` | Postgres, not the client |

The browser uses the publishable key. The service role appears only inside edge functions. That split is correct. Several functions then use the service role more broadly than the task needs (`notify-enrollment` can insert messages as any sender).

`supabase/config.toml` sets `verify_jwt = false` for every function. The gateway will invoke them without a JWT. Each function reads `Authorization` itself. A missing or invalid token returns 401. This is weaker than gateway verification (unauthenticated requests still execute the function, CORS preflight is open, and a bug in one function’s check is not covered by the platform). CORS `Access-Control-Allow-Origin` is `*` on all six.

## 2. Identity model

### `auth.users`

Owned by Supabase Auth. `handle_new_user` runs `AFTER INSERT`.

Latest function body (`20260529160934_...sql`):

- Inserts `profiles` with `full_name` and a random 8-digit `student_code`.
- Accepts metadata role only if it is `student` or `parent`. Anything else, including `teacher` and `admin`, becomes `student`.
- Inserts `user_roles` and a `subscriptions` row at `free`.
- Inserts an empty `student_profiles` or `parent_profiles` row.
- Does **not** insert `teacher_profiles`.

Earlier versions of this function allowed `teacher` from metadata (`20260308113426_...sql`). The May 2026 version replaced that. The final definition is the strict one.

### `user_roles`

`id`, `user_id` → `auth.users` ON DELETE CASCADE, `role` enum `app_role`, unique `(user_id, role)`.

Policies in force after the March 8 rewrites:

- User can `SELECT` their own rows.
- Admin `ALL` using `has_role(auth.uid(), 'admin')`.

`has_role` is `SECURITY DEFINER` and reads `user_roles` so policies do not recurse. It answers for any user id, not only the caller. It is granted to clients as an RPC (`types.ts` lists it). A logged-in user can ask “is this uuid an admin?”. Role flags are low sensitivity compared with profile PII, but it is an enumeration oracle. Confirmed.

There is no policy that lets a non-admin insert a role. Privilege escalation through `user_roles` from the client is blocked, provided the admin JWT is required for updates. The broken path is the admin UI calling `signUp`, not a missing RLS check.

### `profiles`

Columns accumulated across migrations:

| Column | Role |
| --- | --- |
| `id`, `user_id` unique, `full_name`, `avatar_url` | Identity |
| `locale` default `en`, `dyslexia_mode` | Preferences. Signup writes `preferred_language`, not `locale` |
| `student_code` | 8-digit string, not unique in the schema |
| `gender`, `date_of_birth`, `phone`, `address`, `country`, `city`, `preferred_language`, `bio` | PII added for onboarding |
| `onboarding_completed` default false, `onboarding_step` default 0 | Wizard bookkeeping. Guard no longer reads them |
| timestamps | `update_updated_at_column` trigger |

Select policies (a row is visible if **any** policy passes):

- Own row.
- Admin.
- Teacher of a course the profile’s user is enrolled in.
- Parent linked through `parent_student`.
- Either party of a `messages` row with the caller.
- **Any profile that has at least one `forum_posts` or `forum_replies` row**, with no check that the caller can see that post.

The last policy selects the entire row. Phone, address, date of birth, student code, and avatar are included. Confirmed PII exposure for every forum participant, to every authenticated user.

Users can update their own row with no column protection. A user cannot change `user_id` to someone else’s because `USING (auth.uid() = user_id)` filters the target row, but they can change `student_code`, `onboarding_completed`, and `full_name` freely. Student-code impersonation is possible if the victim’s code is known and no unique constraint fires. Confirmed.

### Role profile tables

| Table | Key | Access |
| --- | --- | --- |
| `student_profiles` | `user_id` PK | Owner all; admin all; teacher of an enrolled course select; linked parent select |
| `parent_profiles` | `user_id` PK | Owner all; admin all. Teachers cannot read it |
| `teacher_profiles` | `user_id` PK | Owner all; admin all; **any authenticated user can select** (`USING (true)`) |
| `children_info` | `id`, `parent_id` | Parent all; admin all; teacher select when `linked_student_id` is enrolled in their course |

`teacher_profiles` being world-readable to logged-in users is intentional in the migration comment sense (a directory) and includes qualifications and availability JSON. It is not anonymous-readable (`TO authenticated`).

`children_info` can store learning difficulties and behavioral notes. Access is appropriately narrow, except where a teacher is enrolled-adjacent.

No foreign keys from these tables to `auth.users` were declared in the May migration (only `user_id` primary keys). Deleting `auth.users` cascades `profiles` and `user_roles` (those FKs exist) but **does not** cascade `student_profiles` / `parent_profiles` / `teacher_profiles` / `children_info`. Orphans are likely. Confirmed from the `CREATE TABLE` statements.

## 3. Learning tables

### `courses`

`teacher_id` → `auth.users` ON DELETE SET NULL, `title`, `description`, `level` default `beginner`, `subject`, `is_published` default false, `is_premium` default false, `is_open_enrollment` default true, `deadline`, timestamps.

Policies:

- `SELECT` if published, or if `teacher_id = auth.uid()`, or admin `ALL`.
- Teacher insert/update/delete only when `has_role(teacher)` and they are `teacher_id`.
- Admin `ALL`.

`is_premium` and `is_open_enrollment` are not referenced by any policy. Confirmed.

### `lessons`

`course_id` cascade, `title`, `content`, `audio_url`, `video_url`, `sort_order`.

`SELECT` if the caller teaches the course, the course is published, the caller is enrolled, or the caller is admin. Published premium lessons are therefore readable without paying. Confirmed.

### `exercises`

`lesson_id` cascade, `question`, `options` jsonb, `correct_answer`, `exercise_type` default `multiple_choice`, `points` default 10.

Select policies still in force:

- Admin `ALL`.
- Teacher of the course `ALL` (includes `correct_answer`, which teachers need).
- **Enrolled students `SELECT` the whole row**, recreated in `20260308231918_...sql` after an earlier migration had removed open select. This reopens the answer key to any enrolled student via `GET /rest/v1/exercises`.

The UI does not use that select. It calls `get_lesson_exercises`, which returns id, question, options, type, points, created_at. The RPC is `SECURITY DEFINER` and does **not** check enrollment or premium. Any logged-in user can read questions for any published lesson. They cannot read `correct_answer` through this RPC. They can still brute-force `check_answer`.

`student_exercises` is a view `WITH (security_invoker = on)` over published exercises, without `correct_answer`. It is safe relative to the base table only because it omits the column. It still shows every published exercise to anyone who can select lessons/courses under invoker RLS. The app does not query the view (confirmed by search). Dead surface.

### `results`

`user_id` cascade, `exercise_id` cascade, `answer`, `is_correct`, `points_earned`, `created_at`. No unique `(user_id, exercise_id)`.

Policies after `20260308105746_...sql` and the later rewrite:

- User selects own rows.
- Parent selects linked child rows.
- Teacher selects rows whose exercise belongs to their course.
- Admin `ALL`.
- **No user `INSERT` policy.** The March 6 migration had added one; March 8 dropped it and nothing later recreated it.

Inserts happen inside `check_answer` (`SECURITY DEFINER`), which:

- Requires `auth.uid()`.
- Loads `correct_answer` and `points`.
- Sets correct when `_answer = _correct` (case-sensitive, no `trim`).
- Inserts a new row every call, including repeats.
- Does not check enrollment, premium, or an attempt cap.
- Returns only `{ is_correct, points_earned }`, not the right answer. Good.
- Does not lock the row. Two parallel calls both insert. Confirmed.

### `course_enrollments`

`course_id`, `user_id`, `enrolled_at`. Policies: own select, teacher select, student insert if the course is published, student delete own, admin all. No premium check. No unique constraint is visible in the portions reviewed of the original table; the client checks for an existing row before insert. A race can create duplicates. **Likely**, not re-verified by a constraint search hit. The original `CREATE TABLE` in the first migration does not declare `UNIQUE (course_id, user_id)`. Confirmed absent.

### `course_materials`

No FK to `courses` or `lessons`. Teacher of the course manages; enrolled student selects; admin all. Files are in a **public** bucket, so RLS on the row does not protect the bytes.

### `assignments`

`course_id` FK, `title`, `description`, `due_date`. Student select if enrolled or if they teach the course. Teacher `ALL` if they teach it. Admin `ALL`. Insert trigger `notify_assignment` writes notifications to enrolled students and their parents.

### `homework_submissions`

`assignment_id` cascade, `user_id` (**no FK**), `file_url`, `file_name`, `teacher_comment`, `grade` integer (**no check between 0 and 100**), `status` default `pending` (**no enum**).

| Action | Policy |
| --- | --- |
| Student select | `user_id = auth.uid()` |
| Student insert | `user_id = auth.uid()` only. Grade, status, and file URL are unconstrained. Enrollment is not required |
| Teacher select/update | teacher of the assignment’s course |
| Admin | `ALL` |

A student can insert `status = 'graded', grade = 100` for an assignment id they know. Confirmed.

Storage bucket `homework-files` is private. Upload and select are limited to the first folder equaling `auth.uid()`, plus a teacher select that pattern-matches the filename inside `file_url`. The application stores a public URL that this policy does not turn into a download.

Triggers: `notify_teacher_on_submission` after insert, `notify_student_on_grade` after update.

## 4. Gamification tables

### `badges` / `user_badges`

Badges are world-readable to authenticated users. Admins manage the catalog. There is no `INSERT` of sample badges in migrations.

`user_badges` is unique `(user_id, badge_id)`. Users can select their own. The “award own badges” insert policy was dropped and not recreated. `award_badge_if_eligible` sums **all** `points_earned` for the caller, compares with `points_required`, and inserts. Retakes inflate the sum. Confirmed.

No policy was found that lets a parent select a child’s badges. Parent progress pages do not query `user_badges`. Confirmed gap, low severity.

### `daily_moods`

Owner `ALL`. Parent select if linked. No teacher policy. Free-text `note`.

### `platform_settings`

`key` unique, `value` jsonb. Any authenticated user can read (game timers and toolbox flags). Admin `ALL`. Defaults: game times 120/90/60 and multiplier 1; all toolbox tools on.

## 5. People and communication

### `parent_student`

`parent_id` and `student_id` both FK → `auth.users` cascade, unique pair. No FK to `profiles`, which is why embedded selects in `ChildProgress` and `ParentRolePage` do not match the schema.

Insert: caller is the parent, caller has role parent, and (after `20260411200444_...sql`) the target has role student. `link_parent_child` repeats those checks and is what `ChildrenPage` calls. Admins can insert directly and bypass nothing important except they must still satisfy the admin policy. A parent cannot link to a non-student. Good.

There is no unlink policy for parents (no parent `DELETE`). An admin can delete. Confirmed. Parents cannot undo a link in the database.

### `messages`

`sender_id`, `receiver_id`, `content`, `is_read`. No FK in the original `CREATE TABLE` (columns are bare uuid). Realtime publication added.

- Select if sender or receiver.
- Insert if sender is the caller. **No role check and no relationship check** in the final policy (`20260308231918_...sql`). The March 4 policy that limited senders to parent/teacher/admin was dropped by name and replaced.
- Update if the caller is the receiver (used to mark read). The policy is `USING` only, so a receiver can also change `content` on messages they received. Confirmed.
- Delete if the caller is the sender.

### `forum_posts` / `forum_replies`

Posts: `role_visibility text[]` default all roles. Select if the caller’s role is in that array. Insert/update/delete own posts. Replies similar, delete own, no update policy.

No admin override. A post stuck with a bad `role_visibility` cannot be removed by an admin through RLS. Confirmed.

`role_visibility` is client-controlled on insert.

### `notifications`

`user_id` (no FK), `title`, `message`, `type`, `is_read`, `related_id`.

- Select and update own.
- Admin `ALL`.
- Insert for authenticated with `WITH CHECK (true)`.

Any logged-in user can create a notification for any user id, including phishing text (“your teacher said…”). Confirmed. Triggers also insert, as the table owner / definer, which does not need this policy. The wide policy exists so the admin announcement screen can insert from the browser. It should be admin-only, or a definer function.

Realtime is on.

### `teacher_recommendations`

Teacher `ALL` on own rows. Student select own. Parent select if linked. Admin all. No student UI reads them (see features report).

### `live_sessions`

No FK on `course_id` or `teacher_id`. Teacher manages own (`teacher_id = auth.uid()`), and the check does not prove they teach `course_id`. A teacher can attach a session to someone else’s course id. Students of that course would then see it (`Enrolled view sessions`). Confirmed logic bug in the policy.

Parents see sessions for courses where a linked child is enrolled. Admin all.

### `attendance`

FK from `session_id` to `live_sessions` cascade. Unique `(session_id, student_id)`. Teacher of `course_id` manages. The policy does not require `session_id` to belong to that course. Schema-only from the UI’s point of view.

## 6. Money

### `subscriptions`

`user_id` unique, `tier` check `free|premium`, `starts_at`, `expires_at`, `is_active`, timestamps.

Users `SELECT` own row. Admins `ALL`. User insert and user update policies were dropped (`20260305132843` dropped update; `20260308105746` dropped insert). A normal user cannot flip `tier` through PostgREST. Confirmed.

Writers that remain:

- `handle_new_user` inserts `free`.
- `check-subscription` upserts `premium` when Stripe has an active subscription, using the service role. It does not write `free` when Stripe does not.
- `update-subscription` sets `free` using the service role, without canceling Stripe.
- Admin UI can edit rows because of the admin policy (the users screen reads subscriptions; a direct update from a crafted client by an admin would succeed).

`expires_at` is not consulted by `isPremium()` in the client. A past `expires_at` with `is_active` true still counts as premium. Confirmed.

### `payment_history`

`amount`, `currency` default USD, `status`, `provider`, `provider_ref`, `description`. No FK on `user_id`.

- Select own.
- Admin all.
- Insert for authenticated with `WITH CHECK (true)`.

Any user can insert a `succeeded` payment for any user id. The trigger `notify_payment_event` only writes notifications. It does **not** change `subscriptions.tier`. Forged rows pollute history and can spam “payment received” notifications. Confirmed. They do not, by themselves, unlock courses.

`GRANT UPDATE` is also given to `authenticated`. Combined with admin `ALL` and the absence of a user update policy, a non-admin cannot update. The grant is wider than the policy. Policies still apply. Low severity.

### `renewal_history`

Select own, admin all. No general insert policy for users (only `GRANT INSERT`). Without a policy, user inserts fail. Renewals are written only if some definer path inserts them. No such writer was found outside the table’s own trigger, which fires after insert. Nothing in the edge functions inserts `renewal_history`. **The renewal table is unused by the application.** Confirmed.

### Stripe functions

`create-checkout` hardcodes a Price ID and uses the request `Origin` for success and cancel URLs, falling back to the Lovable host. There is no allow-list of origins. A malicious page can send a logged-in user’s browser to this function with a foreign `Origin` and receive a Checkout URL that returns to that origin. The Stripe customer is still the user’s email, so this is an open-redirect style issue on the return URL, not a way to charge a different card without the user completing Checkout. Confirmed in code.

`check-subscription` and `customer-portal` look up the Stripe customer by email, `limit: 1`. Two Stripe customers with the same email can attach the wrong subscription. Confirmed pattern, not verified against the Stripe account.

No webhook means `checkout.session.completed` never writes `payment_history` or `renewal_history`.

## 7. Support

Enums: `support_category`, `support_priority`, `support_status`.

`support_tickets`: owner select/insert; owner update (any column); teacher **or** admin select all; teacher or admin update; admin delete.

`support_messages`: participants and staff. `support_typing`: presence-style rows.

Bucket `support-files` is **public**. Ticket text is RLS-protected; a leaked URL is not.

Indexes: `support_tickets(user_id)`, `(status)`, `support_messages(ticket_id, created_at)`. These are among the few explicit indexes in the project.

## 8. Functions and scheduling

| Function | Security | Purpose | Gap |
| --- | --- | --- | --- |
| `has_role` | definer | RLS helper | Callable as RPC; role oracle |
| `handle_new_user` | definer | Signup bootstrap | Random student code, no uniqueness; no teacher profile |
| `check_answer` | definer | Grade an exercise | No enrollment, no attempt limit, exact string match, append-only points |
| `get_lesson_exercises` | definer | Hide answers | No enrollment or premium check |
| `link_parent_child` | definer | Parent link | Sound checks. UI passes a confusing identifier |
| `award_badge_if_eligible` | definer | Claim badge | Sums every attempt |
| `notify_assignment` and siblings | definer | Fan-out notifications | Run as definer, bypass RLS on insert. Correct for triggers |
| `send_assignment_reminders`, `send_subscription_reminders`, `send_academic_reminders` | definer | Reminder copy | Deduped by existing notification rows |
| `run_scheduled_notifications` | definer | Calls the three senders | Scheduled hourly **if** `pg_cron` exists |

`pg_cron` schedule name: `run-scheduled-notifications`, cron `0 * * * *`. Failure of `CREATE EXTENSION pg_cron` would fail that migration on a project where the extension is not allowed. **Not verified live.**

## 9. Storage policies (summary)

| Bucket | Public | Write rule | Read rule |
| --- | --- | --- | --- |
| `avatars` | yes | own folder | public |
| `homework-files` | no | own folder | own folder, or teacher filename match |
| `course-materials` | yes | teacher of course (table) plus storage policies in the same migration | public object URL |
| `support-files` | yes | ticket participant path | public object URL |

Public buckets plus predictable paths (`{uid}/...`) mean avatars, course files, and support attachments are fetchable without a session if the path is known or leaked. Avatars are intentionally public. The other two are not a good match for school documents and support attachments.

## 10. Indexes and query shape

Explicit indexes found:

- `support_tickets(user_id)`, `support_tickets(status)`
- `support_messages(ticket_id, created_at)`
- `course_materials(course_id)`
- `attendance(student_id)`, `attendance(course_id)`

Not found, and used by the hot paths:

- `results(user_id)`, `results(exercise_id)`
- `course_enrollments(user_id)`, `course_enrollments(course_id)`
- `lessons(course_id, sort_order)`
- `exercises(lesson_id)`
- `messages(sender_id)`, `messages(receiver_id)`
- `notifications(user_id, is_read, created_at)`
- `assignments(course_id, due_date)`
- `homework_submissions(user_id)`, `homework_submissions(assignment_id)`
- `profiles(student_code)` unique
- `parent_student(parent_id)`, `parent_student(student_id)`

Primary keys and unique constraints cover equality on `id` and `user_id` for some tables. Foreign keys in Postgres do not automatically create indexes on the referencing column. At classroom scale this is invisible. At “every student in a city” the teacher result page and the parent progress page become sequential scans. Confirmed absence in migrations; impact is a projection, not a measured production trace.

Client query anti-patterns (confirmed):

- `AdminUsers` selects all profiles, all roles, all parent links, all enrollments, all subscriptions, all results.
- `TeacherResults` and `TeacherStudentsPage` pull every matching result row to sum in JavaScript.
- `MessagesPage` refetches the thread every 5 seconds and also listens to Realtime.
- `CourseBrowser` asks for every `course_enrollments.course_id` and counts in the browser. RLS does not allow that read. Students only get their own rows, so the number on a card is 1 if they are enrolled and 0 otherwise. Teachers see counts only for their own courses. Admins do download every row. Confirmed in `CourseBrowser.tsx` together with the enrollment select policies.

RLS policies that `EXISTS` over joins (`exercises` → `lessons` → `courses` → `enrollments`) run per row. Without the indexes above they dominate CPU once the tables grow. This is the main database scalability risk. There is no connection pooler config in the repo because the browser talks to PostgREST directly; Supabase’s pooler sits in front. The risk is policy and index design, not the absence of a Node pool.

## 11. Realtime

`messages` and `notifications` are added to `supabase_realtime`. Each logged-in dashboard opens at least the messages channel (`MessagesPage` subscribes even before a contact is chosen, from the effect on `user`). The notification bell’s exact channel usage is a short component; it reads with React Query. More concurrent sockets mean more radio wakeups on a phone. For a low-bandwidth client, polling plus a socket is the expensive combination.

## 12. Secrets and committed configuration

Confirmed tracked files:

- `.env` is in git and is not listed in `.gitignore`. It contains `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, and `VITE_SUPABASE_PUBLISHABLE_KEY`. Values are not repeated here.
- `supabase/config.toml` contains the project id.
- `admin.md` contains a personal administrator email address. No password is stored there. The file still documents a privileged mailbox and should be removed from the tree and from history if the repository is shared.
- Edge function source contains a Stripe Price ID and public app URLs. It does not contain the Stripe secret.

The publishable key is not a service-role key. Treating it as “fine because it is public” is only true when RLS is tight. It is not tight enough today (forum profiles, notification insert, homework grade, exercise answers for enrolled students, `check_answer` without enrollment).

## 13. Data integrity checklist

| Rule the product needs | Enforced in the database? |
| --- | --- |
| One role family per person | No. Unique is per role, client assumes one |
| Student code unique | No |
| One enrollment per user and course | No |
| One homework submission per assignment | No |
| Grade between 0 and 100 | No |
| Homework file belongs to the uploader | Only by storage path convention, not by a check on `file_url` |
| One result per exercise (best score) | No |
| Premium required to read premium lessons | No |
| Subscription tier matches Stripe | No |
| Teacher profile exists for teacher role | No |
| Declared child linked to a student account | Optional column, no trigger |
| Minor consent | No |
| Audit trail of role changes and deletes | No |

## 14. What to preserve in any migration

Do not drop and recreate these tables. Do not run the historical migrations against the live database. Take a logical backup (`auth` schema plus `public` plus storage object list) before any policy change.

Policy fixes should be new forward migrations: `DROP POLICY` / `CREATE POLICY`, new constraints added carefully (`UNIQUE` will fail if duplicates already exist; clean duplicates first), and new indexes created `CONCURRENTLY` outside a transaction when the tables are large.

The Next.js move does not require a new database. See [NEXTJS_MIGRATION_PLAN.md](NEXTJS_MIGRATION_PLAN.md).
