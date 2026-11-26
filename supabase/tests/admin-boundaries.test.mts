import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const here = dirname(fileURLToPath(import.meta.url));
const migrationSql = readFileSync(join(here, "../migrations/20261126120000_admin_audit_storage_payments.sql"), "utf8");

const platform = "00000000-0000-0000-0000-000000000001";
const adminA = "00000000-0000-0000-0000-000000000002";
const teacherA = "00000000-0000-0000-0000-000000000004";
const studentA = "00000000-0000-0000-0000-000000000006";
const schoolA = "10000000-0000-0000-0000-00000000000a";
const schoolB = "10000000-0000-0000-0000-00000000000b";

const fixture = `
create schema if not exists auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create role authenticated nologin nosuperuser nobypassrls;
create role anon nologin nosuperuser nobypassrls;
grant usage on schema public, auth to authenticated, anon;
grant execute on function auth.uid() to authenticated;

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
create function public.is_platform_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(uid, 'admin'::public.app_role)
$$;
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null default '',
  student_code text unique
);
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active'
);
create table public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id),
  user_id uuid not null references auth.users (id),
  membership_role text not null,
  status text not null default 'active',
  invited_by uuid,
  started_on date,
  ended_on date,
  unique (school_id, user_id, membership_role)
);
create function public.active_membership(uid uuid, target_school uuid, target_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.school_memberships
    where user_id = uid and school_id = target_school and membership_role = target_role and status = 'active'
  )
$$;
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  tier text not null default 'free',
  is_active boolean not null default true,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
create table public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
create table public.payment_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount numeric not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending',
  provider text,
  provider_ref text,
  description text
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  message text not null,
  type text not null default 'info'
);

alter table public.user_roles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.platform_settings enable row level security;
alter table public.payment_history enable row level security;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.platform_settings to authenticated;
grant select, insert, update, delete on public.payment_history to authenticated;
grant select, insert, update, delete on public.school_memberships to authenticated;
grant select on public.profiles to authenticated;
grant select, insert on public.notifications to authenticated;

create policy "Admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Users view own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "Admins manage subscriptions" on public.subscriptions for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Users view own subscription" on public.subscriptions for select to authenticated using (auth.uid() = user_id);
create policy "Anyone can read settings" on public.platform_settings for select to authenticated using (true);
create policy "Admins manage settings" on public.platform_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "System insert payments" on public.payment_history for insert to authenticated with check (true);
create policy "Users view own payments" on public.payment_history for select to authenticated using (auth.uid() = user_id);
`;

function peopleSql() {
  const people = [
    [platform, "admin", "90000001"],
    [adminA, "teacher", "90000002"],
    [teacherA, "teacher", "90000004"],
    [studentA, "student", "90000006"],
  ];
  return people
    .map(
      ([id, role, code]) => `
        insert into auth.users (id) values ('${id}');
        insert into public.profiles (user_id, full_name, student_code) values ('${id}', 'Person', '${code}');
        insert into public.user_roles (user_id, role) values ('${id}', '${role}');
        insert into public.subscriptions (user_id, tier) values ('${id}', 'free');
      `,
    )
    .join("\n");
}

async function asUser(db, userId, run) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId}', false)`);
  await db.exec("set role authenticated");
  try {
    return await run();
  } finally {
    await db.exec("reset role");
    await db.exec("select set_config('request.jwt.claim.sub', '', false)");
  }
}

async function errorText(run) {
  try {
    await run();
  } catch (error) {
    return String(error instanceof Error ? error.message : error);
  }
  return "";
}

