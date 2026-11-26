import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { buildRound, gradeGame, type GameKey, type Round } from "../../lib/games/engine.ts";

const here = dirname(fileURLToPath(import.meta.url));
const migrationSql = readFileSync(join(here, "../migrations/20261125180000_games_and_rewards.sql"), "utf8");

const prelude = `
create schema if not exists auth;
create table auth.users (id uuid primary key);
create role authenticated nologin;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon_url text,
  points_required int not null default 0,
  created_at timestamptz not null default now()
);
create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  badge_id uuid not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);
create table public.results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  points_earned int not null default 0
);
`;

function asRound(value: unknown): Round {
  return value as Round;
}

describe("sql game rules match the typescript engine", () => {
  it("builds and grades the same rounds", async () => {
    const db = new PGlite();
    await db.exec(prelude);
    await db.exec(migrationSql);
    const games: GameKey[] = ["memory", "words", "math", "alphabet", "colors", "typing"];
    const levels = ["easy", "medium", "hard"] as const;
    for (const game of games) {
      for (const difficulty of levels) {
        for (const seed of [1, 2, 42]) {
          const ts = buildRound(game, difficulty, seed);
          const sql = await db.query<{ build_game_round: Round }>(
            "select public.build_game_round($1, $2, $3) as build_game_round",
            [game, difficulty, seed],
          );
          assert.deepEqual(sql.rows[0].build_game_round, ts, `${game} ${difficulty} ${seed}`);
        }
      }
    }

    const cases: { round: Round; events: unknown; elapsed: number }[] = [];
    const math = buildRound("math", "easy", 4);
    cases.push({ round: math, events: { game: "math", answers: ["10", "12abc"], atMs: [400, 800], score: 99999 }, elapsed: 5_000 });
    const memory = buildRound("memory", "easy", 7);
    if (memory.game === "memory") {
      const flips: number[] = [];
      for (const wave of memory.waves) {
        const seen = new Map<string, number>();
        wave.forEach((emoji, index) => {
          const previous = seen.get(emoji);
          if (previous === undefined) seen.set(emoji, index);
          else flips.push(previous, index);
        });
      }
      cases.push({ round: memory, events: { game: "memory", flips, atMs: flips.map((_, index) => index * 180) }, elapsed: 20_000 });
      cases.push({ round: memory, events: { game: "memory", flips: [0, 0], atMs: [0, 180] }, elapsed: 5_000 });
    }
    const alphabet = { game: "alphabet" as const, difficulty: "easy" as const, durationSeconds: 120, stages: [["C", "A", "E", "B", "D"]] };
    cases.push({
      round: alphabet,
      events: { game: "alphabet", orders: [["A", "B", "C", "D", "E"]], atMs: [120, 240, 360, 480, 600] },
      elapsed: 4_000,
    });
    const colors = {
      game: "colors" as const,
      difficulty: "hard" as const,
      durationSeconds: 60,
      rounds: [{ word: "red", ink: "blue", options: ["red", "green", "blue"] }],
    };
    cases.push({ round: colors, events: { game: "colors", picks: [2], atMs: [300] }, elapsed: 3_000 });
    const words = {
      game: "words" as const,
      difficulty: "easy" as const,
      durationSeconds: 120,
      rounds: [{ word: "ÉCOLE", scrambled: "COÉLE", hintFr: "Lieu d'apprentissage", hintEn: "Learning place" }],
    };
    cases.push({ round: words, events: { game: "words", guesses: [" école "], atMs: [500] }, elapsed: 4_000 });
    const typing = { game: "typing" as const, difficulty: "easy" as const, durationSeconds: 120, words: ["le"] };
    cases.push({ round: typing, events: { game: "typing", keys: [["l", "x", "\b", "e"]], atMs: [40, 80, 120, 160] }, elapsed: 60_000 });
    cases.push({ round: math, events: { game: "math", answers: ["1"], atMs: [10_000] }, elapsed: 1_000 });

    for (const [index, item] of cases.entries()) {
      const expected = gradeGame(item.round, item.events, item.elapsed);
      const actual = await db.query<{ grade_game_payload: unknown }>(
        "select public.grade_game_payload($1::jsonb, $2::jsonb, $3) as grade_game_payload",
        [JSON.stringify(item.round), JSON.stringify(item.events), item.elapsed],
      );
      assert.deepEqual(actual.rows[0].grade_game_payload, expected, `grade case ${index}`);
    }
    assert.equal(asRound(math).game, "math");
  });
});

const studentA = "00000000-0000-0000-0000-000000000006";
const studentB = "00000000-0000-0000-0000-000000000007";
const teacherA = "00000000-0000-0000-0000-000000000004";
const parentA = "00000000-0000-0000-0000-000000000008";
const schoolA = "10000000-0000-0000-0000-00000000000a";
const classA = "20000000-0000-0000-0000-00000000000a";
const memberA = "50000000-0000-0000-0000-00000000000c";
const memberB = "50000000-0000-0000-0000-00000000000d";

