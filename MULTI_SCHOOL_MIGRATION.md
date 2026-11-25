# Multi-school migration

Two forward migrations add the school model. They do not delete users, courses, parent links, or profiles, and they do not insert a school for existing rows.

| File | What it does |
| --- | --- |
| `supabase/migrations/20261125143000_multi_school_schema.sql` | Schools, memberships, years, terms, grades, classes, subjects, teacher assignments, student enrollments, class attendance, and their policies |
| `supabase/migrations/20261125143100_multi_school_record_scope.sql` | Nullable `courses.school_id`, `assignments.class_subject_id`, and `parent_student.school_id`. Replaces catalog policies so a school row is not visible through the old open policies |

`student_profiles.school_name` stays text. A null `school_id` is still the shared catalog.

## Apply

Apply this on a local or staging database first. Do not apply it to production until that run has been reviewed.

1. Confirm the database is the intended project. The linked project id in `supabase/config.toml` is the hosted project. `supabase db push` against that project is a production change.
2. Take a backup.
3. Apply the existing migrations, then the two files above, in timestamp order. On the Supabase CLI that is `supabase db reset` for a local database, or `supabase db push` only after the target is confirmed to be staging.
4. Run `node --test supabase/tests/multi-school-isolation.test.mts`.
5. Check three facts before opening the app against that database:
   - `select count(*) from public.schools` is 0 on a copy of production, because no school is invented.
   - `select count(*) from public.courses where school_id is not null` is 0.
   - `select count(*) from public.parent_student where school_id is not null` is 0.
6. A platform administrator creates a school and appoints the first school administrator. School administrators then create the year, classes, and teacher assignments. A parent of an enrolled student links a child with `link_parent_by_student_code`. The function reads the student's active membership. It does not accept a school id.

The catalog keeps working. Published courses with a null school stay visible. A student still submits homework with `grade` null and `status` pending. A student cannot set a grade. A platform administrator can read a school course and cannot grade it or mark its class register.

## What a browser cannot do

Policies and triggers both ignore a supplied school id unless the signed-in user has an active membership at that school. A student can request a pending membership and cannot activate it. A teacher cannot insert a course for another school. A parent link stores the school of the child's active membership. Direct insert of a different school id is rejected.

## Rollback

Do this with a new forward migration after the two files have run. Do not edit or delete the files that already ran, and do not rewrite git history.

Stop if any `school_id` or `class_subject_id` is not null, or if `public.schools` has rows you still need. Dropping the tables then would remove those schools. If the new tables are still empty, the rollback only removes unused structure.

Run the statements below in this order.