describe("administration boundaries", { timeout: 120000 }, () => {
  it("does not delete stored rows", () => {
    assert.doesNotMatch(migrationSql, /\bdelete\s+from\b/i);
    assert.doesNotMatch(migrationSql, /\btruncate\s+(table\b|only\b|public\.)/i);
    assert.doesNotMatch(migrationSql, /^\s*truncate\b/im);
  });

  it("refuses self-promotion, cross-school admin, platform actions, and forged payments", async () => {
    const db = new PGlite();
    await db.exec(fixture);
    await db.exec(peopleSql());
    await db.exec(`
      insert into public.schools (id, name) values ('${schoolA}', 'School A'), ('${schoolB}', 'School B');
      insert into public.school_memberships (school_id, user_id, membership_role, status)
      values ('${schoolA}', '${adminA}', 'school_admin', 'active');
      insert into public.platform_settings (key, value) values ('game_settings', '{"easy_time": 120}'::jsonb);
    `);
    await db.exec(migrationSql);

    const roles = await db.query(`select public.signup_role('admin') as admin_role, public.signup_role('teacher') as teacher_role, public.signup_role('parent') as parent_role`);
    assert.equal(roles.rows[0].admin_role, "student");
    assert.equal(roles.rows[0].teacher_role, "student");
    assert.equal(roles.rows[0].parent_role, "parent");

    const selfGrant = await errorText(() =>
      db.exec(`
        select set_config('request.jwt.claim.sub', '${platform}', false);
        update public.user_roles set role = 'admin' where user_id = '${platform}';
      `),
    );
    assert.match(selfGrant, /cannot grant themselves a privileged role/);

    const teacherGrant = await errorText(() =>
      asUser(db, teacherA, () => db.exec(`insert into public.user_roles (user_id, role) values ('${teacherA}', 'admin')`)),
    );
    assert.notEqual(teacherGrant, "");

    const schoolAdminPlatform = await errorText(() =>
      asUser(db, adminA, () => db.exec(`insert into public.user_roles (user_id, role) values ('${studentA}', 'admin')`)),
    );
    assert.notEqual(schoolAdminPlatform, "");

    const crossSchool = await errorText(() =>
      asUser(db, adminA, () => db.exec(`select public.provision_teacher('${studentA}', '${schoolB}')`)),
    );
    assert.match(crossSchool, /not authorized for that school/);

    const selfStaff = await errorText(() =>
      asUser(db, adminA, () => db.exec(`select public.provision_teacher('${adminA}', '${schoolA}')`)),
    );
    assert.match(selfStaff, /cannot grant themselves/);

    const teacherProvision = await errorText(() =>
      asUser(db, teacherA, () => db.exec(`select public.provision_teacher('${studentA}', '${schoolA}')`)),
    );
    assert.match(teacherProvision, /not authorized for that school/);

    await asUser(db, adminA, () => db.exec(`select public.provision_teacher('${studentA}', '${schoolA}')`));
    const teacherRole = await db.query(`select role from public.user_roles where user_id = '${studentA}' and role = 'teacher'`);
    assert.equal(teacherRole.rows.length, 1);
    const membership = await db.query(`
      select status from public.school_memberships
      where user_id = '${studentA}' and school_id = '${schoolA}' and membership_role = 'teacher'
    `);
    assert.equal(membership.rows[0].status, "active");
    const audit = await asUser(db, adminA, () =>
      db.query(`select action from public.admin_audit_log where school_id = '${schoolA}'`),
    );
    assert.equal(audit.rows.some((row) => row.action === "membership.create"), true);

    const erased = await errorText(() => db.exec("delete from public.admin_audit_log"));
    assert.match(erased, /append-only/);

    await asUser(db, platform, () => db.exec(`select public.provision_teacher('${teacherA}', '${schoolB}')`));
    const schoolBAudit = await asUser(db, platform, () =>
      db.query(`select id from public.admin_audit_log where school_id = '${schoolB}'`),
    );
    assert.equal(schoolBAudit.rows.length > 0, true);
    const hiddenSchool = await asUser(db, adminA, () =>
      db.query(`select id from public.admin_audit_log where school_id = '${schoolB}'`),
    );
    assert.equal(hiddenSchool.rows.length, 0);

    const auditPrivileges = await db.query(`
      select has_function_privilege('anon', 'public.append_admin_audit(uuid,uuid,text,text,uuid,text)', 'execute') as anon_exec,
             has_function_privilege('authenticated', 'public.append_admin_audit(uuid,uuid,text,text,uuid,text)', 'execute') as user_exec
    `);
    assert.equal(auditPrivileges.rows[0].anon_exec, false);
    assert.equal(auditPrivileges.rows[0].user_exec, false);
    const forgedAudit = await errorText(() =>
      asUser(db, platform, () =>
        db.exec(`select public.append_admin_audit('${platform}', '${schoolA}', 'forged', 'notes', null, 'forged row')`),
      ),
    );
    assert.match(forgedAudit, /permission denied/i);
    const anonAudit = await errorText(async () => {
      await db.exec("set role anon");
      try {
        await db.exec(`select public.append_admin_audit('${platform}', '${schoolA}', 'forged', 'notes', null, 'forged row')`);
      } finally {
        await db.exec("reset role");
      }
    });
    assert.match(anonAudit, /permission denied/i);

    const settings = await asUser(db, adminA, () =>
      db.query(`update public.platform_settings set value = '{"easy_time": 1}'::jsonb where key = 'game_settings' returning key`),
    );
    assert.equal(settings.rows.length, 0);
    const teacherSettings = await asUser(db, teacherA, () =>
      db.query(`update public.platform_settings set value = '{"easy_time": 1}'::jsonb where key = 'game_settings' returning key`),
    );
    assert.equal(teacherSettings.rows.length, 0);

    const tier = await errorText(() =>
      asUser(db, platform, () => db.exec(`update public.subscriptions set tier = 'premium' where user_id = '${platform}'`)),
    );
    assert.match(tier, /cannot change a subscription tier/);
    const insertedTier = await errorText(() =>
      asUser(db, platform, () =>
        db.exec(`insert into public.subscriptions (user_id, tier) values ('00000000-0000-0000-0000-000000000099', 'premium')`),
      ),
    );
    assert.match(insertedTier, /cannot change a subscription tier/);
    const deletedTier = await errorText(() =>
      asUser(db, platform, () => db.exec(`delete from public.subscriptions where user_id = '${studentA}'`)),
    );
    assert.match(deletedTier, /cannot change a subscription tier/);
    await db.exec(`update public.subscriptions set tier = 'premium', is_active = true where user_id = '${studentA}'`);
    const serviceTier = await db.query(`select tier from public.subscriptions where user_id = '${studentA}'`);
    assert.equal(serviceTier.rows[0].tier, "premium");
    await db.exec(`update public.subscriptions set tier = 'free', is_active = true where user_id = '${studentA}'`);

    const forged = await errorText(() =>
      asUser(db, studentA, () =>
        db.exec(`insert into public.payment_history (user_id, amount, status, provider) values ('${studentA}', 5, 'succeeded', 'stripe')`),
      ),
    );
    assert.notEqual(forged, "");

    const token = await errorText(() =>
      db.exec(`select public.record_email_delivery('password_recovery', 'failed', 'reset-token')`),
    );
    assert.match(token, /not allowed/);
    const clientMail = await errorText(() =>
      asUser(db, adminA, () => db.exec(`select public.record_email_delivery('password_recovery', 'failed', 'provider_rejected')`)),
    );
    assert.match(clientMail, /permission denied/i);
    const anonMail = await errorText(async () => {
      await db.exec("set role anon");
      try {
        await db.exec(`select public.record_email_delivery('auth_signup', 'failed', 'provider_rejected')`);
      } finally {
        await db.exec("reset role");
      }
    });
    assert.match(anonMail, /permission denied/i);
    await db.exec(`select public.record_email_delivery('auth_signup', 'failed', 'provider_rejected')`);
    await db.exec(`
      insert into public.school_memberships (school_id, user_id, membership_role, status)
      values ('${schoolA}', '${adminA}', 'teacher', 'active')
    `);
    const notices = await asUser(db, adminA, () =>
      db.query(`select public.admin_notify_school('${schoolA}', 'Avis ecole', 'Un seul avis par personne') as delivered`),
    );
    assert.equal(Number(notices.rows[0].delivered), 2);
    const adminNotices = await db.query(`select count(*)::int as n from public.notifications where user_id = '${adminA}'`);
    assert.equal(Number(adminNotices.rows[0].n), 1);
    const mail = await asUser(db, platform, () => db.query(`select kind, detail from public.email_deliveries`));
    assert.equal(mail.rows.some((row) => row.kind === "auth_signup" && row.detail === "provider_rejected"), true);
    assert.equal(mail.rows.some((row) => row.kind === "notification" && row.detail === "notification_in_app"), true);
    const mailHidden = await asUser(db, adminA, () => db.query(`select id from public.email_deliveries`));
    assert.equal(mailHidden.rows.length, 0);

    const lookup = await asUser(db, teacherA, () => db.query(`select user_id from public.find_account_for_admin('90000006')`));
    assert.equal(lookup.rows.length, 0);
    const found = await asUser(db, adminA, () => db.query(`select user_id from public.find_account_for_admin('90000006')`));
    assert.equal(found.rows[0].user_id, studentA);

    const clientPayment = await errorText(() =>
      asUser(db, studentA, () =>
        db.exec(`
          select public.apply_payment_event(
            'evt_client', 'customer.subscription.updated', 300,
            '${studentA}', 'sync', 'premium', true, null, true,
            null, null, null, null, null
          )
        `),
      ),
    );
    assert.match(clientPayment, /permission denied/i);

    await db.exec(`
      select public.apply_payment_event(
        'evt_cancel', 'customer.subscription.deleted', 200,
        '${studentA}', 'sync', 'free', false, null, true,
        null, null, null, 'cus_student', 'sub_student'
      )
    `);
    await db.exec(`
      select public.apply_payment_event(
        'evt_old', 'customer.subscription.updated', 100,
        '${studentA}', 'sync', 'premium', true, null, true,
        5, 'USD', 'succeeded', 'cus_other', 'sub_old'
      )
    `);
    const kept = await db.query(`select tier, is_active from public.subscriptions where user_id = '${studentA}'`);
    assert.equal(kept.rows[0].tier, "free");
    assert.equal(kept.rows[0].is_active, false);
    const oldPayment = await db.query(`select status from public.payment_history where provider_ref = 'evt_old'`);
    assert.equal(oldPayment.rows.length, 1);
    const replay = await db.query(`
      select public.apply_payment_event(
        'evt_old', 'customer.subscription.updated', 100,
        '${studentA}', 'sync', 'premium', true, null, true,
        5, 'USD', 'succeeded', 'cus_other', 'sub_old'
      ) as result
    `);
    const replayResult = typeof replay.rows[0].result === "string" ? JSON.parse(replay.rows[0].result) : replay.rows[0].result;
    assert.equal(replayResult.duplicate, true);
    const replayCount = await db.query(`select count(*)::int as n from public.payment_history where provider_ref = 'evt_old'`);
    assert.equal(Number(replayCount.rows[0].n), 1);
    await db.exec(`
      select public.apply_payment_event(
        'evt_steal', 'checkout.session.completed', 300,
        '${teacherA}', 'sync', 'premium', true, null, true,
        null, null, null, 'cus_student', 'sub_student'
      )
    `);
    const owner = await db.query(`select public.stripe_refund_user('cus_student') as user_id`);
    assert.equal(owner.rows[0].user_id, studentA);
    const unknownOwner = await db.query(`select public.stripe_refund_user('cus_missing') as user_id`);
    assert.equal(unknownOwner.rows[0].user_id, null);
    const relink = await db.query(`select user_id from public.stripe_customer_links where customer_id = 'cus_other'`);
    assert.equal(relink.rows[0].user_id, studentA);
  });
});