const securityPrelude = `
create schema if not exists auth;
create table auth.users (id uuid primary key);
insert into auth.users (id) values ('${studentA}'), ('${studentB}'), ('${teacherA}'), ('${parentA}');
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create role authenticated nologin;
grant usage on schema public, auth to authenticated;
grant execute on function auth.uid() to authenticated;

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon_url text,
  points_required int not null default 0,
  created_at timestamptz not null default now()
);
create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  badge_id uuid not null references public.badges (id),
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);
create table public.results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  points_earned int not null default 0
);
create table public.schools (id uuid primary key, name text);
create table public.classes (id uuid primary key, school_id uuid, name text);
create table public.school_memberships (
  id uuid primary key,
  school_id uuid,
  user_id uuid,
  membership_role text,
  status text
);
create table public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid,
  class_id uuid,
  membership_id uuid,
  status text
);
create table public.profiles (user_id uuid primary key, full_name text);
create table public.parent_student (
  parent_id uuid,
  student_id uuid,
  status text
);
create table public.class_teachers (class_id uuid, teacher_id uuid);
create table public.homework_submissions (
  id uuid primary key,
  user_id uuid,
  grade integer
);
insert into public.schools values ('${schoolA}', 'School A');
insert into public.classes values ('${classA}', '${schoolA}', 'CM1');
insert into public.school_memberships values
  ('${memberA}', '${schoolA}', '${studentA}', 'student', 'active'),
  ('${memberB}', '${schoolA}', '${studentB}', 'student', 'active');
insert into public.student_enrollments (school_id, class_id, membership_id, status) values
  ('${schoolA}', '${classA}', '${memberA}', 'active'),
  ('${schoolA}', '${classA}', '${memberB}', 'active');
insert into public.profiles values
  ('${studentA}', 'Ada Lovelace'),
  ('${studentB}', 'Grace Hopper');
insert into public.parent_student values ('${parentA}', '${studentA}', 'active');
insert into public.class_teachers values ('${classA}', '${teacherA}');
insert into public.homework_submissions values ('90000000-0000-0000-0000-00000000000a', '${studentA}', 18);

create function public.is_platform_admin(uid uuid) returns boolean language sql stable as $$ select false $$;
create function public.parent_of(uid uuid, student uuid) returns boolean language sql stable as $$
  select exists (
    select 1 from public.parent_student
    where parent_id = uid and student_id = student and status = 'active'
  )
$$;
create function public.active_membership(uid uuid, school uuid, role text) returns boolean language sql stable as $$
  select false
$$;
create function public.teaches_class(uid uuid, target_class uuid) returns boolean language sql stable as $$
  select exists (select 1 from public.class_teachers where teacher_id = uid and class_id = target_class)
$$;
create function public.student_in_class(uid uuid, target_class uuid) returns boolean language sql stable as $$
  select exists (
    select 1
    from public.student_enrollments as enrollment
    join public.school_memberships as membership on membership.id = enrollment.membership_id
    where enrollment.class_id = target_class
      and enrollment.status = 'active'
      and membership.user_id = uid
      and membership.status = 'active'
      and membership.membership_role = 'student'
  )
$$;
`;