```sql
drop trigger if exists homework_submissions_grade on public.homework_submissions;
drop trigger if exists parent_student_school on public.parent_student;
drop trigger if exists assignments_class on public.assignments;
drop trigger if exists courses_school on public.courses;

drop function if exists public.link_parent_by_student_code(text, text);
drop function if exists public.enforce_submission_grade();
drop function if exists public.caller_can_grade_assignment(uuid);
drop function if exists public.enforce_parent_link_school();
drop function if exists public.enforce_assignment_class();
drop function if exists public.enforce_course_school();

-- Restore the policies replaced by 20261125143100.
drop policy if exists "Platform admins manage catalog courses" on public.courses;
drop policy if exists "Platform admins read school courses" on public.courses;
drop policy if exists "Published catalog courses visible" on public.courses;
drop policy if exists "School members read published school courses" on public.courses;
drop policy if exists "Parents read a linked class course" on public.courses;
drop policy if exists "School admins read school courses" on public.courses;
drop policy if exists "School admins update school courses" on public.courses;
drop policy if exists "Teachers read own courses" on public.courses;
drop policy if exists "Teachers insert courses" on public.courses;
drop policy if exists "Teachers update own courses" on public.courses;
drop policy if exists "Teachers delete own catalog courses" on public.courses;

create policy "Admins manage all courses" on public.courses for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy "Published courses visible" on public.courses for select to authenticated using (is_published = true);
create policy "Teachers delete own courses" on public.courses for delete to authenticated using (auth.uid() = teacher_id);
create policy "Teachers insert courses" on public.courses for insert to authenticated
  with check ((auth.uid() = teacher_id) and has_role(auth.uid(), 'teacher'::app_role));
create policy "Teachers update own courses" on public.courses for update to authenticated using (auth.uid() = teacher_id);
create policy "Teachers view own courses" on public.courses for select to authenticated using (auth.uid() = teacher_id);

drop policy if exists "Platform admins manage catalog enrollments" on public.course_enrollments;
drop policy if exists "Platform admins read enrollments" on public.course_enrollments;
drop policy if exists "Students enroll in published courses" on public.course_enrollments;
drop policy if exists "Students unenroll" on public.course_enrollments;
create policy "Admins manage enrollments" on public.course_enrollments for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));
create policy "Students enroll in published courses" on public.course_enrollments for insert to authenticated
  with check ((auth.uid() = user_id) and (exists (select 1 from courses c where c.id = course_enrollments.course_id and c.is_published = true)));
create policy "Students unenroll" on public.course_enrollments for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Platform admins manage catalog assignments" on public.assignments;
drop policy if exists "Platform admins read assignments" on public.assignments;
drop policy if exists "Teachers read catalog assignments" on public.assignments;
drop policy if exists "Teachers write catalog assignments" on public.assignments;
drop policy if exists "Teachers update catalog assignments" on public.assignments;
drop policy if exists "Assigned teachers read class assignments" on public.assignments;
drop policy if exists "Assigned teachers write class assignments" on public.assignments;
drop policy if exists "Assigned teachers update class assignments" on public.assignments;
drop policy if exists "Students view assignments" on public.assignments;
drop policy if exists "Parents read class assignments" on public.assignments;
drop policy if exists "School admins read school assignments" on public.assignments;
create policy "Admins manage assignments" on public.assignments for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy "Students view assignments" on public.assignments for select to authenticated using (
  (exists (select 1 from course_enrollments ce where ce.course_id = assignments.course_id and ce.user_id = auth.uid()))
  or (exists (select 1 from courses c where c.id = assignments.course_id and c.teacher_id = auth.uid()))
);
create policy "Teachers manage assignments" on public.assignments for all to authenticated
  using (exists (select 1 from courses c where c.id = assignments.course_id and c.teacher_id = auth.uid()))
  with check (exists (select 1 from courses c where c.id = assignments.course_id and c.teacher_id = auth.uid()));

drop policy if exists "Students view own submissions" on public.homework_submissions;
drop policy if exists "Students create own submissions" on public.homework_submissions;
drop policy if exists "Parents read linked submissions" on public.homework_submissions;
drop policy if exists "Teachers read gradeable submissions" on public.homework_submissions;
drop policy if exists "Teachers grade submissions" on public.homework_submissions;
drop policy if exists "School admins read school submissions" on public.homework_submissions;
drop policy if exists "Platform admins read submissions" on public.homework_submissions;
create policy "Students view own submissions" on public.homework_submissions for select using (auth.uid() = user_id);
create policy "Students create own submissions" on public.homework_submissions for insert with check (auth.uid() = user_id);
create policy "Teachers view course submissions" on public.homework_submissions for select using (exists (
  select 1 from assignments a join courses c on c.id = a.course_id
  where a.id = homework_submissions.assignment_id and c.teacher_id = auth.uid()
));
create policy "Teachers grade submissions" on public.homework_submissions for update using (exists (
  select 1 from assignments a join courses c on c.id = a.course_id
  where a.id = homework_submissions.assignment_id and c.teacher_id = auth.uid()
));
create policy "Admins manage submissions" on public.homework_submissions for all
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

drop policy if exists "Teachers manage attendance for their courses" on public.attendance;
drop policy if exists "Parents view children attendance" on public.attendance;
drop policy if exists "School admins read school attendance" on public.attendance;
drop policy if exists "Platform admins read attendance" on public.attendance;
create policy "Teachers manage attendance for their courses" on public.attendance for all to authenticated
  using (exists (select 1 from courses c where c.id = attendance.course_id and c.teacher_id = auth.uid()))
  with check (exists (select 1 from courses c where c.id = attendance.course_id and c.teacher_id = auth.uid()));
create policy "Admins manage attendance" on public.attendance for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Parents view children attendance" on public.attendance for select to authenticated
  using (exists (select 1 from parent_student ps where ps.parent_id = auth.uid() and ps.student_id = attendance.student_id));

drop policy if exists "Platform admins read student profiles" on public.student_profiles;
drop policy if exists "Teachers view enrolled student profiles" on public.student_profiles;
drop policy if exists "Parents view children student profiles" on public.student_profiles;
drop policy if exists "School admins read student profiles" on public.student_profiles;
create policy "Admins manage student profiles" on public.student_profiles for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy "Teachers view enrolled student profiles" on public.student_profiles for select to authenticated using (exists (
  select 1 from course_enrollments ce join courses c on c.id = ce.course_id
  where ce.user_id = student_profiles.user_id and c.teacher_id = auth.uid()
));
create policy "Parents view children student profiles" on public.student_profiles for select to authenticated using (exists (
  select 1 from parent_student ps where ps.parent_id = auth.uid() and ps.student_id = student_profiles.user_id
));

drop policy if exists "Parents can insert links" on public.parent_student;
drop policy if exists "Parents revoke own links" on public.parent_student;
drop policy if exists "School admins read parent links" on public.parent_student;
drop policy if exists "School admins revoke parent links" on public.parent_student;
drop policy if exists "Platform admins read parent links" on public.parent_student;
drop policy if exists "Platform admins manage unscoped parent links" on public.parent_student;
create policy "Parents can insert links" on public.parent_student for insert to authenticated
  with check (auth.uid() = parent_id and has_role(auth.uid(), 'parent'::app_role));
create policy "Admins can manage all links" on public.parent_student for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));

drop index if exists public.homework_submissions_assignment_user_idx;
drop index if exists public.parent_student_school_student_idx;
drop index if exists public.parent_student_student_id_idx;
drop index if exists public.assignments_class_subject_id_idx;
drop index if exists public.courses_school_id_idx;

alter table public.parent_student drop constraint if exists parent_student_relationship_check;
alter table public.parent_student drop constraint if exists parent_student_status_check;
alter table public.parent_student drop column if exists relationship;
alter table public.parent_student drop column if exists status;
alter table public.parent_student drop column if exists school_id;
alter table public.assignments drop column if exists class_subject_id;
alter table public.courses drop column if exists school_id;

drop table if exists public.class_attendance;
drop table if exists public.student_enrollments;
drop table if exists public.teacher_assignments;
drop table if exists public.class_subjects;
drop table if exists public.classes;
drop table if exists public.terms;
drop table if exists public.academic_years;
drop table if exists public.subjects;
drop table if exists public.grade_levels;
drop table if exists public.school_memberships;
drop table if exists public.schools;

drop function if exists public.enforce_class_attendance();
drop function if exists public.enroll_roster_in_class_course();
drop function if exists public.enroll_class_students_in_course();
drop function if exists public.enforce_student_enrollment();
drop function if exists public.enforce_teacher_assignment();
drop function if exists public.enforce_class_subject_school();
drop function if exists public.enforce_class_school();
drop function if exists public.enforce_term_calendar();
drop function if exists public.enforce_school_status_change();
drop function if exists public.enforce_school_membership();
drop function if exists public.parent_of_class(uuid, uuid);
drop function if exists public.student_in_class(uuid, uuid);
drop function if exists public.teaches_class(uuid, uuid);
drop function if exists public.teaches_class_subject(uuid, uuid);
drop function if exists public.parent_of(uuid, uuid);
drop function if exists public.active_member_of_school(uuid, uuid);
drop function if exists public.active_membership(uuid, uuid, text);
drop function if exists public.is_platform_admin(uuid);
```

Do not drop `auth.users`, `profiles`, `user_roles`, `courses`, `assignments`, `homework_submissions`, `attendance`, or `parent_student`.

## Validation already run

Docker is not available on this machine, so the Supabase CLI could not start its local stack, and these files were not pushed to the hosted database. `supabase/tests/multi-school-isolation.test.mts` applies both files on an embedded Postgres, then checks authorized access, rejected access, and cross-school reads and writes. That run passed. It is not a substitute for `supabase db reset` on staging before production.
