# Education audit

Lesson text, exercise answers, and game words were not checked against an external curriculum. Nothing below is a claim of curriculum compliance.

## What was checked

Grading is `gradeAnswer` in `lib/assessment/grade.ts`.

- Multiple choice, true/false, short answer, and fill-in-the-blank are exact after the function's own normalization. A wrong answer scores 0. A correct fill-in-the-blank scores the full point value.
- Partial credit applies only to `matching` when `partialCredit` is true. Half of a two-pair match scored 5 of 10 in `lib/assessment/grade.test.mts`. The same partial answer with partial credit off scored 0.
- A matching answer with a repeated key is rejected. After `attemptLimit` attempts the function returns `rejected` and does not grade again.
- Feedback is the fixed strings `Correct.` and `Not quite. Review the lesson and try again.` The result object does not include `correctAnswer`. The courses PGlite test also checks that `get_lesson_exercises` does not return the stored answer.
- Homework grades are a teacher-written integer on `homework_submissions`. The courses migration refuses a student insert that sets `grade`. That is separate from exercise points on `results.points_earned`.

Games are scored in `lib/games/engine.ts` and again in SQL (`supabase/tests/games-parity.test.mts`, which builds the same rounds and grades them).

- Memory scores a cleared board once and rejects a card matched to itself.
- Math scores a streak once and rejects a fast double submit.
- Word scramble folds accents.
- Color scores the ink, not the written word.
- Alphabet scores only when every stage is complete.
- Typing counts errors, corrections, accuracy, and words per minute from the key log, and rejects impossible timing.
- A client-supplied score or XP field is ignored (`lib/games/engine.test.mts`).

XP, levels, streaks, and badges are in `lib/rewards/economy.ts` and `lib/rewards/economy.test.mts`.

- XP equals the verified score, capped at 400 for the day (`DAILY_XP_CAP`). A non-integer or negative score grants 0.
- Level 1 starts at 0 XP. The next threshold is `25 * (level - 1) * level`.
- A streak survives an honest attempt on the next morning inside `STREAK_GRACE_MS` (36 hours) in `Asia/Nicosia`.
- Badges (`first_game`, `memory_clear`, `alphabet_perfect`, `math_streak_5`, `typing_accurate`, `color_clear`, `word_clear`, `streak_3`) come from those verified stats. One idempotency key records one grant.
- The file states that grades are not an input to XP. This audit did not re-check every screen that still shows `results.points_earned` next to XP.

## Reports

Parent and teacher report screens exist (`app/(app)/dashboard/child-progress/page.tsx`, `app/(app)/dashboard/results/page.tsx`, `app/(app)/dashboard/grades/page.tsx`). The portals test checks which attendance, session, and profile rows those roles can read. The report layouts were not opened while signed in, and the numbers on them were not compared with a mark scheme or a national curriculum.

Game copy in `src/screens/dashboard/DocsPage.tsx` still describes easy, medium, and hard timers. Whether those timers match `platform_settings` was not checked in a running session.