describe("verified game results and rewards", () => {
  it("stores one recomputed result and blocks replay, other users, and grade changes", async () => {
    assert.equal(migrationSql.includes("homework_submissions"), false);
    const db = new PGlite();
    await db.exec(securityPrelude);
    await db.exec(migrationSql);
    await db.exec(`select set_config('request.jwt.claim.sub', '${studentA}', false)`);
    await db.exec("set role authenticated");
    const opened = await db.query<{ open_game_attempt: { attemptId: string; round: { stages: string[][] } } }>(
      "select public.open_game_attempt('alphabet', 'easy') as open_game_attempt",
    );
    const attempt = opened.rows[0].open_game_attempt;
    const orders = attempt.round.stages.map((stage) => stage.slice().sort());
    const events = {
      game: "alphabet",
      orders,
      atMs: orders.flat().map((_, index) => (index + 1) * 120),
      score: 99999,
      xp: 99999,
    };
    await db.exec("reset role");
    await db.query("update public.game_attempts set started_at = clock_timestamp() - interval '10 seconds' where id = $1", [
      attempt.attemptId,
    ]);
    await db.exec(`select set_config('request.jwt.claim.sub', '${studentA}', false)`);
    await db.exec("set role authenticated");
    const key = "11111111-1111-1111-1111-111111111111";
    const first = await db.query<{ submit_game_attempt: { ok: boolean; score: number; xpGranted: number; replayed: boolean } }>(
      "select public.submit_game_attempt($1::uuid, $2::uuid, $3::jsonb) as submit_game_attempt",
      [attempt.attemptId, key, JSON.stringify(events)],
    );
    assert.equal(first.rows[0].submit_game_attempt.ok, true);
    assert.equal(first.rows[0].submit_game_attempt.score, 30);
    assert.equal(first.rows[0].submit_game_attempt.xpGranted, 30);
    assert.equal(first.rows[0].submit_game_attempt.replayed, false);
    const second = await db.query<{ submit_game_attempt: { replayed: boolean; xpGranted: number } }>(
      "select public.submit_game_attempt($1::uuid, $2::uuid, $3::jsonb) as submit_game_attempt",
      [attempt.attemptId, key, JSON.stringify(events)],
    );
    assert.equal(second.rows[0].submit_game_attempt.replayed, true);
    assert.equal(second.rows[0].submit_game_attempt.xpGranted, 30);
    await assert.rejects(
      db.query("select public.submit_game_attempt($1::uuid, $2::uuid, $3::jsonb)", [
        attempt.attemptId,
        "22222222-2222-2222-2222-222222222222",
        JSON.stringify(events),
      ]),
      /replay/,
    );
    await db.exec("reset role");
    const xpRows = await db.query<{ count: string }>(
      "select count(*)::text as count from public.reward_ledger where kind = 'game_xp'",
    );
    assert.equal(xpRows.rows[0].count, "1");
    const original = await db.query<{ id: string }>("select id from public.reward_ledger where kind = 'game_xp'");
    const grade = await db.query<{ grade: number }>("select grade from public.homework_submissions");
    assert.equal(grade.rows[0].grade, 18);

    await db.exec(`select set_config('request.jwt.claim.sub', '${studentB}', false)`);
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select public.submit_game_attempt($1::uuid, $2::uuid, $3::jsonb)", [
        attempt.attemptId,
        key,
        JSON.stringify(events),
      ]),
      /not found/,
    );
    await assert.rejects(
      db.exec(
        `insert into public.reward_ledger (user_id, kind, amount, local_day, attempt_id, idempotency_key) values ('${studentB}', 'game_xp', 99999, '2026-11-25', '${attempt.attemptId}', '${key}')`,
      ),
    );
    await db.exec("reset role");
    const stillOne = await db.query<{ count: string }>(
      "select count(*)::text as count from public.reward_ledger where kind = 'game_xp'",
    );
    assert.equal(stillOne.rows[0].count, "1");

    await db.exec(`select set_config('request.jwt.claim.sub', '${parentA}', false)`);
    await db.exec("set role authenticated");
    const child = await db.query<{ reward_summary: { xp: number } }>(
      "select public.reward_summary($1::uuid) as reward_summary",
      [studentA],
    );
    assert.equal(child.rows[0].reward_summary.xp, 30);
    await assert.rejects(db.query("select public.reward_summary($1::uuid)", [studentB]), /not allowed/);
    const parentBoard = await db.query<{ my_game_leaderboards: unknown[] }>(
      "select public.my_game_leaderboards() as my_game_leaderboards",
    );
    assert.deepEqual(parentBoard.rows[0].my_game_leaderboards, []);

    await db.exec("reset role");
    await db.exec(`select set_config('request.jwt.claim.sub', '${studentA}', false)`);
    await db.exec("set role authenticated");
    const board = await db.query<{ my_game_leaderboards: { rows: { label: string }[] }[] }>(
      "select public.my_game_leaderboards() as my_game_leaderboards",
    );
    const labels = JSON.stringify(board.rows[0].my_game_leaderboards);
    assert.equal(labels.includes("Lovelace"), false);
    assert.equal(labels.includes("Hopper"), false);
    assert.equal(labels.includes("Ada L."), true);
    assert.equal(labels.includes("Grace H."), true);
    await assert.rejects(
      db.query("select public.reverse_reward_entry($1::uuid, 'Eleve ne peut pas')", [original.rows[0].id]),
      /not allowed/,
    );

    await db.exec("reset role");
    await db.exec(`select set_config('request.jwt.claim.sub', '${teacherA}', false)`);
    await db.exec("set role authenticated");
    const reversed = await db.query<{ reverse_reward_entry: { ok: boolean } }>(
      "select public.reverse_reward_entry($1::uuid, $2) as reverse_reward_entry",
      [original.rows[0].id, "Correction de partie"],
    );
    assert.equal(reversed.rows[0].reverse_reward_entry.ok, true);
    await db.exec("reset role");
    const history = await db.query<{ kind: string; amount: number }>(
      "select kind, amount from public.reward_ledger where user_id = $1 order by created_at, kind",
      [studentA],
    );
    assert.equal(history.rows.some((row) => row.kind === "game_xp" && row.amount === 30), true);
    assert.equal(history.rows.some((row) => row.kind === "reversal" && row.amount === -30), true);
    const lifetime = await db.query<{ game_lifetime_xp: number }>("select public.game_lifetime_xp($1::uuid) as game_lifetime_xp", [
      studentA,
    ]);
    assert.equal(lifetime.rows[0].game_lifetime_xp, 0);
    const gradeAfter = await db.query<{ grade: number }>("select grade from public.homework_submissions");
    assert.equal(gradeAfter.rows[0].grade, 18);
  });
});
