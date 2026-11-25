# Rewards

Written before the reward code. The economy below is what `lib/rewards/economy.ts` and `supabase/migrations/20261125180000_games_and_rewards.sql` implement.

## What already exists

Inspected on `origin/main` (`19d2d8e`) before this work.

Points. `public.results.points_earned` is written by `check_answer` when a student submits an exercise. The badges page, student home, progress page, parent home, child progress, and teacher rosters sum those rows and call them points. They are exercise scores. They are not spent anywhere. There is no shop. `award_badge_if_eligible` compares that sum with `badges.points_required` and inserts `user_badges` for the signed-in user. The client can ask to claim, but the function checks the sum. A direct insert policy on `user_badges` was dropped in an earlier migration.

The portals migration says exercise points, XP, and purchases do not write homework grades. That sentence is a guard on the grade trigger. There is no XP table, no XP column, and no purchase of points.

XP. Not implemented. The only “xp” hits are that grade comment and unrelated words such as `expires`.

Levels. Not stored and not derived.

Badges. `badges` plus `user_badges`, claimed from exercise points as above. No game achievements.

Streaks. The math game keeps a consecutive-correct counter in component state. It is not a calendar streak, and it is not stored. The translation key `games.streak` is that round counter.

Leaderboard. None. Parent and teacher screens list children the viewer already teaches or is linked to, with full names on those private rosters. There is no cross-school rank.

Grades. Homework grades live on submission rows and are rejected for students by `reject_student_grade`. This economy does not write those rows and does not write `results`.

## What points mean here

Points already mean exercise `points_earned`. They have a purpose: progress display and the existing point-threshold badges. They are not a wallet. This work does not add a second currency and does not add a shop. Game attempts do not insert `results`. A game score cannot move an exercise badge threshold and cannot change a grade.

## XP

XP is learning progression from a verified game attempt only.

```
grant = score <= 0 ? 0 : min(score, max(0, 400 - xpAlreadyGrantedToday))
```

`score` is the integer from `grade_game_payload` in `GAMES_REDESIGN.md`. `xpAlreadyGrantedToday` is the sum of non-reversed `game_xp` ledger amounts whose `local_day` is the attempt’s start day in `Asia/Nicosia`. The cap is 400 XP per student per that local day.

The ledger row stores `amount = grant`, `kind = 'game_xp'`, the attempt id, and the idempotency key. A client field named `xp` or `score` is not a parameter of the function.

Zero-score attempts store the attempt and grant no XP row.

## Levels

Level is derived from lifetime XP. Lifetime XP is the sum of ledger amounts that still count: `game_xp` and `reversal` rows. It is not a column anyone can edit.

```
threshold(level) = level <= 1 ? 0 : 25 * (level - 1) * level
levelForXp(xp) = xp <= 0 ? 1 : floor((1 + sqrt(1 + 4 * xp / 25)) / 2)
```

Examples: 0–49 is level 1, 50 is level 2, 150 is level 3, 300 is level 4.

## Badges

Existing point badges stay claimable through `award_badge_if_eligible`.

Game badges are rows in `badges` with a non-null `achievement_code`. The claim function refuses those rows, even if `points_required` is 0. They are inserted into `user_badges` only inside `submit_game_attempt`, after the payload has been graded, and only for the signed-in student. `ON CONFLICT (user_id, badge_id) DO NOTHING` keeps them idempotent.

Codes:

| Code | Rule on the verified attempt |
| --- | --- |
| `first_game` | Any verified attempt |
| `memory_clear` | Memory completed |
| `alphabet_perfect` | Alphabet score is 30 |
| `math_streak_5` | Math max streak is at least 5 |
| `typing_accurate` | At least 5 correct words and accuracy at least 0.9 |
| `color_clear` | Every color round correct and at least one round |
| `word_clear` | Every scramble round correct and at least one round |
| `streak_3` | Calendar streak is at least 3 after this credit |

## Streaks

Zone: `Asia/Nicosia`, the zone already used by `lib/portals/time.ts` for school times.

A verified attempt credits the local calendar date of `started_at`, not the date of the submit, when `submitted_at - started_at` is between 0 and 36 hours inclusive. That is the grace. A student who played on Monday and whose submit reached the server on Tuesday morning, inside 36 hours, still gets Monday. The credit is one row per student per local day (`streak_credit`). A second game the same day does not add a second day.

If the submit is later than 36 hours after start, the attempt can still be graded only when the timing rules in `GAMES_REDESIGN.md` allow it. Those rules reject `serverElapsedMs` above 36 hours, so a later submit is rejected and does not move the streak. The grace and the timing window are the same 36 hours on purpose: the offline retry is accepted, and an older payload is not.

Current streak, from the set of non-reversed credit days:

```
if today is credited, walk backward from today through consecutive credited days
else if yesterday is credited, walk backward from yesterday
else the current streak is 0
```

A day with no attempt still breaks the streak. A day whose attempt was honest and only late to submit, inside the grace, does not.

## Leaderboards

`my_game_leaderboards()` returns classes the caller may already see:

- a student sees classes where `student_in_class` is true
- a teacher sees classes where `teaches_class` is true
- a parent receives no board

Each row is `rank`, `label`, `xp`, `level`. `label` is `publicLearnerLabel`: the first word, then the initial of the last word and a period. A single-word name is cut at 12 characters. The function does not return `full_name`. There is no platform-wide board and no cross-school board.

Parents read `child_reward_summary(student_id)` only when `parent_of` is true. Teachers read it only for a student in a class they teach. Students read `student_reward_summary()` for themselves. Those summaries are XP, level, streak, and today’s XP. They are hung on the progress page, the badges page, the parent dossier and child-progress page, and the teacher roster that already lists that teacher’s students.

## Ledger, corrections, abuse

`reward_ledger` is append-only for clients. There is no insert, update, or delete policy for `authenticated`. `reverse_reward_entry(entry_id, reason)` is for a platform admin, a school admin of that student’s school, or a teacher of that student’s class. It inserts a `reversal` row with the negated amount and `reverses_id` pointing at the original. It does not delete or update the original. A second reversal of the same row is rejected. Reversing a `streak_credit` removes that day from the streak calculation by the same link. Reversing XP changes the derived level on the next read.

Idempotency: `submit_game_attempt` locks the attempt row. The same idempotency key returns the stored result. A different key after verification is rejected. Two overlapping submits serialize on the row lock, so only one ledger write happens.

The function uses `auth.uid()` as the student. A payload that names another user id does not move that user’s ledger. Direct inserts into `game_attempts` and `reward_ledger` fail RLS.

Grades cannot be purchased. XP is not read by grading. Points are not a way around an assessment. Reward functions do not update submission grades.

## Tests

`lib/rewards/economy.test.mts` covers the XP cap, level thresholds, streak grace (Monday start, Tuesday submit inside 36 hours keeps Monday; a missing day breaks; a submit past 36 hours does not credit), the public label, achievement codes, and a client-supplied XP value being ignored by `xpGrant`’s inputs.

`supabase/tests/games-and-rewards.test.mts` covers the SQL grader against the TypeScript fixtures, idempotent resubmit, a second key, another user’s attempt, a direct ledger insert, a reversal that keeps the original row, and a homework grade that is unchanged after a verified game.
