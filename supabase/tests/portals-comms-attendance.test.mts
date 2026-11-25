import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const here = dirname(fileURLToPath(import.meta.url));
const migrationSql = readFileSync(join(here, "../migrations/20261125170000_portals_comms_attendance.sql"), "utf8");

const platform = "00000000-0000-0000-0000-000000000001";
const teacherA = "00000000-0000-0000-0000-000000000004";
const teacherB = "00000000-0000-0000-0000-000000000005";
const studentA = "00000000-0000-0000-0000-000000000006";
const studentB = "00000000-0000-0000-0000-000000000007";
const parentA = "00000000-0000-0000-0000-000000000008";
const outsider = "00000000-0000-0000-0000-000000000009";
const catalog = "00000000-0000-0000-0000-000000000010";

const schoolA = "10000000-0000-0000-0000-00000000000a";
const schoolB = "10000000-0000-0000-0000-00000000000b";
const classA = "20000000-0000-0000-0000-00000000000a";
const classB = "20000000-0000-0000-0000-00000000000b";
const offeringA = "40000000-0000-0000-0000-00000000000a";
const offeringB = "40000000-0000-0000-0000-00000000000b";
const memberTeacherA = "50000000-0000-0000-0000-00000000000a";
const memberTeacherB = "50000000-0000-0000-0000-00000000000b";
const memberStudentA = "50000000-0000-0000-0000-00000000000c";
const memberStudentB = "50000000-0000-0000-0000-00000000000d";
const memberParentA = "50000000-0000-0000-0000-00000000000e";
const courseA = "60000000-0000-0000-0000-00000000000a";
const courseCatalog = "60000000-0000-0000-0000-00000000000b";
const sessionA = "70000000-0000-0000-0000-00000000000a";
const assignmentA = "80000000-0000-0000-0000-00000000000a";
const submissionA = "90000000-0000-0000-0000-00000000000a";
const ticketA = "a1000000-0000-0000-0000-00000000000a";
const ticketCatalog = "a1000000-0000-0000-0000-00000000000b";

