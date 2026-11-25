import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const here = dirname(fileURLToPath(import.meta.url));
const migrationSql = readFileSync(join(here, "../migrations/20261125160000_courses_and_assessment.sql"), "utf8");

const teacher = "00000000-0000-0000-0000-000000000004";
const student = "00000000-0000-0000-0000-000000000006";
const other = "00000000-0000-0000-0000-000000000007";

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

create type public.app_role as enum ('student', 'parent', 'teacher', 'admin');
create function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable as $$ select false $$;
create function public.is_platform_admin(_user_id uuid)
returns boolean language sql stable as $$ select false $$;
create function public.active_member_of_school(_user_id uuid, _school_id uuid)
returns boolean language sql stable as $$ select false $$;
create function public.active_membership(_user_id uuid, _school_id uuid, _role text)
returns boolean language sql stable as $$ select false $$;
create function public.parent_of_class(_parent_id uuid, _class_id uuid)
returns boolean language sql stable as $$ select false $$;

create table public.parent_student (
  parent_id uuid not null,
  student_id uuid not null,
  status text not null default 'active'
);
create function public.parent_of(uid uuid, student_user_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.parent_student
    where parent_id = uid and student_id = student_user_id and status = 'active'
  )
$$;

create schema if not exists storage;
grant usage on schema storage to authenticated;
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text,
  name text
);
grant select on storage.objects to authenticated;
create table public.class_subjects (
  course_id uuid,
  class_id uuid
);
grant select on public.class_subjects, public.parent_student to authenticated;

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid,
  title text not null,
  description text,
  level text not null default 'beginner',
  subject text not null,
  is_published boolean not null default false,
  school_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.courses enable row level security;
create policy "Published catalog courses visible" on public.courses for select to authenticated using (is_published = true and school_id is null);
create policy "Teachers read own courses" on public.courses for select to authenticated using (auth.uid() = teacher_id);
grant select, insert, update, delete on public.courses to authenticated;

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  content text,
  sort_order int not null default 0
);
alter table public.lessons enable row level security;
create policy "Lessons visible if course accessible" on public.lessons for select to authenticated using (true);
grant select, insert, update, delete on public.lessons to authenticated;

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  question text not null,
  options jsonb,
  correct_answer text not null,
  exercise_type text not null default 'multiple_choice',
  points int not null default 10,
  created_at timestamptz not null default now()
);
alter table public.exercises enable row level security;
grant select, insert, update, delete on public.exercises to authenticated;

create table public.results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  answer text,
  is_correct boolean not null,
  points_earned int not null,
  created_at timestamptz not null default now()
);
alter table public.results enable row level security;
create policy "Users view own results" on public.results for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own results" on public.results for insert to authenticated with check (auth.uid() = user_id);
grant select, insert, update on public.results to authenticated;

