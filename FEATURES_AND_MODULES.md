# Mwalimu Mbuku — Features and Modules

Audit date: 24 November 2026 (Asia/Nicosia).

Status labels mean:

| Label | Meaning |
| --- | --- |
| Functional in code | UI and a matching table/RPC/policy exist, and the happy path is coherent. Not live-tested |
| Partial | A real path exists, and a specific step is missing or contradicts another layer |
| Frontend-only | The screen does not persist or call an external system |
| Schema-only | Tables or functions exist and no screen writes them |
| Misleading | The screen or marketing copy claims a behavior the code does not perform |

The hosted project was not clicked through. “Functional in code” is not a production sign-off.

## 1. Public site

### Landing page — `src/pages/Index.tsx`

Marketing page: hero, feature grid, three steps, hardcoded statistics (`10K+` learners, `500+` courses, `98%` satisfaction, `15+` countries), calls to signup and login. Logged-in visitors are redirected to `/dashboard`.

**Status: Misleading as a product claim.** The feature blurbs (adaptive learning, low bandwidth, gamification) describe intent. Adaptive sequencing does not exist. Statistics are literals, not queries. Low-bandwidth behavior is absent (see the bugs report).

### Mission — `src/pages/Mission.tsx`

Long-form statement of purpose, bilingual via `translations.ts`, aimed at learners with disabilities in the DRC and elsewhere.

**Status: Functional in code** as static content.

### In-app documentation — `src/pages/dashboard/DocsPage.tsx`

Role-filtered help sections rendered from the translation catalog (courses, games, parenting, admin, accessibility). It does not read the database.

**Status: Functional in code** as help text. It is not evidence that the described admin powers exist.

### Guided onboarding tour — `src/pages/dashboard/OnboardingPage.tsx`

A static walkthrough linked from the sidebar (`/dashboard/onboarding`). This is not the account wizard.

**Status: Frontend-only.**

## 2. Identity, roles, and profiles

### Signup — `src/pages/Signup.tsx`

One long form.

- Account type: student or parent only. Copy says teachers are created by an administrator.
- Email, password (minimum 8, strength meter), name, phone, city, country (default `RDC`), preferred language (`fr`, `en`, `sw`, `ln`), optional address and avatar.
- Student: school name, class level (free text, example “5ème”), learning language, subjects of interest, weak subjects, goals, guardian name/phone/email stored in `student_profiles.guardian_info` JSON.
- Parent: occupation, relationship, number of children. Per-child details are not collected here.

On success with a session, the form writes `profiles` (including `onboarding_completed: true`) and the role profile, then opens `/dashboard`.

**Status: Partial.**

- Confirmed: student and parent can be registered, and the trigger will not honor `teacher` or `admin` in metadata.
- Confirmed: if Supabase requires email confirmation, the profile update is skipped (`if (!data?.session)`).
- Confirmed: avatar upload during signup calls Storage before a session may exist, so the upload can fail. The form treats profile errors as non-blocking.
- Swahili and Lingala are stored and never used to translate the UI.

### Login, forgot password, reset password

`signInWithPassword`, `resetPasswordForEmail`, `updateUser({ password })`.

**Status: Functional in code.** Redirect host is hardcoded for production builds (see architecture report).

### Profile — `src/pages/dashboard/ProfilePage.tsx`

Edit display name, dyslexia toggle, change password.

**Status: Functional in code** for those three fields. It does not edit school, phone, or guardian data collected at signup. Those fields have no later editor except the unused onboarding wizards.

### Role onboarding wizards

`/onboarding/student`, `/onboarding/parent`, `/onboarding/teacher` plus `OnboardingWizard`. They upsert the same profile tables and can mark `onboarding_completed`.

**Status: Partial, not on the main path.** `OnboardingGuard` returns `children` unchanged. Signup does not navigate here. A teacher created by an admin is never sent through `TeacherOnboarding`, so `teacher_profiles` stays empty unless someone opens the wizard by URL while `onboarding_completed` is still false.

### Admin user management — `src/pages/dashboard/AdminUsers.tsx`

- Lists every profile, role, parent link, enrollment, subscription, and result (all rows).
- Changes `user_roles.role`.
- Creates a user with `supabase.auth.signUp` in the browser, then updates the role to teacher or admin.
- Links a parent to a student by exact `student_code`.
- “Deletes” a user by deleting rows in results, enrollments, parent links, moods, messages, subscriptions, badges, roles, and profiles.

