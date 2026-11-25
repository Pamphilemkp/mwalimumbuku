import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const here = dirname(fileURLToPath(import.meta.url));
const migrationSql = readdirSync(join(here, "../migrations"))
  .filter((name) => name.startsWith("20261125143") && name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(join(here, "../migrations", name), "utf8"))
  .join("\n");

const platform = "00000000-0000-0000-0000-000000000001";
const adminA = "00000000-0000-0000-0000-000000000002";
const adminB = "00000000-0000-0000-0000-000000000003";
const teacherA = "00000000-0000-0000-0000-000000000004";
const teacherB = "00000000-0000-0000-0000-000000000005";
const studentA = "00000000-0000-0000-0000-000000000006";
const studentB = "00000000-0000-0000-0000-000000000007";
const parentA = "00000000-0000-0000-0000-000000000008";
const outsider = "00000000-0000-0000-0000-000000000009";

const fixture = `
create schema if not exists auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create role authenticated nologin nosuperuser nobypassrls;
grant usage on schema public, auth to authenticated;
grant execute on function auth.uid() to authenticated;
alter role authenticated set search_path to public, auth;

create type public.app_role as enum ('student', 'parent', 'teacher', 'admin');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
create function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null default '',
  student_code text unique
);
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references auth.users (id) on delete set null,
  title text not null,
  description text,
  level text not null default 'beginner',
  subject text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.courses enable row level security;
create policy "Published courses visible" on public.courses for select to authenticated using (is_published = true);
create policy "Teachers manage own courses" on public.courses for all to authenticated using (auth.uid() = teacher_id);
create policy "Admins manage all courses" on public.courses for all to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Teachers insert courses" on public.courses for insert to authenticated with check (auth.uid() = teacher_id and public.has_role(auth.uid(), 'teacher'));
create policy "Teachers update own courses" on public.courses for update to authenticated using (auth.uid() = teacher_id);
create policy "Teachers view own courses" on public.courses for select to authenticated using (auth.uid() = teacher_id);
create policy "Teachers delete own courses" on public.courses for delete to authenticated using (auth.uid() = teacher_id);
grant select, insert, update, delete on public.courses to authenticated;

create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null,
  enrolled_at timestamptz not null default now(),
  unique (course_id, user_id)
);
alter table public.course_enrollments enable row level security;
create policy "Users view own enrollments" on public.course_enrollments for select to authenticated using (auth.uid() = user_id);
create policy "Students enroll in published courses" on public.course_enrollments for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.courses c where c.id = course_id and c.is_published = true));
create policy "Teachers view course enrollments" on public.course_enrollments for select to authenticated using (exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid()));
create policy "Admins manage enrollments" on public.course_enrollments for all to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Students unenroll" on public.course_enrollments for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.course_enrollments to authenticated;

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.assignments enable row level security;
create policy "Students view assignments" on public.assignments for select to authenticated using (
  exists (select 1 from public.course_enrollments ce where ce.course_id = assignments.course_id and ce.user_id = auth.uid())
  or exists (select 1 from public.courses c where c.id = assignments.course_id and c.teacher_id = auth.uid())
);
create policy "Teachers manage assignments" on public.assignments for all to authenticated using (exists (select 1 from public.courses c where c.id = assignments.course_id and c.teacher_id = auth.uid()));
create policy "Admins manage assignments" on public.assignments for all to authenticated using (public.has_role(auth.uid(), 'admin'));
grant select, insert, update, delete on public.assignments to authenticated;

create table public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  user_id uuid not null,
  file_url text not null,
  file_name text not null,
  teacher_comment text,
  grade integer,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.homework_submissions enable row level security;
create policy "Students view own submissions" on public.homework_submissions for select using (auth.uid() = user_id);
create policy "Students create own submissions" on public.homework_submissions for insert with check (auth.uid() = user_id);
create policy "Teachers view course submissions" on public.homework_submissions for select using (exists (select 1 from public.assignments a join public.courses c on c.id = a.course_id where a.id = homework_submissions.assignment_id and c.teacher_id = auth.uid()));
create policy "Teachers grade submissions" on public.homework_submissions for update using (exists (select 1 from public.assignments a join public.courses c on c.id = a.course_id where a.id = homework_submissions.assignment_id and c.teacher_id = auth.uid()));
create policy "Admins manage submissions" on public.homework_submissions for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
grant select, insert, update, delete on public.homework_submissions to authenticated;

create table public.parent_student (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (parent_id, student_id)
);
alter table public.parent_student enable row level security;
create policy "Parents can view own links" on public.parent_student for select to authenticated using (auth.uid() = parent_id);
create policy "Students can view own parent links" on public.parent_student for select to authenticated using (auth.uid() = student_id);
create policy "Parents can insert links" on public.parent_student for insert to authenticated with check (auth.uid() = parent_id and public.has_role(auth.uid(), 'parent'));
create policy "Admins can manage all links" on public.parent_student for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
grant select, insert, update, delete on public.parent_student to authenticated;

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  course_id uuid not null,
  student_id uuid not null,
  status text not null default 'present',
  marked_by uuid,
  marked_at timestamptz not null default now(),
  notes text
);
alter table public.attendance enable row level security;
create policy "Teachers manage attendance for their courses" on public.attendance for all to authenticated using (exists (select 1 from public.courses c where c.id = attendance.course_id and c.teacher_id = auth.uid())) with check (exists (select 1 from public.courses c where c.id = attendance.course_id and c.teacher_id = auth.uid()));
create policy "Admins manage attendance" on public.attendance for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Students view own attendance" on public.attendance for select to authenticated using (auth.uid() = student_id);
create policy "Parents view children attendance" on public.attendance for select to authenticated using (exists (select 1 from public.parent_student ps where ps.parent_id = auth.uid() and ps.student_id = attendance.student_id));
grant select, insert, update, delete on public.attendance to authenticated;

create table public.student_profiles (
  user_id uuid primary key,
  school_name text,
  class_level text
);
alter table public.student_profiles enable row level security;
create policy "Students manage own profile" on public.student_profiles for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins manage student profiles" on public.student_profiles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Teachers view enrolled student profiles" on public.student_profiles for select to authenticated using (exists (select 1 from public.course_enrollments ce join public.courses c on c.id = ce.course_id where ce.user_id = student_profiles.user_id and c.teacher_id = auth.uid()));
create policy "Parents view children student profiles" on public.student_profiles for select to authenticated using (exists (select 1 from public.parent_student ps where ps.parent_id = auth.uid() and ps.student_id = student_profiles.user_id));
grant select, insert, update, delete on public.student_profiles to authenticated;
`;

