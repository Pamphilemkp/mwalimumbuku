# Re-engineering Authentication & Onboarding

A large, multi-area change. Plan grouped by layer so we can ship incrementally without breaking existing dashboards.

## 1. Database (Supabase migration)

Extend `profiles` and add structured role-specific tables. Keep `profiles` as the canonical identity row (already auto-created by `handle_new_user`).

### Extend `public.profiles`
Add nullable columns shared across roles:
- `avatar_url` (exists), `gender`, `date_of_birth`, `phone`, `address`, `country`, `city`, `preferred_language`, `bio`, `onboarding_completed boolean default false`, `onboarding_step int default 0`.

### New table `public.student_profiles`
- `user_id` (PK, FK→auth.users), `school_name`, `student_id_external`, `class_level`, `academic_goals text`, `subjects_of_interest text[]`, `weak_subjects text[]`, `learning_language`, `emergency_contact_name`, `emergency_contact_phone`, `guardian_info jsonb`.

### New table `public.parent_profiles`
- `user_id` (PK), `occupation`, `communication_language`, `relationship_to_child`, `number_of_children int`.

### New table `public.children_info`
For each declared child (separate from auth-linked students):
- `id`, `parent_id`, `full_name`, `class_level`, `age`, `learning_difficulties text`, `weaknesses text`, `strengths text`, `behavioral_notes text`, `goals text`, `linked_student_id uuid null` (optional link if child has account).

### New table `public.teacher_profiles`
- `user_id` (PK), `qualification`, `years_experience int`, `subjects_taught text[]`, `levels_handled text[]`, `certifications text[]`, `bio`, `availability jsonb`.

### Grants & RLS
Each table: standard grants (`authenticated`, `service_role`). Policies:
- Owner full access (`auth.uid() = user_id` / `parent_id`).
- Admins full access via `has_role`.
- Teachers can read student_profiles of enrolled students.
- Parents can read teacher_profiles of teachers tied to their children.

### Trigger
Extend `handle_new_user` to insert role-specific empty profile row (student_profiles / parent_profiles / teacher_profiles) based on `raw_user_meta_data.role`.

## 2. Auth & onboarding flow

### Signup (`/signup`)
Step 1 only: role selection + email + password + full name (current minimal flow).
On success → redirect to `/onboarding/{role}` instead of dashboard.

### `ProtectedRoute`
If `profile.onboarding_completed = false` and route ≠ `/onboarding/*`, redirect to `/onboarding/{role}`.

### Onboarding pages (new)
- `src/pages/onboarding/StudentOnboarding.tsx`
- `src/pages/onboarding/ParentOnboarding.tsx`
- `src/pages/onboarding/TeacherOnboarding.tsx`

Each is a **multi-step wizard** using a shared `OnboardingWizard` component:
- Progress bar (step X / Y)
- Mobile-friendly (single column, large touch targets)
- Validation per step with `zod` + `react-hook-form`
- Autosave: every step submit upserts partial data + bumps `profiles.onboarding_step`. On reload, wizard resumes at saved step.
- Final step marks `onboarding_completed=true`.

Steps per role:
- **Student**: (1) Identity (name, gender, DOB, avatar) (2) Contact (phone, address, country, city, emergency contact) (3) School (school, student id, class, learning language) (4) Goals (academic goals, subjects of interest, weak subjects) (5) Guardian info.
- **Parent**: (1) Identity + avatar (2) Contact (phone, address, occupation, language) (3) Relationship + number of children (4) Per-child loop (dynamic list with add/remove).
- **Teacher**: (1) Identity (2) Contact (3) Qualification, years experience, certifications (4) Subjects taught + levels (5) Bio + availability schedule.

Existing `OnboardingPage.tsx` (interactive guide) renames to `OnboardingGuidePage.tsx` and moves to `/dashboard/guide` so nav doesn't conflict.

### Avatar upload
Reuse Supabase Storage; create `avatars` bucket (public) in same migration. Upload via `supabase.storage`.

## 3. Parent "My Role As Parent" section

New page `src/pages/dashboard/ParentRolePage.tsx` at `/dashboard/my-role`, added to parent nav (icon `HeartHandshake`). Sections:
- How to support your child (curated tips, bilingual content from translations)
- What your child should improve (auto-derived from latest results: lowest accuracy subjects per linked child)
- Teacher recommendations (reads `messages` from teachers + dedicated `parent_recommendations` view — for now: list teacher messages tagged or recent)
- Learning strategies (static bilingual content)
- Behavioral observations (reads `daily_moods` of linked children, summarized)
- Academic progress (links to existing ChildProgress)
- Recommended exercises & courses (links to CourseBrowser filtered by child's weak subjects)

Use existing data; no new tables needed for v1 (static + derived).

## 4. Admin tooling

Existing admin pages cover most of this. Add:
- `AdminAnnouncementsPage` (`/dashboard/announcements`): admin posts a notification broadcast to all users or by role (writes into `notifications` for each user). New nav entry.
- `AdminAssignTeacherPage` (`/dashboard/assign-teachers`): UI to link a teacher to a student's class — uses existing `course_enrollments` indirectly; simple page that lets admin add teacher to courses or directly send a `parent_student`-style assignment via existing tables. (Minimal v1: list teachers and their courses; "assign student to course" action.)

Subscriptions, analytics, moderation, settings already exist.

## 5. UI polish

- New `OnboardingWizard` reusable component (progress bar + steps + nav buttons).
- All forms validated with `zod`.
- Responsive grid (`grid-cols-1 md:grid-cols-2`) for fields.
- Friendly bilingual labels added to `translations.ts` under `onboarding.*`.

## 6. Routing (`App.tsx`)

Add:
- `/onboarding/student`, `/onboarding/parent`, `/onboarding/teacher` (public-after-auth)
- `/dashboard/my-role` (parent)
- `/dashboard/announcements` (admin)
- `/dashboard/assign-teachers` (admin)

## Out of scope (existing & untouched)
- Stripe / payments
- Assignments grading flow
- Forum / messaging
- Games / toolbox

## Technical notes
- Trigger update is idempotent (uses `ON CONFLICT DO NOTHING` for new role rows).
- Avatar bucket public read; write restricted to `auth.uid() = (storage.foldername(name))[1]`.
- Migration order: extend profiles → create new tables + grants + RLS → update `handle_new_user` → create avatars bucket + policies.
- All new role tables use `user_id` as PK to enforce 1:1.
- `children_info` is 1:N keyed on `parent_id`.

## Delivery order
1. Migration (DB + storage + trigger).
2. `OnboardingWizard` + 3 role onboarding pages + route guard.
3. Signup redirect change.
4. Parent "My Role" page + nav.
5. Admin announcements + assign-teachers pages + nav.
6. Translations + responsive polish.

Approve and I'll start with the migration.