**Status: Partial and unsafe.**

- Confirmed: `signUp` from an already signed-in admin can replace the admin session when Supabase returns a session (typical when email confirmation is off). The following role update then runs as the new user and fails RLS. Outcome depends on the Auth setting. **Not verified live.**
- Confirmed: the trigger does not insert `teacher_profiles`.
- Confirmed: delete does not call an admin API to remove `auth.users`. The person can log in again. With no `user_roles` row, `getUserRole` returns null and `ProtectedRoute` does not enforce `allowedRoles`.
- Confirmed: student codes are generated as 8 digits (`LPAD(FLOOR(RANDOM()*100000000)::text, 8, '0')`). The link dialog placeholder still says `STU-...`. Exact match on `STU-` will not find a numeric code.
- Confirmed: codes are random, not checked for uniqueness in the trigger.

### Admin “assign teachers” — `src/pages/dashboard/AdminAssignTeacherPage.tsx`

Read-only cards: teacher name, phone, city, qualification, subjects, course titles.

**Status: Misleading.** The nav label is assign teachers. There is no assign action. The historical plan in `.lovable/plan.md` described an enroll action. It was not built.

### Platform settings — `src/pages/dashboard/AdminSettingsPage.tsx`

Edits `platform_settings` keys `game_settings` (time limits and `points_multiplier`) and `toolbox_settings` (which tools are visible).

**Status: Partial.** Time limits and tool toggles are read by the games page and toolbox. `points_multiplier` is saved and never read by a game.

## 3. Courses and learning

### Course catalog — `CourseBrowser.tsx`

Lists published courses, filters by subject and level, lets the user enroll. The card “count” is computed in the browser from `course_enrollments`. RLS only returns rows the caller may see, so a student sees 1 or 0, not the real number of classmates. Admins see a true count because they can read every enrollment. Premium courses show a lock in the card when `isPremium` is false. Admins and teachers are treated as premium inside `CourseView` only; the browser uses the subscription row.

**Status: Partial.**

- Confirmed: enroll inserts `course_enrollments` and fires `notify-enrollment`.
- Confirmed: RLS allows any authenticated user to enroll in any **published** course. It does not check `is_premium` or `is_open_enrollment`.
- Confirmed: the premium badge is a client check. A direct insert enrolls in a premium course.

### Course player — `CourseView.tsx`

Lesson list, HTML/text content, optional YouTube embed from `lessons.video_url`, text-to-speech of the lesson body, exercises loaded via `get_lesson_exercises` (no `correct_answer`), answers submitted via `check_answer`. Retake is a button. Best attempt is what the UI displays; every attempt is still stored.

If `course.is_premium` and the viewer is not premium/teacher/admin, the page shows an upgrade panel instead of lessons.

**Status: Partial.**

- The player works for published, non-premium courses when the user is logged in.
- Confirmed: `get_lesson_exercises` returns exercises for any published lesson to any logged-in user. It does not require enrollment or a premium flag.
- Confirmed: lesson bodies of published courses are selectable by any logged-in user (`Lessons visible if course accessible` includes `c.is_published = true`). The premium panel does not protect the API.
- Confirmed: `lessons.audio_url` is never read by this page.
- Confirmed: lesson completion percentage is computed into an empty map (`lessonCompletion` returns immediately). The progress sidebar does not show per-lesson completion.
- Confirmed: each correct retake adds another full point award. The UI shows the best score; badges and the progress page sum every row.

### Teacher course builder

- `CreateCourse.tsx` — title, subject (preset list or custom), level, description, premium switch. Inserts with `teacher_id = auth user`.
- `TeacherCourses.tsx` — list own courses, link to editor, publish toggle.
- `CourseEditor.tsx` — edit course fields, add lessons (including a YouTube URL), add exercises (question, options, correct answer, points), add assignments (title, description, due date), manage materials through `CourseMaterialsSection`.

**Status: Functional in code** for teachers whose `user_roles.role` is `teacher`. An admin can open these routes. Course insert RLS requires `has_role(..., 'teacher')` on the teacher policies, while admins have a separate “manage all courses” policy, so an admin insert is allowed. A user who is stuck as `student` because teacher provisioning failed cannot insert courses.

Exercise types: the column defaults to `multiple_choice`. The editor writes options as a string array. `check_answer` compares the submitted string to `correct_answer` with `=`. No normalization, no numeric tolerance, no partial credit.