create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null,
  enrolled_at timestamptz not null default now(),
  unique (course_id, user_id)
);
alter table public.course_enrollments enable row level security;
create policy "Students enroll in published courses" on public.course_enrollments for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.courses c where c.id = course_id and c.is_published));
create policy "Users view own enrollments" on public.course_enrollments for select to authenticated using (auth.uid() = user_id);
grant select, insert on public.course_enrollments to authenticated;

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.assignments enable row level security;
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
  created_at timestamptz not null default now()
);
alter table public.homework_submissions enable row level security;
create policy "Students create own submissions" on public.homework_submissions for insert to authenticated with check (auth.uid() = user_id);
create policy "Students view own submissions" on public.homework_submissions for select to authenticated using (auth.uid() = user_id);
create policy "Students update own submissions" on public.homework_submissions for update to authenticated using (auth.uid() = user_id);
grant select, insert, update on public.homework_submissions to authenticated;
`;

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

async function expectMessage(run, pattern) {
  try {
    await run();
  } catch (error) {
    assert.match(String(error), pattern);
    return;
  }
  throw new Error("expected the database to reject this statement");
}

describe("courses and assessment", { timeout: 120000 }, () => {
  it("keeps grades, answers, enrollment, and files on the server", async () => {
    const db = new PGlite();
    await db.exec(fixture);
    await db.exec(`
      insert into auth.users (id) values ('${teacher}'), ('${student}'), ('${other}');
      insert into public.courses (id, teacher_id, title, subject, is_published)
      values
        ('10000000-0000-0000-0000-000000000001', '${teacher}', 'Numbers', 'Math', true),
        ('10000000-0000-0000-0000-000000000002', '${teacher}', 'Draft', 'Math', false);
      insert into public.lessons (id, course_id, title, content)
      values
        ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Count', 'Count the objects.'),
        ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Hidden', 'Secret lesson.');
      insert into public.exercises (id, lesson_id, question, correct_answer, exercise_type, points)
      values
        ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '2 + 2', 'secret-key', 'short_answer', 10),
        ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Match', 'cat=chat|dog=chien', 'matching', 10),
        ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'Hidden', 'secret-key', 'short_answer', 10);
      insert into public.assignments (id, course_id, title, due_date)
      values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Worksheet', now());
    `);
    await db.exec(`
      create function public.get_lesson_exercises(_lesson_id uuid)
      returns table(id uuid, question text, options jsonb, exercise_type text, points int, created_at timestamptz)
      language sql stable as $$
        select null::uuid, null::text, null::jsonb, null::text, null::int, null::timestamptz where false
      $$;
    `);
    await db.exec(migrationSql);
    await db.exec(`
      update public.exercises set attempt_limit = 1 where id = '30000000-0000-0000-0000-000000000001';
      update public.exercises set partial_credit = true where id = '30000000-0000-0000-0000-000000000002';
    `);

    const wrong = await asUser(db, student, () =>
      db.query(`select public.check_answer('30000000-0000-0000-0000-000000000001', 'nope') as result`),
    );
    const wrongText = JSON.stringify(wrong.rows[0].result);
    assert.equal(wrongText.includes("secret-key"), false);
    assert.equal(wrong.rows[0].result.is_correct, false);
    assert.equal(wrong.rows[0].result.points_earned, 0);

    await expectFail(() =>
      asUser(db, student, () =>
        db.query(`select public.check_answer('30000000-0000-0000-0000-000000000001', 'secret-key')`),
      ),
    );
    const attempts = await db.query(
      `select count(*)::int as count from public.results where exercise_id = '30000000-0000-0000-0000-000000000001'`,
    );
    assert.equal(attempts.rows[0].count, 1);

    await expectFail(() =>
      asUser(db, student, () =>
        db.query(
          `insert into public.results (user_id, exercise_id, answer, is_correct, points_earned)
           values ('${student}', '30000000-0000-0000-0000-000000000001', 'secret-key', true, 100)`,
        ),
      ),
    );

    const partial = await asUser(db, student, () =>
      db.query(`select public.check_answer('30000000-0000-0000-0000-000000000002', 'cat=chat|dog=wrong') as result`),
    );
    assert.equal(partial.rows[0].result.points_earned, 5);
    assert.equal(partial.rows[0].result.is_correct, false);

    const hidden = await asUser(db, student, () =>
      db.query(`select * from public.get_lesson_exercises('20000000-0000-0000-0000-000000000002')`),
    );
    assert.equal(hidden.rows.length, 0);
    const visible = await asUser(db, student, () =>
      db.query(`select * from public.get_lesson_exercises('20000000-0000-0000-0000-000000000001')`),
    );
    assert.equal(JSON.stringify(visible.rows).includes("secret-key"), false);
    assert.equal(JSON.stringify(visible.rows).includes("correct_answer"), false);

    await expectFail(() =>
      asUser(db, student, () => db.query(`select public.check_answer('30000000-0000-0000-0000-000000000003', 'secret-key')`)),
    );

    await db.exec(`
      insert into public.courses (id, teacher_id, title, subject, is_published, school_id)
      values ('10000000-0000-0000-0000-000000000003', '${teacher}', 'School math', 'Math', true, '50000000-0000-0000-0000-000000000001');
      insert into public.lessons (id, course_id, title, content)
      values ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'School lesson', 'Members only.');
      insert into public.exercises (id, lesson_id, question, correct_answer, exercise_type, points)
      values ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', 'School question', 'secret-key', 'short_answer', 10);
    `);
    const schoolExercises = await asUser(db, student, () =>
      db.query(`select * from public.get_lesson_exercises('20000000-0000-0000-0000-000000000003')`),
    );
    assert.equal(schoolExercises.rows.length, 0);
    const schoolLessons = await asUser(db, student, () =>
      db.query(`select id from public.lessons where id = '20000000-0000-0000-0000-000000000003'`),
    );
    assert.equal(schoolLessons.rows.length, 0);
    await expectFail(() =>
      asUser(db, student, () => db.query(`select public.check_answer('30000000-0000-0000-0000-000000000004', 'secret-key')`)),
    );

    await db.exec(`update public.courses set archived = true where id = '10000000-0000-0000-0000-000000000001'`);
    const archived = await asUser(db, student, () =>
      db.query(`select id from public.courses where id = '10000000-0000-0000-0000-000000000001'`),
    );
    assert.equal(archived.rows.length, 0);
    await expectFail(() =>
      asUser(db, student, () =>
        db.query(
          `insert into public.course_enrollments (course_id, user_id) values ('10000000-0000-0000-0000-000000000001', '${student}')`,
        ),
      ),
    );
    await db.exec(`update public.courses set archived = false where id = '10000000-0000-0000-0000-000000000001'`);
    await asUser(db, student, () =>
      db.query(
        `insert into public.course_enrollments (course_id, user_id) values ('10000000-0000-0000-0000-000000000001', '${student}')`,
      ),
    );
    await expectFail(() =>
      asUser(db, student, () =>
        db.query(
          `insert into public.course_enrollments (course_id, user_id) values ('10000000-0000-0000-0000-000000000001', '${student}')`,
        ),
      ),
    );

    await asUser(db, student, () =>
      db.query(
        `insert into public.lesson_progress (user_id, lesson_id) values ('${student}', '20000000-0000-0000-0000-000000000001')`,
      ),
    );
    await db.exec(`
      insert into public.lessons (id, course_id, title)
      values ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Fresh lesson');
    `);
    await expectMessage(
      () =>
        asUser(db, other, () =>
          db.query(
            `insert into public.lesson_progress (user_id, lesson_id) values ('${student}', '20000000-0000-0000-0000-000000000004')`,
          ),
        ),
      /row-level security/i,
    );

    const homeworkPath = `${student}/40000000-0000-0000-0000-000000000001/notes.pdf`;
    await db.exec(`
      insert into public.assignments (id, course_id, title, due_date)
      values
        ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Grade check', now()),
        ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'File check', now());
      insert into storage.objects (bucket_id, name)
      values
        ('homework-files', '${homeworkPath}'),
        ('homework-files', '${student}/40000000-0000-0000-0000-000000000002/notes.pdf');
    `);
    await asUser(db, student, () =>
      db.query(
        `insert into public.homework_submissions (assignment_id, user_id, file_url, file_name)
         values ('40000000-0000-0000-0000-000000000001', '${student}', '${homeworkPath}', 'notes.pdf')`,
      ),
    );
    await expectMessage(
      () =>
        asUser(db, student, () =>
          db.query(
            `insert into public.homework_submissions (assignment_id, user_id, file_url, file_name, grade)
             values ('40000000-0000-0000-0000-000000000002', '${student}', '${student}/40000000-0000-0000-0000-000000000002/notes.pdf', 'notes.pdf', 20)`,
          ),
        ),
      /students cannot set a grade/,
    );
    await expectMessage(
      () =>
        asUser(db, student, () =>
          db.query(
            `insert into public.homework_submissions (assignment_id, user_id, file_url, file_name)
             values ('40000000-0000-0000-0000-000000000001', '${student}', '${homeworkPath}', 'notes.pdf')`,
          ),
        ),
      /resubmission is closed/,
    );
    await expectMessage(
      () =>
        asUser(db, student, () =>
          db.query(
            `insert into public.homework_submissions (assignment_id, user_id, file_url, file_name)
             values ('40000000-0000-0000-0000-000000000003', '${student}', '${student}/40000000-0000-0000-0000-000000000003/run.exe', 'run.exe')`,
          ),
        ),
      /file type is not allowed/,
    );
    const grade = await db.query(
      `select grade from public.homework_submissions where user_id = '${student}'`,
    );
    assert.equal(grade.rows[0].grade, null);
    assert.equal(migrationSql.includes("UPDATE public.homework_submissions"), false);
  });
});