function peopleSql() {
  const people = [
    [platform, "admin"],
    [adminA, "teacher"],
    [adminB, null],
    [teacherA, "teacher"],
    [teacherB, "teacher"],
    [studentA, "student"],
    [studentB, "student"],
    [parentA, "parent"],
    [outsider, "student"],
  ];
  return people
    .map(([id, role]) => {
      const roleSql = role
        ? `insert into public.user_roles (user_id, role) values ('${id}', '${role}');`
        : "";
      return `
        insert into auth.users (id) values ('${id}');
        insert into public.profiles (user_id, full_name, student_code)
        values ('${id}', '${id}', 'STU-${id.slice(-4)}');
        ${roleSql}
      `;
    })
    .join("\n");
}

async function asUser(db, userId, run) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId}', false)`);
  await db.exec("set role authenticated");
  try {
    return await run();
  } finally {
    await db.exec("reset role");
  }
}

async function expectFail(run) {
  try {
    await run();
  } catch {
    return;
  }
  throw new Error("expected the database to reject this statement");
}

describe("multi-school migrations", { timeout: 120000 }, () => {
  it("does not delete or rewrite existing rows", () => {
    assert.doesNotMatch(migrationSql, /\bdelete\s+from\b/i);
    assert.doesNotMatch(migrationSql, /\bdrop\s+table\b/i);
    assert.doesNotMatch(migrationSql, /\btruncate\b/i);
    assert.doesNotMatch(migrationSql, /school_admin'::public\.app_role/);
    assert.doesNotMatch(migrationSql, /\binsert\s+into\s+public\.schools\b/i);
  });

  it("isolates schools, classes, grades, and family links", async () => {
    const db = new PGlite();
    await db.exec(fixture);
    await db.exec(peopleSql());
    await db.exec(`
      insert into public.student_profiles (user_id, school_name, class_level)
      values ('${studentA}', 'Lycee A', '6e'), ('${studentB}', 'Lycee B', '5e');
      insert into public.courses (id, teacher_id, title, subject, is_published)
      values ('10000000-0000-0000-0000-000000000001', '${teacherA}', 'Catalog', 'Math', true);
      insert into public.parent_student (parent_id, student_id)
      values ('${parentA}', '${studentA}');
    `);

    await db.exec(migrationSql);

    const untouched = await db.query(`
      select
        (select count(*) from public.schools) as schools,
        (select school_id is null from public.courses where title = 'Catalog') as catalog_unscoped,
        (select school_id is null from public.parent_student where parent_id = '${parentA}') as link_unscoped,
        (select school_name from public.student_profiles where user_id = '${studentA}') as school_name
    `);
    assert.equal(Number(untouched.rows[0].schools), 0);
    assert.equal(untouched.rows[0].catalog_unscoped, true);
    assert.equal(untouched.rows[0].link_unscoped, true);
    assert.equal(untouched.rows[0].school_name, "Lycee A");

    const schoolA = (
      await asUser(db, platform, () =>
        db.query(
          `insert into public.schools (name, slug, created_by) values ('School A', 'school-a', '${platform}') returning id`,
        ),
      )
    ).rows[0].id;
    const schoolB = (
      await asUser(db, platform, () =>
        db.query(
          `insert into public.schools (name, slug, created_by) values ('School B', 'school-b', '${platform}') returning id`,
        ),
      )
    ).rows[0].id;

    await expectFail(() =>
      asUser(db, teacherA, () =>
        db.query(`insert into public.schools (name, slug) values ('Nope', 'nope')`),
      ),
    );
    await expectFail(() =>
      asUser(db, platform, () =>
        db.query(
          `insert into public.classes (school_id, academic_year_id, grade_level_id, name) values ('${schoolA}', '${schoolA}', '${schoolA}', '1A')`,
        ),
      ),
    );

    await asUser(db, platform, () =>
      db.query(`
        insert into public.school_memberships (school_id, user_id, membership_role, status, started_on)
        values
          ('${schoolA}', '${adminA}', 'school_admin', 'active', current_date),
          ('${schoolB}', '${adminB}', 'school_admin', 'active', current_date)
      `),
    );
    await expectFail(() =>
      asUser(db, adminA, () =>
        db.query(`
          insert into public.school_memberships (school_id, user_id, membership_role, status)
          values ('${schoolA}', '${outsider}', 'school_admin', 'active')
        `),
      ),
    );

    const yearA = (
      await asUser(db, adminA, () =>
        db.query(`
          insert into public.academic_years (school_id, name, starts_on, ends_on, status)
          values ('${schoolA}', '2026', date '2026-09-01', date '2027-06-30', 'current')
          returning id
        `),
      )
    ).rows[0].id;
    await expectFail(() =>
      asUser(db, adminA, () =>
        db.query(`
          insert into public.terms (school_id, academic_year_id, name, starts_on, ends_on, sort_order)
          values
            ('${schoolB}', '${yearA}', 'Wrong school', date '2026-09-01', date '2026-12-01', 1)
        `),
      ),
    );
    await asUser(db, adminA, () =>
      db.query(`
        insert into public.terms (school_id, academic_year_id, name, starts_on, ends_on, sort_order)
        values ('${schoolA}', '${yearA}', 'Term 1', date '2026-09-01', date '2026-12-15', 1)
      `),
    );
    await expectFail(() =>
      asUser(db, adminA, () =>
        db.query(`
          insert into public.terms (school_id, academic_year_id, name, starts_on, ends_on, sort_order)
          values ('${schoolA}', '${yearA}', 'Overlap', date '2026-12-01', date '2027-03-01', 2)
        `),
      ),
    );

    const gradeA = (
      await asUser(db, adminA, () =>
        db.query(
          `insert into public.grade_levels (school_id, name, sort_order) values ('${schoolA}', '6e', 1) returning id`,
        ),
      )
    ).rows[0].id;
    const classA = (
      await asUser(db, adminA, () =>
        db.query(`
          insert into public.classes (school_id, academic_year_id, grade_level_id, name)
          values ('${schoolA}', '${yearA}', '${gradeA}', '6e A')
          returning id
        `),
      )
    ).rows[0].id;
    await expectFail(() =>
      asUser(db, platform, () =>
        db.query(`
          insert into public.classes (school_id, academic_year_id, grade_level_id, name)
          values ('${schoolA}', '${yearA}', '${gradeA}', 'Platform class')
        `),
      ),
    );
    const renamed = await asUser(db, teacherA, () =>
      db.query(`update public.classes set name = 'Taken' where id = '${classA}' returning id`),
    );
    assert.equal(renamed.rows.length, 0);
    await expectFail(() =>
      asUser(db, adminA, () =>
        db.query(`
          insert into public.classes (school_id, academic_year_id, grade_level_id, name)
          values ('${schoolB}', '${yearA}', '${gradeA}', 'Stolen')
        `),
      ),
    );

    const subjectA = (
      await asUser(db, adminA, () =>
        db.query(
          `insert into public.subjects (school_id, name) values ('${schoolA}', 'Mathematiques') returning id`,
        ),
      )
    ).rows[0].id;
    const offering = (
      await asUser(db, adminA, () =>
        db.query(`
          insert into public.class_subjects (school_id, class_id, subject_id)
          values ('${schoolA}', '${classA}', '${subjectA}')
          returning id
        `),
      )
    ).rows[0].id;

    await asUser(db, adminA, () =>
      db.query(`
        insert into public.school_memberships (school_id, user_id, membership_role, status, started_on)
        values ('${schoolA}', '${teacherA}', 'teacher', 'active', current_date)
      `),
    );
    const teacherMembership = (
      await db.query(
        `select id from public.school_memberships where user_id = '${teacherA}' and school_id = '${schoolA}'`,
      )
    ).rows[0].id;
    await asUser(db, adminA, () =>
      db.query(`
        insert into public.teacher_assignments (school_id, class_subject_id, membership_id)
        values ('${schoolA}', '${offering}', '${teacherMembership}')
      `),
    );
    const renamedByTeacher = await asUser(db, teacherA, () =>
      db.query(`update public.classes set name = 'Taken' where id = '${classA}' returning id`),
    );
    assert.equal(renamedByTeacher.rows.length, 0);
    await expectFail(() =>
      asUser(db, teacherA, () =>
        db.query(`
          insert into public.teacher_assignments (school_id, class_subject_id, membership_id)
          values ('${schoolA}', '${offering}', '${teacherMembership}')
        `),
      ),
    );

    const visibleToTeacherB = await asUser(db, teacherB, () =>
      db.query(`select id from public.classes where id = '${classA}'`),
    );
    assert.equal(visibleToTeacherB.rows.length, 0);

    await asUser(db, adminA, () =>
      db.query(`
        insert into public.school_memberships (school_id, user_id, membership_role, status, started_on)
        values ('${schoolA}', '${studentA}', 'student', 'active', current_date)
      `),
    );
    const studentMembership = (
      await db.query(
        `select id from public.school_memberships where user_id = '${studentA}' and membership_role = 'student'`,
      )
    ).rows[0].id;
    await asUser(db, adminA, () =>
      db.query(`
        insert into public.student_enrollments (school_id, academic_year_id, class_id, membership_id, enrolled_on)
        values ('${schoolA}', '${yearA}', '${classA}', '${studentMembership}', current_date)
      `),
    );
    await expectFail(() =>
      asUser(db, studentA, () =>
        db.query(`
          insert into public.school_memberships (school_id, user_id, membership_role, status)
          values ('${schoolB}', '${studentA}', 'student', 'active')
        `),
      ),
    );

    const ownEnrollment = await asUser(db, studentA, () =>
      db.query(`select id from public.student_enrollments where class_id = '${classA}'`),
    );
    assert.equal(ownEnrollment.rows.length, 1);
    const hiddenEnrollment = await asUser(db, studentB, () =>
      db.query(`select id from public.student_enrollments where class_id = '${classA}'`),
    );
    assert.equal(hiddenEnrollment.rows.length, 0);

    await asUser(db, parentA, () =>
      db.query(`select public.link_parent_by_student_code('STU-${studentA.slice(-4)}', 'mother')`),
    );
    const linked = await db.query(
      `select school_id from public.parent_student where parent_id = '${parentA}' and student_id = '${studentA}'`,
    );
    assert.equal(linked.rows[0].school_id, schoolA);
    const parentSeesClass = await asUser(db, parentA, () =>
      db.query(`select id from public.classes where id = '${classA}'`),
    );
    assert.equal(parentSeesClass.rows.length, 1);
    await expectFail(() =>
      asUser(db, parentA, () =>
        db.query(`
          insert into public.parent_student (parent_id, student_id, school_id)
          values ('${parentA}', '${studentB}', '${schoolA}')
        `),
      ),
    );

    const schoolCourse = (
      await asUser(db, teacherA, () =>
        db.query(`
          insert into public.courses (teacher_id, title, subject, is_published, school_id)
          values ('${teacherA}', 'School math', 'Math', true, '${schoolA}')
          returning id
        `),
      )
    ).rows[0].id;
    await expectFail(() =>
      asUser(db, teacherB, () =>
        db.query(`
          insert into public.courses (teacher_id, title, subject, is_published, school_id)
          values ('${teacherB}', 'Borrowed', 'Math', true, '${schoolA}')
        `),
      ),
    );
    const catalogForOutsider = await asUser(db, outsider, () =>
      db.query(`select id from public.courses where title = 'Catalog'`),
    );
    assert.equal(catalogForOutsider.rows.length, 1);
    const schoolForOutsider = await asUser(db, outsider, () =>
      db.query(`select id from public.courses where id = '${schoolCourse}'`),
    );
    assert.equal(schoolForOutsider.rows.length, 0);
    const stolen = await asUser(db, teacherB, () =>
      db.query(`update public.courses set title = 'stolen' where id = '${schoolCourse}' returning id`),
    );
    assert.equal(stolen.rows.length, 0);
    await expectFail(() =>
      asUser(db, teacherA, () =>
        db.query(`update public.courses set school_id = '${schoolB}' where id = '${schoolCourse}'`),
      ),
    );
    await expectFail(() =>
      asUser(db, outsider, () =>
        db.query(`
          insert into public.course_enrollments (course_id, user_id)
          values ('${schoolCourse}', '${outsider}')
        `),
      ),
    );

    await asUser(db, adminA, () =>
      db.query(`update public.class_subjects set course_id = '${schoolCourse}' where id = '${offering}'`),
    );
    const classAssignment = (
      await asUser(db, teacherA, () =>
        db.query(`
          insert into public.assignments (course_id, class_subject_id, title, due_date)
          values ('${schoolCourse}', '${offering}', 'Homework', now() + interval '7 days')
          returning id
        `),
      )
    ).rows[0].id;
    const hiddenAssignment = await asUser(db, teacherB, () =>
      db.query(`select id from public.assignments where id = '${classAssignment}'`),
    );
    assert.equal(hiddenAssignment.rows.length, 0);
    await asUser(db, studentA, () =>
      db.query(`
        insert into public.homework_submissions (assignment_id, user_id, file_url, file_name)
        values ('${classAssignment}', '${studentA}', 'https://files.example/a', 'a.pdf')
      `),
    );
    await expectFail(() =>
      asUser(db, studentA, () =>
        db.query(`
          insert into public.homework_submissions (assignment_id, user_id, file_url, file_name, grade, status)
          values ('${classAssignment}', '${studentA}', 'https://files.example/b', 'b.pdf', 20, 'graded')
        `),
      ),
    );
    await asUser(db, teacherA, () =>
      db.query(`
        update public.homework_submissions
        set grade = 16, status = 'graded'
        where assignment_id = '${classAssignment}' and user_id = '${studentA}'
      `),
    );
    const graded = await asUser(db, studentA, () =>
      db.query(
        `select grade from public.homework_submissions where assignment_id = '${classAssignment}'`,
      ),
    );
    assert.equal(graded.rows[0].grade, 16);
    const parentGrade = await asUser(db, parentA, () =>
      db.query(
        `select grade from public.homework_submissions where assignment_id = '${classAssignment}'`,
      ),
    );
    assert.equal(parentGrade.rows[0].grade, 16);
    const otherGrade = await asUser(db, studentB, () =>
      db.query(
        `select grade from public.homework_submissions where assignment_id = '${classAssignment}'`,
      ),
    );
    assert.equal(otherGrade.rows.length, 0);
    const adminGradeWrite = await asUser(db, adminA, () =>
      db.query(`
        update public.homework_submissions set grade = 0
        where assignment_id = '${classAssignment}' returning id
      `),
    );
    assert.equal(adminGradeWrite.rows.length, 0);
    const platformGradeWrite = await asUser(db, platform, () =>
      db.query(`
        update public.homework_submissions set grade = 0
        where assignment_id = '${classAssignment}' returning id
      `),
    );
    assert.equal(platformGradeWrite.rows.length, 0);
    const platformCanRead = await asUser(db, platform, () =>
      db.query(
        `select grade from public.homework_submissions where assignment_id = '${classAssignment}'`,
      ),
    );
    assert.equal(platformCanRead.rows[0].grade, 16);

    await asUser(db, teacherA, () =>
      db.query(`
        insert into public.class_attendance (school_id, class_id, membership_id, session_date, status, marked_by)
        values ('${schoolA}', '${classA}', '${studentMembership}', current_date, 'present', '${teacherMembership}')
      `),
    );
    const ownAttendance = await asUser(db, studentA, () =>
      db.query(`select status from public.class_attendance where class_id = '${classA}'`),
    );
    assert.equal(ownAttendance.rows[0].status, "present");
    const parentAttendance = await asUser(db, parentA, () =>
      db.query(`select status from public.class_attendance where class_id = '${classA}'`),
    );
    assert.equal(parentAttendance.rows[0].status, "present");
    const hiddenAttendance = await asUser(db, studentB, () =>
      db.query(`select status from public.class_attendance where class_id = '${classA}'`),
    );
    assert.equal(hiddenAttendance.rows.length, 0);
    await expectFail(() =>
      asUser(db, adminA, () =>
        db.query(`
          insert into public.class_attendance (school_id, class_id, membership_id, session_date, status, marked_by)
          values ('${schoolA}', '${classA}', '${studentMembership}', current_date - 1, 'absent', '${teacherMembership}')
        `),
      ),
    );

    const profileForTeacherB = await asUser(db, teacherB, () =>
      db.query(`select school_name from public.student_profiles where user_id = '${studentA}'`),
    );
    assert.equal(profileForTeacherB.rows.length, 0);
    const profileForAdminB = await asUser(db, adminB, () =>
      db.query(`select school_name from public.student_profiles where user_id = '${studentA}'`),
    );
    assert.equal(profileForAdminB.rows.length, 0);
    const profileForAdminA = await asUser(db, adminA, () =>
      db.query(`select school_name from public.student_profiles where user_id = '${studentA}'`),
    );
    assert.equal(profileForAdminA.rows[0].school_name, "Lycee A");

    await db.close();
  });
});