### Course materials — `CourseMaterialsSection.tsx`

Upload into the public `course-materials` bucket, insert `course_materials`.

**Status: Functional in code, weak privacy.** Any holder of the URL can fetch the file because the bucket is public, even though table RLS limits the row to enrolled students.

### Admin course moderation — `AdminCourses.tsx`

List all courses, publish/unpublish, delete a course (manually deletes exercises, lessons, enrollments, assignments, then the course), enroll a student by code or by a `ilike` name search that takes the first hit.

**Status: Partial.** Delete does not remove `homework_submissions` (they cascade only if the assignment FK is `ON DELETE CASCADE`, which it is: `assignments(id) ON DELETE CASCADE` on homework, and assignments are deleted first). `course_materials` and `live_sessions` have **no foreign key** to `courses` in the migration, so those rows are orphaned. Name search can enroll the wrong student. Placeholder still mentions `STU-`.

## 4. Homework, grades, and assessments

There is no separate assessment or exam entity. “Assessment” in this codebase is two mechanisms:

1. Lesson exercises (`exercises` + `results`).
2. File homework (`assignments` + `homework_submissions`).

### Assignments (teacher)

Created in `CourseEditor`. Insert notifies enrolled students and their parents (`notify_assignment` trigger).

**Status: Functional in code** for creation and notification.

### Student homework — `StudentAssignmentsPage` + `StudentAssignments.tsx` + `HomeworkUpload.tsx`

Lists assignments for enrolled courses, due dates, overdue state, expand to read the description, upload one file (pdf, doc, docx, jpg, png, txt). Shows an existing submission’s status and grade.

**Status: Partial.**

- Confirmed: upload path is `{userId}/{assignmentId}/{timestamp}.{ext}` in `homework-files`.
- Confirmed: the saved `file_url` is `getPublicUrl` on a private bucket.
- Confirmed: the insert policy checks only `auth.uid() = user_id`. A client can send `grade` and `status` (for example graded / 100). The UI does not, the API allows it.
- Confirmed: nothing requires the student to be enrolled, nothing blocks late uploads, nothing prevents many rows per assignment. The UI map keeps one submission per assignment with no `order`, so which row appears is undefined when duplicates exist.
- No file size check in the client.

### Teacher grading — `TeacherSubmissionsPage.tsx`

Lists submissions for the teacher’s courses, sets `grade` and `teacher_comment`, status becomes graded. Update notifies the student (`notify_student_on_grade`).

**Status: Partial.** Grading updates are real. Opening the submitted file depends on the broken public URL. The teacher storage policy matches objects with `file_url LIKE '%' || filename || '%'`, which is brittle (timestamp names can collide across folders, and the policy does not grant a signed URL by itself).

### Student grades — `StudentGradesPage.tsx`

Sums exercise points, accuracy, average homework grade, a Recharts line of recent points, paged lists.

**Status: Partial.** The queries are valid. Totals inherit duplicate `results` rows, so the chart and “points totaux” over-count retakes. This page is the 391 KB chunk.

### Teacher results — `TeacherResults.tsx`

Search students who are enrolled in the teacher’s courses, show answer rows.

**Status: Partial.** Works when the teacher has courses and enrollments. It loads full result sets for those user ids into the browser. It does not show homework grades (that is the submissions page).

### Progress — `ProgressPage.tsx`

Same `results` sum as grades, plus the latest 20 answers, for the signed-in user. Linked from the student menu.

**Status: Partial** for the same double-counting reason. It does not include homework, games, or time-on-task.

### Badges — `BadgesPage.tsx` and `award_badge_if_eligible`

Catalog in `badges` (name, description, icon, `points_required`). The user presses “claim” when their summed points meet the threshold. The RPC checks the sum and inserts `user_badges` with `ON CONFLICT DO NOTHING`.

**Status: Partial.**

- Confirmed: there is no seed of badges in the migrations. A fresh database shows an empty page until an admin inserts rows. No admin UI inserts badges; the admin would use the Supabase dashboard or SQL. **Schema allows it, product UI does not.**
- Confirmed: direct insert of `user_badges` was removed (`20260308105746_...sql`) and not recreated. Claiming is the supported path.
- Confirmed: the claim button invalidates the wrong query key, so the card stays locked until refresh.
- Points include every retake, and game points are not included.

### XP / points

There is no `xp` table and no level curve. “Points” are `SUM(results.points_earned)` computed in the browser in three places (progress, badges, grades) which can disagree with a teacher view that filters differently. Default exercise points are 10.