const fixture = `
create schema if not exists auth;
create table auth.users (id uuid primary key);
insert into auth.users (id) values
  ('${platform}'), ('${teacherA}'), ('${teacherB}'), ('${studentA}'), ('${studentB}'),
  ('${parentA}'), ('${outsider}'), ('${catalog}');

create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create role authenticated nologin nosuperuser nobypassrls;
grant usage on schema public, auth to authenticated;
grant execute on function auth.uid() to authenticated;

create type public.app_role as enum ('student', 'parent', 'teacher', 'admin');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null
);
create function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create function public.is_platform_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(uid, 'admin'::public.app_role)
$$;

create table public.schools (id uuid primary key, name text not null);
create table public.school_memberships (
  id uuid primary key,
  school_id uuid not null references public.schools (id),
  user_id uuid not null,
  membership_role text not null,
  status text not null
);
create function public.active_member_of_school(uid uuid, target_school uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.school_memberships
    where user_id = uid and school_id = target_school and status = 'active'
  )
$$;
create function public.active_membership(uid uuid, target_school uuid, target_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.school_memberships
    where user_id = uid and school_id = target_school and membership_role = target_role and status = 'active'
  )
$$;

create table public.parent_student (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null,
  student_id uuid not null,
  status text not null default 'active'
);
alter table public.parent_student enable row level security;
create function public.parent_of(uid uuid, student_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.parent_student
    where parent_id = uid and student_id = student_user_id and status = 'active'
  )
$$;

create table public.classes (
  id uuid primary key,
  school_id uuid not null references public.schools (id),
  name text not null
);
create table public.class_subjects (
  id uuid primary key,
  school_id uuid not null,
  class_id uuid not null,
  course_id uuid
);
create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  class_subject_id uuid not null,
  membership_id uuid not null,
  ends_on date
);
create table public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  class_id uuid not null,
  membership_id uuid not null,
  status text not null
);
create function public.teaches_class(uid uuid, target_class uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.teacher_assignments assignment
    join public.class_subjects offering on offering.id = assignment.class_subject_id
    join public.school_memberships membership on membership.id = assignment.membership_id
    where offering.class_id = target_class
      and membership.user_id = uid
      and membership.membership_role = 'teacher'
      and membership.status = 'active'
      and assignment.ends_on is null
  )
$$;
create function public.student_in_class(uid uuid, target_class uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.student_enrollments enrollment
    join public.school_memberships membership on membership.id = enrollment.membership_id
    where enrollment.class_id = target_class
      and enrollment.status = 'active'
      and membership.user_id = uid
      and membership.status = 'active'
  )
$$;
create function public.parent_of_class(uid uuid, target_class uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.student_enrollments enrollment
    join public.school_memberships membership on membership.id = enrollment.membership_id
    where enrollment.class_id = target_class
      and enrollment.status = 'active'
      and membership.status = 'active'
      and public.parent_of(uid, membership.user_id)
  )
$$;

create table public.class_attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  class_id uuid not null,
  membership_id uuid not null,
  session_date date not null,
  status text not null,
  marked_by uuid not null,
  notes text,
  marked_at timestamptz not null default now(),
  unique (class_id, membership_id, session_date)
);
alter table public.class_attendance enable row level security;

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  course_id uuid not null,
  status text not null
);
alter table public.attendance enable row level security;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  full_name text not null,
  avatar_url text,
  student_code text,
  phone text,
  address text
);
alter table public.profiles enable row level security;
create policy "Users view own profile" on public.profiles for select to authenticated using (auth.uid() = user_id);

create table public.results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  is_correct boolean not null default true,
  points_earned int not null default 0
);
alter table public.results enable row level security;
create policy "Users view own results" on public.results for select to authenticated using (auth.uid() = user_id);

create table public.daily_moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mood text not null
);
alter table public.daily_moods enable row level security;

create table public.teacher_recommendations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  student_id uuid not null,
  message text not null
);
alter table public.teacher_recommendations enable row level security;

create table public.courses (
  id uuid primary key,
  teacher_id uuid,
  title text not null,
  subject text not null default 'math',
  school_id uuid,
  is_published boolean not null default true
);
create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null,
  user_id uuid not null
);
alter table public.course_enrollments enable row level security;
create policy "Users view own enrollments" on public.course_enrollments for select to authenticated using (auth.uid() = user_id);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null,
  teacher_id uuid not null,
  title text not null,
  description text,
  meeting_url text,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.live_sessions enable row level security;

create table public.assignments (
  id uuid primary key,
  course_id uuid not null,
  title text not null
);
create table public.homework_submissions (
  id uuid primary key,
  assignment_id uuid not null,
  user_id uuid not null,
  file_url text not null default 'file.pdf',
  file_name text not null default 'file.pdf',
  teacher_comment text,
  grade integer,
  status text not null default 'pending'
);
alter table public.homework_submissions enable row level security;
create policy "Students view own submissions" on public.homework_submissions for select to authenticated using (auth.uid() = user_id);
create policy "Students update own submissions" on public.homework_submissions for update to authenticated using (auth.uid() = user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  receiver_id uuid not null,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  related_id uuid,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "Users view own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "System can insert notifications" on public.notifications for insert to authenticated with check (true);
create policy "Admins manage all notifications" on public.notifications for all to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  content text not null,
  category text not null default 'general',
  role_visibility text[] not null default '{student,parent,teacher,admin}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.forum_posts enable row level security;
create table public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts (id),
  user_id uuid not null,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.forum_replies enable row level security;

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subject text not null,
  status text not null default 'open'
);
alter table public.support_tickets enable row level security;
create policy "Staff view all tickets" on public.support_tickets for select to authenticated
  using (public.has_role(auth.uid(), 'teacher') or public.has_role(auth.uid(), 'admin'));
create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null,
  sender_id uuid not null,
  body text
);
alter table public.support_messages enable row level security;
create table public.support_typing (
  ticket_id uuid not null,
  user_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (ticket_id, user_id)
);
alter table public.support_typing enable row level security;

grant select, insert, update on
  public.parent_student, public.profiles, public.results, public.daily_moods,
  public.teacher_recommendations, public.class_attendance, public.attendance,
  public.course_enrollments, public.live_sessions, public.homework_submissions,
  public.messages, public.notifications, public.forum_posts, public.forum_replies,
  public.support_tickets, public.support_messages, public.support_typing,
  public.schools, public.school_memberships, public.classes, public.class_subjects,
  public.teacher_assignments, public.student_enrollments, public.courses, public.assignments,
  public.user_roles
to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_platform_admin(uuid) to authenticated;
grant execute on function public.active_member_of_school(uuid, uuid) to authenticated;
grant execute on function public.active_membership(uuid, uuid, text) to authenticated;
grant execute on function public.parent_of(uuid, uuid) to authenticated;
grant execute on function public.teaches_class(uuid, uuid) to authenticated;
grant execute on function public.student_in_class(uuid, uuid) to authenticated;
grant execute on function public.parent_of_class(uuid, uuid) to authenticated;
`;