**Status: Partial, and not a gamification system.** The landing page’s gamification claim is this sum plus six local games.

## 5. Educational games — `GamesPage.tsx` and `src/components/games/`

| Game | Behavior | Persistence |
| --- | --- | --- |
| Memory | Card pairs, difficulty changes pair count | Session score only |
| Word scramble | Local word list, typed answer | Session score only |
| Math | Generated arithmetic, client-side check | Session score only |
| Alphabet | Ordering / letter tasks | Session score only |
| Color match | Color names vs swatches | Session score only |
| Typing | Local phrases | Session score only |

Difficulty is easy / medium / hard. Timers read `game_settings` (defaults 120 / 90 / 60 seconds). A trophy shows the session total. Leaving the page drops it.

**Status: Frontend-only** as a learning record. The games themselves run without the network after the JS is loaded, which is the one low-bandwidth-friendly feature. They are not aligned to a grade level or the DRC programme. Content is short English/French word lists inside the components, not lessons from `courses`.

`points_multiplier` in settings has no effect. Confirmed by search: the field is written in admin settings and defaulted in `useGameSettings`, and no game reads it.

## 6. Toolbox — `ToolboxPage.tsx`

Tools can be hidden from `toolbox_settings`.

| Tool | Implementation | Status |
| --- | --- | --- |
| Vocal calculator | Parses a small expression. Voice input via Web Speech | Frontend-only. Speech fails closed with a toast |
| Spell checker | About 30 hardcoded French corrections (`apres` → `après`) | Frontend-only. Not a dictionary |
| Dictation | Appends speech-to-text into a textarea | Frontend-only. Not saved |
| Text to speech | `speechSynthesis` | Frontend-only |
| Recorder | Microphone to an object URL | Frontend-only. Nothing is uploaded |

Useful as a demo of accessibility. Not a student portfolio and not available offline in any reliable way because the page JS and, for speech, the vendor engine are required.

## 7. Live class and attendance

### Live sessions — `TeacherLiveSessionsPage.tsx`

Staff create a row: course, title, description, meeting URL, start, duration. Students, parents, and admins see sessions they are allowed to select. The join button is an external link (`meeting_url`). Delete is available to staff.

**Status: Partial.** This is a calendar of links (Zoom, Meet, or anything). There is no in-app video, no waiting room, no recording, and no automatic status change (`scheduled` stays unless updated; the UI does not run a clock against `status`).

Parents see sessions for courses their linked children are enrolled in (RLS). The page queries `live_sessions` without a parent-specific filter and relies on RLS, which is the right shape.

### Attendance — table `attendance`

Statuses `present | absent | late | excused`, unique per session and student. Policies let teachers of the course write, and students/parents read.

**Status: Schema-only.** No page imports `attendance`. Teachers cannot mark presence in the UI.

## 8. Parents

### My children — `ChildrenPage.tsx`

Lists `parent_student` links, loads those profiles in a second query, shows subscription state, can call `link_parent_child` with a student id, and can start Stripe checkout (the same premium price) ostensibly for a child.

**Status: Partial.** Linking through the RPC checks that the caller is a parent and the target is a student. The input placeholder says “e.g. abc123-...” while the RPC argument is a UUID, and the admin tool uses a student code instead. Parents are not shown a code-based lookup on this page. Two different linking UIs, neither matches the numeric code cleanly.

### Child progress — `ChildProgress.tsx`

Tries:

```ts
supabase.from('parent_student')
  .select('student_id, profiles!parent_student_student_id_fkey(full_name)')
```

**Status: Likely broken.** `parent_student.student_id` references `auth.users`, not `profiles`. Generated `types.ts` lists `Relationships: []` for `parent_student`. PostgREST will reject this embed. Results, enrollments, and moods are queried only after student ids are returned, so a failed first query empties the page. **Not executed against live PostgREST.** `ChildrenPage` avoids the embed and is the working list.

The page title and empty copy are English only.

### My role as a parent — `ParentRolePage.tsx`

Static French tips and learning strategies. Loads `children_info` (declared children, not necessarily accounts) for weaknesses. Loads recent inbound messages. Links onward to child progress and courses.

**Status: Partial.** Tips do not depend on data. “What to improve” is only as good as `children_info`, which signup does not fill. The embedded profile select on `parent_student` has the same relationship problem as child progress. `teacher_recommendations` are not read here. Teachers write them on `TeacherStudentsPage`; parents would have to notice them elsewhere. A parent-facing recommendations query was not found.

### Declared children vs accounts

`children_info` is a notebook (name, age, class, difficulties, strengths, goals, optional `linked_student_id`). `parent_student` is the real authorization link. Nothing in the parent UI keeps them in sync. Teachers may read `children_info` when `linked_student_id` is set.

## 9. Communication

### Messages — `MessagesPage.tsx`

Conversation list, thread, send, mark read, Realtime subscription on `INSERT`, and a 5-second refetch of the open thread. Search uses `profiles.full_name ilike`.

**Status: Partial.**

- Sending works for any authenticated user to any UUID (`WITH CHECK (auth.uid() = sender_id)` only). The earlier policy that limited senders to parents, teachers, and admins was replaced.
- Search returns only profiles the caller may `SELECT`. That includes anyone who has ever written a forum post or reply (see database report), not the whole directory. Many legitimate teachers will not appear until they have posted.
- No blocking, no attachment, no child-safety filter. Content is plain text.

### Forum — `ForumPage.tsx`

Posts have title, body, category, and `role_visibility` (default all four roles). Replies. Authors can delete their own rows. Admin UI does not add a moderate button.

**Status: Partial.** Reading and posting work for a user whose role is inside `role_visibility`. Confirmed: there is no admin delete policy, so the “moderate the forum” line in `admin.md` is not implemented. Visibility is a client-supplied array on insert; the insert policy does not constrain it. A student can post a row visible only to admins, or to everyone.

### Notifications — `NotificationBell.tsx`

Lists the user’s `notifications`, mark one or all read. Realtime is enabled on the table. Producers: assignment insert, homework submit, homework graded, new material, new live session, teacher recommendation, payment and renewal triggers, hourly reminder functions, and admin announcements.

**Status: Functional in code** for delivery to the bell, with the security caveat that any logged-in user can insert a notification for any `user_id`.

### Admin announcements — `AdminAnnouncementsPage.tsx`

Writes one `notifications` row per targeted user (all roles, or one role).

**Status: Functional in code, unbounded.** A few thousand users become one large insert from the browser. There is no separate announcement record, so the admin cannot edit or retract a sent blast.

## 10. Mood

`MoodPage.tsx` inserts `daily_moods` (mood enum-like text plus a note) for the current user. Parents can read linked children’s moods (RLS and `ChildProgress`).

**Status: Functional in code.** No clinical workflow, no alert to a teacher, no retention limit. Notes are free text and may contain sensitive information. Parents of a linked child can read them, which is intended. Forum profile leakage is a separate path that can expose the profile, not the mood row (moods are not world-readable).

## 11. Subscriptions and payments

### Subscription page — `SubscriptionPage.tsx`

Shows free vs premium. Premium price label is `$5 USD/mo` or `5 000 CDF/mois` (display only). Card tab calls `create-checkout`. Manage calls `customer-portal`. Downgrade calls `update-subscription` with `free`. Mobile money lists M-Pesa, Orange Money, and Airtel Money, then a toast: test mode, no charge.

History reads `payment_history` and `renewal_history`.

**Status: Partial for cards, frontend-only for mobile money.**

- Confirmed: no webhook, so `payment_history` is not written by Stripe events in this repo. The history section stays empty unless some other writer inserts rows.
- Confirmed: `check-subscription` promotes to premium and never demotes. `CourseView` reads the table, not the live Stripe flag. A canceled subscriber can keep course access.
- Confirmed: downgrade updates the table and does not cancel the Stripe subscription, so billing can continue. And the function may fail if `SUPABASE_PUBLISHABLE_KEY` is unset.
- Confirmed: `is_premium` on a course is not tied to a price. One global Stripe price unlocks the whole premium flag.
- Parents can start checkout from the children page; the Stripe customer is the signed-in email, not a separate child payer object.

### Premium feature list

Translation strings include “Offline access (coming soon)” and “AI-powered tutoring (coming soon)”. Those are labels on the plan card, not modules.

## 12. Support

`SupportWidget` (floating button on every authenticated page), `SupportPage`, `useSupport`.

Tickets: subject, category (technical, learning, homework, subscription, teacher, parent, general, academic, report), priority, status. Threaded `support_messages`, a typing indicator table, file upload to public bucket `support-files`.

**Status: Functional in code.**