async function asUser(db: PGlite, userId: string, run: () => Promise<void>) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId}', false)`);
  await db.exec("set role authenticated");
  try {
    await run();
  } finally {
    await db.exec("reset role");
  }
}

async function expectFail(run: () => Promise<unknown>) {
  try {
    await run();
  } catch {
    return;
  }
  throw new Error("expected the database to reject this statement");
}

describe("portals, communication, and attendance", { timeout: 120000 }, () => {
  it("enforces parent, teacher, session, message, and notification boundaries", async () => {
    const db = new PGlite();
    await db.exec(fixture);
    await db.exec(migrationSql);
    await db.exec(`
      insert into public.user_roles (user_id, role) values
        ('${platform}', 'admin'),
        ('${teacherA}', 'teacher'),
        ('${teacherB}', 'teacher'),
        ('${studentA}', 'student'),
        ('${studentB}', 'student'),
        ('${parentA}', 'parent'),
        ('${outsider}', 'student'),
        ('${catalog}', 'student');
      insert into public.schools (id, name) values ('${schoolA}', 'School A'), ('${schoolB}', 'School B');
      insert into public.school_memberships (id, school_id, user_id, membership_role, status) values
        ('${memberTeacherA}', '${schoolA}', '${teacherA}', 'teacher', 'active'),
        ('${memberTeacherB}', '${schoolB}', '${teacherB}', 'teacher', 'active'),
        ('${memberStudentA}', '${schoolA}', '${studentA}', 'student', 'active'),
        ('${memberStudentB}', '${schoolB}', '${studentB}', 'student', 'active'),
        ('${memberParentA}', '${schoolA}', '${parentA}', 'parent', 'active');
      insert into public.classes (id, school_id, name) values
        ('${classA}', '${schoolA}', 'Class A'),
        ('${classB}', '${schoolB}', 'Class B');
      insert into public.courses (id, teacher_id, title, school_id) values
        ('${courseA}', '${teacherA}', 'Numbers', '${schoolA}'),
        ('${courseCatalog}', '${teacherA}', 'Catalog', null);
      insert into public.class_subjects (id, school_id, class_id, course_id) values
        ('${offeringA}', '${schoolA}', '${classA}', '${courseA}'),
        ('${offeringB}', '${schoolB}', '${classB}', null);
      insert into public.teacher_assignments (school_id, class_subject_id, membership_id) values
        ('${schoolA}', '${offeringA}', '${memberTeacherA}'),
        ('${schoolB}', '${offeringB}', '${memberTeacherB}');
      insert into public.student_enrollments (school_id, class_id, membership_id, status) values
        ('${schoolA}', '${classA}', '${memberStudentA}', 'active'),
        ('${schoolB}', '${classB}', '${memberStudentB}', 'active');
      insert into public.parent_student (parent_id, student_id, status) values
        ('${parentA}', '${studentA}', 'active'),
        ('${parentA}', '${studentB}', 'revoked');
      insert into public.profiles (user_id, full_name, student_code, phone, address) values
        ('${studentA}', 'Amina', '11111111', '099', 'Avenue A'),
        ('${studentB}', 'Bola', '22222222', '088', 'Avenue B'),
        ('${catalog}', 'Catalog Student', '33333333', '077', 'Hidden road'),
        ('${teacherA}', 'Teacher A', null, null, null),
        ('${parentA}', 'Parent A', null, null, null);
      insert into public.results (user_id, points_earned) values ('${studentA}', 4), ('${studentB}', 9);
      insert into public.course_enrollments (course_id, user_id) values ('${courseA}', '${studentA}');
      insert into public.live_sessions (id, course_id, teacher_id, title, scheduled_at, status) values
        ('${sessionA}', '${courseA}', '${teacherA}', 'Revision', '2026-11-25 13:00:00+00', 'scheduled');
      insert into public.assignments (id, course_id, title) values ('${assignmentA}', '${courseA}', 'Homework');
      insert into public.homework_submissions (id, assignment_id, user_id, status) values
        ('${submissionA}', '${assignmentA}', '${studentA}', 'pending');
      insert into public.messages (sender_id, receiver_id, content) values
        ('${teacherA}', '${parentA}', 'Bring the notebook');
      insert into public.notifications (user_id, title, message) values
        ('${parentA}', 'Note', 'A private note');
      insert into public.forum_posts (user_id, title, content, school_id) values
        ('${catalog}', 'Hello', 'A catalog question', null);
      insert into public.support_tickets (id, user_id, subject, school_id) values
        ('${ticketA}', '${studentA}', 'Help with class', '${schoolA}'),
        ('${ticketCatalog}', '${catalog}', 'Catalog help', null);
      insert into public.class_attendance (school_id, class_id, membership_id, session_date, status, marked_by) values
        ('${schoolA}', '${classA}', '${memberStudentA}', '2026-11-24', 'present', '${memberTeacherA}');
    `);

    await asUser(db, parentA, async () => {
      const linked = await db.query<{ student_id: string }>(`select student_id from public.parent_student`);
      assert.deepEqual(linked.rows.map((row) => String(row.student_id)).sort(), [studentA]);
      const own = await db.query(`select points_earned from public.results where user_id = '${studentA}'`);
      assert.equal(own.rows.length, 1);
      const forged = await db.query(`select points_earned from public.results where user_id = '${studentB}'`);
      assert.equal(forged.rows.length, 0);
      const hidden = await db.query(`select student_code from public.profiles where user_id = '${studentB}'`);
      assert.equal(hidden.rows.length, 0);
      const child = await db.query(`select full_name from public.profiles where user_id = '${studentA}'`);
      assert.equal(child.rows[0]?.full_name, "Amina");
      const session = await db.query(`select id from public.live_sessions where id = '${sessionA}'`);
      assert.equal(session.rows.length, 1);
    });

    await asUser(db, teacherA, async () => {
      const visible = await db.query(`select status from public.class_attendance where class_id = '${classA}'`);
      assert.equal(visible.rows.length, 1);
      const otherSchool = await db.query(`select status from public.class_attendance where class_id = '${classB}'`);
      assert.equal(otherSchool.rows.length, 0);
      await expectFail(() => db.query(`
        insert into public.class_attendance (school_id, class_id, membership_id, session_date, status, marked_by)
        values ('${schoolB}', '${classB}', '${memberStudentB}', '2026-11-25', 'present', '${memberTeacherA}')
      `));
      await db.query(`
        insert into public.class_attendance (school_id, class_id, membership_id, session_date, status, marked_by)
        values ('${schoolA}', '${classA}', '${memberStudentA}', '2026-11-25', 'present', '${memberTeacherA}')
      `);
      await expectFail(() => db.query(`
        insert into public.class_attendance (school_id, class_id, membership_id, session_date, status, marked_by)
        values ('${schoolA}', '${classA}', '${memberStudentA}', '2026-11-25', 'late', '${memberTeacherA}')
      `));
      await db.query(`
        update public.class_attendance
        set status = 'late', marked_by = '${memberTeacherA}'
        where class_id = '${classA}' and membership_id = '${memberStudentA}' and session_date = '2026-11-25'
      `);
      const history = await db.query<{ old_status: string | null; new_status: string }>(`
        select old_status, new_status from public.attendance_audit
        where session_date = '2026-11-25' and new_status = 'late'
      `);
      assert.equal(history.rows[0]?.old_status, "present");
      assert.equal(history.rows[0]?.new_status, "late");
      const ticket = await db.query(`select id from public.support_tickets where id = '${ticketA}'`);
      assert.equal(ticket.rows.length, 1);
      const otherTicket = await db.query(`select id from public.support_tickets where school_id = '${schoolB}'`);
      assert.equal(otherTicket.rows.length, 0);
    });

    await asUser(db, teacherB, async () => {
      const denied = await db.query(`select status from public.class_attendance where class_id = '${classA}'`);
      assert.equal(denied.rows.length, 0);
      const ticket = await db.query(`select id from public.support_tickets where id = '${ticketA}'`);
      assert.equal(ticket.rows.length, 0);
    });

    await asUser(db, studentA, async () => {
      const own = await db.query(`select status from public.class_attendance where membership_id = '${memberStudentA}'`);
      assert.equal(own.rows.length, 2);
      await expectFail(() => db.query(`
        insert into public.class_attendance (school_id, class_id, membership_id, session_date, status, marked_by)
        values ('${schoolA}', '${classA}', '${memberStudentA}', '2026-11-26', 'present', '${memberStudentA}')
      `));
      await expectFail(() => db.query(`
        update public.homework_submissions set grade = 100 where id = '${submissionA}'
      `));
      await expectFail(() => db.query(`
        insert into public.live_sessions (course_id, teacher_id, title, scheduled_at)
        values ('${courseA}', '${studentA}', 'Self session', '2026-11-26 13:00:00+00')
      `));
    });

    const grade = await db.query<{ grade: number | null }>(`select grade from public.homework_submissions where id = '${submissionA}'`);
    assert.equal(grade.rows[0]?.grade, null);

    await asUser(db, platform, async () => {
      await expectFail(() => db.query(`
        insert into public.class_attendance (school_id, class_id, membership_id, session_date, status, marked_by)
        values ('${schoolA}', '${classA}', '${memberStudentA}', '2026-11-27', 'present', '${memberTeacherA}')
      `));
      const updated = await db.query(`update public.homework_submissions set grade = 50 where id = '${submissionA}' returning id`);
      assert.equal(updated.rows.length, 0);
      const catalogTicket = await db.query(`select id from public.support_tickets where id = '${ticketCatalog}'`);
      assert.equal(catalogTicket.rows.length, 1);
      const schoolTicket = await db.query(`select id from public.support_tickets where id = '${ticketA}'`);
      assert.equal(schoolTicket.rows.length, 0);
    });

    await asUser(db, outsider, async () => {
      const session = await db.query(`select id from public.live_sessions where id = '${sessionA}'`);
      assert.equal(session.rows.length, 0);
      const thread = await db.query(`select content from public.messages`);
      assert.equal(thread.rows.length, 0);
      const code = await db.query(`select student_code, phone, address from public.profiles where user_id = '${catalog}'`);
      assert.equal(code.rows.length, 0);
      const label = await db.query<{ full_name: string }>(`select * from public.profile_labels where user_id = '${catalog}'`);
      assert.equal(label.rows[0]?.full_name, "Catalog Student");
      assert.equal("student_code" in (label.rows[0] ?? {}), false);
      await expectFail(() => db.query(`
        insert into public.messages (sender_id, receiver_id, content)
        values ('${teacherA}', '${outsider}', 'pretend')
      `));
      await expectFail(() => db.query(`
        insert into public.notifications (user_id, title, message)
        values ('${parentA}', 'Nope', 'for someone else')
      `));
      const foreignNote = await db.query(`select title from public.notification_preview`);
      assert.equal(foreignNote.rows.length, 0);
    });

    await asUser(db, teacherA, async () => {
      await expectFail(() => db.query(`
        insert into public.messages (sender_id, receiver_id, content)
        values ('${outsider}', '${teacherA}', 'spoofed')
      `));
      await expectFail(() => db.query(`
        insert into public.messages (sender_id, receiver_id, content)
        values ('${teacherA}', '${teacherB}', 'cross school')
      `));
      await db.query(`
        insert into public.messages (sender_id, receiver_id, content)
        values ('${teacherA}', '${parentA}', 'See you in class')
      `);
    });

    const columns = await db.query<{ column_name: string }>(`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name in ('profile_labels', 'notification_preview')
    `);
    const names = columns.rows.map((row) => row.column_name);
    for (const hidden of ["student_code", "phone", "address", "school_name"]) {
      assert.equal(names.includes(hidden), false);
    }
    assert.equal(names.includes("full_name"), true);
    assert.equal(names.includes("title"), true);

    const comment = await db.query<{ description: string }>(`
      select col_description('public.class_attendance'::regclass, attnum) as description
      from pg_attribute
      where attrelid = 'public.class_attendance'::regclass and attname = 'session_date'
    `);
    assert.match(comment.rows[0]?.description ?? "", /calendar date/i);
  });
});