- Confirmed: teachers have `SELECT` on all tickets (`Staff view all tickets`). A teacher can read another family’s subscription and welfare tickets.
- Confirmed: the ticket owner’s `UPDATE` policy is not column-limited, so a user can change status, priority, and `assigned_to` on their own ticket.
- Confirmed: support files are in a public bucket.

## 13. Teacher student list — `TeacherStudentsPage.tsx`

For the teacher’s courses: enrolled students, profile fields the teacher may see, linked parents, summed results, and a form that inserts `teacher_recommendations`.

**Status: Functional in code** for recommendations and the roster, subject to the same full-table fetch pattern. Recommendations are not surfaced on the parent “my role” page (confirmed by reading that page). Students are allowed to `SELECT` their own recommendations; no student screen was found that lists them. **Likely invisible to the people they are written for**, unless they query the API themselves.

## 14. Dashboards (home)

| Home | What it loads |
| --- | --- |
| `StudentHome` | Enrollments, recommendations of non-premium courses, subscription badge, shortcuts |
| `TeacherHome` | Own course count, enrollment count across those courses |
| `ParentHome` | Linked children count and shortcuts |
| `AdminHome` | Counts of profiles, courses, enrollments, active premium subscriptions |

**Status: Functional in code** as summaries. They inherit RLS, so a parent does not see global counts. Admin counts are exact-head queries, which is the right shape (unlike `AdminUsers`).

## 15. Analytics — `AdminAnalytics.tsx`

Four numbers: profiles, courses, results, user_badges. No cohort, no school, no retention, no revenue.

**Status: Functional in code** as those four counts. Not an analytics product. The landing statistics are unrelated.

## 16. What a DRC school would expect and will not find

Confirmed absent, not merely unfinished screens:

- Schools, classes, and timetables as entities.
- A niveau list (1re primaire through terminale) with official subjects.
- Teacher assignment to a class independent of “whoever created the course”.
- Attendance UI, report cards, term averages, bulletins.
- Exam sessions distinct from practice exercises.
- Question banks, randomized tests, or time-limited tests on the server.
- Plagiarism or file preview.
- Guardian consent workflow for minors. Date of birth is collected and not acted on. There is no minimum age check.
- SMS or USSD. Auth is email/password only. Many households in the target setting share a phone and do not have a reliable mailbox.
- Lingala and Swahili course content or UI.
- Offline lesson packs.
- Multi-admin audit log. Role changes and deletes are not written to an audit table.

## 17. Module map (where to change things later)

| Module | Main files | Tables |
| --- | --- | --- |
| Auth | `src/lib/auth.ts`, `src/hooks/useAuth.tsx`, `Signup.tsx`, `Login.tsx` | `auth.users`, `profiles`, `user_roles` |
| Profiles | `ProfilePage.tsx`, onboarding pages | `profiles`, `student_profiles`, `parent_profiles`, `teacher_profiles`, `children_info` |
| Catalog | `CourseBrowser.tsx`, `CourseView.tsx`, `useCourses.ts` | `courses`, `lessons`, `exercises`, `results`, `course_enrollments` |
| Authoring | `CreateCourse.tsx`, `CourseEditor.tsx`, `CourseMaterialsSection.tsx` | above + `course_materials`, `assignments` |
| Homework | `StudentAssignments.tsx`, `HomeworkUpload.tsx`, `TeacherSubmissionsPage.tsx` | `assignments`, `homework_submissions`, bucket `homework-files` |
| Progress | `ProgressPage.tsx`, `StudentGradesPage.tsx`, `BadgesPage.tsx`, `ChildProgress.tsx` | `results`, `badges`, `user_badges` |
| Games / tools | `GamesPage.tsx`, `components/games/*`, `ToolboxPage.tsx` | `platform_settings` only |
| Live | `TeacherLiveSessionsPage.tsx` | `live_sessions` (attendance unused) |
| People | `AdminUsers.tsx`, `ChildrenPage.tsx`, `TeacherStudentsPage.tsx` | `parent_student`, `teacher_recommendations` |
| Comms | `MessagesPage.tsx`, `ForumPage.tsx`, `NotificationBell.tsx` | `messages`, `forum_*`, `notifications` |
| Money | `SubscriptionPage.tsx`, `supabase/functions/*` | `subscriptions`, `payment_history`, `renewal_history` |
| Support | `components/support/*`, `useSupport.ts` | `support_tickets`, `support_messages`, `support_typing` |
