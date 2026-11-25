# Games audit

Audit date: 2026-11-25. Branch base: `origin/main` at `19d2d8e`. No game code was changed for this audit.

Design notes live at the repository root (`PROJECT_OVERVIEW.md`, `SECURITY.md`, and the files next to this one), so this audit is here too.

## What was searched

- `src/components/games/`, `src/screens/dashboard/GamesPage.tsx`, `app/(app)/dashboard/games/page.tsx`
- Routes, dashboard nav, onboarding copy, and docs pages
- Names and stems: game, quiz, typing, memory, match, flashcard, puzzle, scramble, alphabet, color
- `src/components/VocalCalculator.tsx` and the toolbox page
- Supabase tables and RPCs for results, badges, points, XP, streaks, and leaderboards

## Inventory

Six playable games. Each one is a client component mounted by `GamesPage` after the student picks a card, a difficulty, and Start. The route is `/dashboard/games` (`app/(app)/dashboard/games/page.tsx`). Students and admins have the nav link. Teachers and parents do not.

Nothing else is a game. The vocal calculator is a toolbox tool. There is no flashcard, puzzle, or quiz-as-game screen. There is no placeholder game card: every card mounts a real component.

| Id | Name (FR / EN) | Component | How it starts |
| --- | --- | --- | --- |
| `memory` | Mémoire / Memory | `src/components/games/MemoryGame.tsx` | Games menu card |
| `words` | Mots mélangés / Word scramble | `src/components/games/WordScrambleGame.tsx` | Games menu card |
| `math` | Défi Maths / Mental math | `src/components/games/MathGame.tsx` | Games menu card |
| `alphabet` | Ordre Alphabétique / Alphabet | `src/components/games/AlphabetGame.tsx` | Games menu card |
| `colors` | Couleurs / Colors | `src/components/games/ColorMatchGame.tsx` | Games menu card |
| `typing` | Frappe rapide / Typing | `src/components/games/TypingGame.tsx` | Games menu card |

Shared pieces: `src/components/games/types.ts` (`TIME_LIMITS`: easy 120s, medium 90s, hard 60s), `GameTimer.tsx`, `DifficultySelector.tsx`. `GamesPage` also reads `platform_settings.game_settings` through `useGameSettings()` and shows that duration on the ready screen. The running games ignore it and use `TIME_LIMITS`. `points_multiplier` is editable in admin settings and is never read by a game.

No game writes to Supabase. `onScore` and `onGameEnd` only update React state on `GamesPage`. Leaving the page drops the score.

## Current scoring formulas

These are the expressions in the components. Nothing is sent to a server.

- Alphabet, perfect order only: `pts = 30`. Otherwise the end score passed to `onGameEnd` is `0`. Time-up passes the React `score` state, which stays `0` unless a perfect order already set it.
- Colors, each matching swatch: `pts = 15`, `score = score + 15`. A miss adds nothing.
- Math, each exact `parseInt(answer) === correctAnswer`: `pts = 10 + streak * 2`, then `streak` becomes `streak + 1`. A miss sets `streak` to `0` and adds nothing. `correctAnswer` is `num1 + num2`, `num1 - num2`, `num1 * num2`, or `Math.floor(num1 / num2)`.
- Memory, when `matches === pairCount`: `pts = Math.max(100 - moves * 2, 20)`, `total = gameScore + pts`. That effect lists `gameScore` as a dependency.
- Typing, each word whose input equals the target: easy `5`, medium `10`, hard `15`. Errors are not in the formula.
- Word scramble, each `guess.toUpperCase().trim() === word`: `pts = 20`.

There is no persisted formula. The client does not even send the number. Session points exist only in memory.

## Per-game audit

### Memory

Educational purpose: visual memory. Match pairs of animal emoji.

Rules today: easy 4 pairs, medium 6, hard 8, always 4 columns. Flip two cards. Same emoji stays open and counts as a match. Different emoji flips back after 800ms. A move is counted when the second card of a pair is flipped. Completing all pairs stops the timer and shows a toast. The restart button reshuffles. The menu timer is the shared limit.

Question quality: fixed emoji list, no reading or arithmetic. Fine for memory, not for vocabulary.

Validation: the match check compares emoji strings. It does not check that the two indexes differ.

Scoring: formula above. The completion effect calls `onScore` and `setGameScore` while depending on `gameScore`, so a finished board schedules another award on the next render. Evidence: `MemoryGame.tsx` effect with `[matches, pairCount, moves, onScore, t, elapsed, onGameEnd, gameScore]`.

Timer: a 1s `setInterval` increments `elapsed`, and `GameTimer` decrements its own `remaining`. They are not the same clock. `onGameEnd` closes over `elapsed`, so the reported time can be stale. Time-up and the completion timeout can both call `onGameEnd`.

Randomness: `sort(() => Math.random() - 0.5)`, which is not a uniform shuffle.

Difficulty: more pairs only. Hard is still 4 columns.

Completion: intended when every pair is matched. The effect can keep firing after that.

Retry: restart creates a new local board and zeroes local score. It does not invalidate an in-flight completion timeout.

Duplicate input and races: `flipCard` reads `flippedIds` and `cards` from the render closure. Two clicks before re-render can flip three cards, or the same card twice. Two indexes of the same card compare equal and count as a match.

Keyboard: none. The control is a clickable `motion.button`.

Touch: tap works. Targets are `aspect-square` in a 4-column grid, which is small on a narrow screen for 16 cards.

Accessibility: hidden faces are `?`. No accessible name, no match announcement.

Performance: one interval, a small grid. Fine.

Persistence and manipulation: score stays in React state. Refreshing wipes it. There is no server score to forge, and the local completion effect can inflate the session total without extra matches.

### Mental math

Educational purpose: mental arithmetic. Easy is addition and subtraction up to 10. Medium adds multiplication to 20. Hard adds exact division to 50, with products limited to 12 by 10.

Rules: a round count of 5, 10, or 15. The student types a number and presses the button or Enter. After 1.2s the next problem appears. A running streak is shown.

Validation: `parseInt(answer) === correctAnswer`. `parseInt` stops at the first non-digit, so `10abc` becomes `10`. Empty input is disabled. `checkAnswer` does not look at `feedback`, so Enter can submit the same correct answer many times before the timeout.

Scoring: `10 + streak * 2` per accepted correct submit. Repeated submits farm points. A wrong answer clears the streak only after the first of those calls.

Timer: same split clocks and stale `elapsed` as the other games. Time-up and the last-round timeout can both end the game.

Randomness: `Math.random` for operands and operator. Division builds an exact multiple so the quotient is an integer. Subtraction swaps so the answer is not negative. Zero is not generated as an operand.

Difficulty: operator set, operand size, and round count. The selector stays on the playing screen. Changing it rebuilds the problem (`newProblem` depends on `difficulty`) without resetting `round`, `score`, or `streak`.

Completion: after the last scheduled timeout, or when the timer hits zero. There is no server record.

Retry: Play again on `GamesPage` mounts a new component. Inside a round, repeated Enter is a retry of the same answer and also a score exploit.

Keyboard: the input and Enter work. There is no focus return documented, and the input is not a labelled field.

Touch: the input and the check button work.

Accessibility: correct and wrong are color plus a check or cross. The problem is text, so it is not color-only.

Performance: fine.

Persistence and manipulation: client-only. Farming is the repeated `checkAnswer` call.

### Word scramble

Educational purpose: spelling of school words, with a hint in the active language.

Rules: a fixed list of 11 French words tagged with difficulty 1–3. Easy uses difficulty 1 and 3 rounds, medium up to 2 and 5 rounds, hard all words and 7 rounds. The student types the word. Enter or the button submits. The hint is always visible. After 1.5s the next word appears.

Validation: `guess.toUpperCase().trim() === pool[wordIdx].word`. Accents are kept by `toUpperCase`. There is no in-flight lock, so the same correct guess can be submitted repeatedly for +20 each time.

Scoring: flat `20` per accepted correct submit.

Timer: same split-clock and double-finish behavior.

Randomness: index `Math.floor(Math.random() * pool.length)` with replacement, so rounds repeat. Scramble is Fisher-Yates and retries while the scramble equals the word, which can recurse.

Difficulty: word length and round count. Changing difficulty during play changes `pool` while `wordIdx` can point at a different word than the one on screen.

Completion: last round timeout or time-up. No persistence.

Retry: repeated submit is both the retry and the exploit. Play again starts a new local game.

Keyboard: input and Enter. No label.

Touch: works.

Accessibility: hint text and letter tiles. Feedback uses color and a mark.

Performance: fine.

Manipulation: repeated submit. No server check.

### Alphabet

Educational purpose: alphabetical order. A consecutive slice of A–Z is shuffled. Easy 5 letters, medium 8, hard 12.

Rules: tap letters in A–Z order. When every letter is chosen, the sequence is compared with the sorted slice. The undo button clears the whole selection. New letters deals again. The instruction string is `t.games.alphabetInstruction`.

Validation: `newSel.every((s, i) => s === correct[i])`. `selectLetter` returns when `selected.includes(l)`, but two clicks in the same closure both see the old array, so one letter can be appended twice.

Scoring: `30` or `0`. No partial credit. No time bonus.

Timer: same split clocks. Perfect order and time-up can both call `onGameEnd`. The perfect-order path waits 1.5s and passes `pts`, not the possibly stale `score` state. Time-up passes `score` and `elapsed` from the callback closure.

Randomness: start index is uniform over `26 - count`. The shuffle is the biased `sort` comparator.

Difficulty: slice length only. Changing it during play calls `newGame` because `count` is a `useCallback` dependency.

Completion: the selection length equals the slice, or time-up. Undo after `done` sets `done` to false but leaves `running` false, so the board is stuck until New letters.

Retry: New letters is a local reshuffle and zeroes the local score. It does not persist.

Keyboard: none. Letters are buttons, so a screen reader can activate them, but letter keys do nothing.

Touch: the tiles are `h-8 w-8` below `sm`, under a 44px target.

Accessibility: selected and error states are border color plus the glyph. No live region.

Manipulation: double-tap duplicate letter, and the score is whatever the component reports locally.

### Colors

Educational purpose: color names. Easy and medium ask which swatch matches the named color, shown in that color. Hard is labelled as a Stroop item (`stroopQuestion`: touch the ink, not the word).

Rules: 5, 8, or 12 rounds and 3, 4, or 6 swatches. One tap per round is intended. Feedback locks further taps only after render (`feedback !== null`).

Validation: a pick is correct when `options[idx].hex === targetColor.hex`. On hard, the word and the ink are both `textColor` (the distractor), and `targetColor` is a different color. Following the on-screen instruction selects the ink and is marked wrong. Evidence: `ColorMatchGame.tsx` sets `textColor` to the distractor, paints `textColor.hex`, and compares the pick with `targetColor.hex`.

Scoring: `15` per pick that hits `targetColor`, including repeated picks before re-render.

Timer: same split clocks and double `onGameEnd`.

Randomness: biased shuffle. The option list is forced to contain `target` by replacing the last slot when needed, then shuffled again.

Difficulty: round count, option count, and the broken Stroop flag.

Completion: last round or time-up. No persistence.

Keyboard: none. Swatches are unnamed color buttons.

Touch: `h-12 w-12` below `sm`.

Accessibility: the swatch has no text alternative. Correctness is a ring color. A color-blind student cannot tell the choices apart except by position, and position is not labelled.

Manipulation: double-tap farming. Hard mode does not grade the skill it asks for.

### Typing

Educational purpose: copy French words accurately. Easy is 8 short words drawn from 10. Medium is 10 words from a pool of 8. Hard is 12 long words from a pool of 6.

Rules: the word is shown as letter cells. The input must equal the word, including accents and case. Matching the word scores and loads another random word. The error line increments when the current value is non-empty and is not a prefix of the target.

Validation: equality with `currentWord`. There is no per-character commit log. Paste of the whole word scores.

Scoring: flat points per matched word. No WPM, no accuracy, no corrected-mistake term. The error counter is not a formula input.

WPM, accuracy, consistency: not computed. `elapsed` is a 1s tick and is not combined with character counts.

Timer: same split clocks. Finishing the last word calls `onGameEnd` immediately with a stale `elapsed`.

Randomness: uniform index with replacement. Medium and hard must repeat words because the round count exceeds the pool.

Difficulty: word length and points per word. Changing difficulty during play swaps the pool and calls `nextWord`.

Completion: `wordIdx >= totalWords` or time-up. No persistence.

Retry: a new word starts immediately. There is no separate retry of one word. Backspace is allowed by the input but errors never decrease.

Duplicate input: each matching `onChange` can score if it sees the old word. A second event after `setScore` but before `nextWord` commits can double-score.

Keyboard: the text field is the game. It is focused on mount.

Touch: the mobile keyboard works. Letter cells wrap.

Accessibility: cells recolor right and wrong. The error count is text. The input has no label.

Performance: fine for these word lengths.

Manipulation: paste, repeated match events, and a client-only total.

## Shared defects

`GameTimer` stores `remaining` and restarts the interval whenever `remaining` changes (`useEffect` depends on `running`, `remaining`, and `onTimeUp`). Hitting zero calls `onTimeUp` from inside the interval and again from the effect when `remaining <= 0`. Parents pass inline `handleTimeUp` closures, so the timer also resets when score or elapsed changes.

`GamesPage` adds every `onScore` into `sessionScore` and then replaces `lastScore` with the `onGameEnd` argument. Those two numbers diverge when `onScore` runs more than once per real event.

The playing screen still renders `DifficultySelector`, so the round that is underway is not the round that was started.

## Prioritized defects

| Severity | Game | Evidence | Why it matters |
| --- | --- | --- | --- |
| Critical | Memory | Completion effect depends on `gameScore` and calls `onScore(pts)` again | One cleared board keeps adding points |
| Critical | Math, word scramble | `checkAnswer` has no in-flight lock | One correct answer is paid many times |
| Critical | All | `GamesPage` never writes a result | Scores vanish, and a later client-supplied total would be unaudited |
| High | Colors | Hard mode compares the pick with `targetColor` while the instruction and the paint use `textColor` | Students who follow the instruction are marked wrong |
| High | Memory | `flipCard` uses the render closure | One card can match itself, or a third card can flip |
| High | Typing | Score is a flat per-word award. No character log | Speed, accuracy, and corrections are invisible, and paste scores |
| High | All | `GameTimer` can call `onTimeUp` more than once, and `elapsed` in the end callback is stale | Finish and time-up race, and the reported time is wrong |
| High | Colors | Swatches have no name. Alphabet and memory have no letter or arrow keys | Keyboard and screen-reader play is missing, and color is the only choice cue |
| Medium | All | Difficulty control stays mounted while `playing` | A new difficulty mutates the live round and can keep the old score |
| Medium | All | Ready screen uses `game_settings`; engines use `TIME_LIMITS` | The announced clock is not the clock that runs |
| Medium | Memory, alphabet, colors | `sort(() => Math.random() - 0.5)` | Some boards are more likely than others |
| Medium | Typing | Draw with replacement | Medium and hard repeat words before the set is seen |
| Low | Alphabet | Undo clears every pick and does not resume a finished board | The control does not match its label |
| Low | Typing | Error count increments on every non-prefix change | Holding a wrong key inflates errors after the mistake is already counted |

## Test scenarios that must lock current failures

1. Memory: a legal clear with 4 moves on easy scores once, at `Math.max(100 - 4 * 2, 20) = 92`, and a second render does not add 92 again.
2. Memory: two flips of the same card index are illegal and score nothing.
3. Math: one correct answer of `10` with streak `0` scores `10` once, even if the submit handler is invoked twice.
4. Math: `parseInt`-style junk such as `12abc` is not correct.
5. Word scramble: one correct `CHAT` scores `20` once.
6. Colors: a hard round whose word is Red and whose ink is Blue is correct only when Blue is chosen.
7. Alphabet: the order `A,B,C,D,E` for that set scores `30`. Any duplicate or omission scores `0`.
8. Typing: a pasted whole word is not a sequence of matching keystrokes and does not score. WPM uses verified characters and verified time, not a client field.
9. Timer: a duration of 60s fires the deadline once. A payload whose last event is later than the server clock, or whose gaps are below the minimum, is rejected.
10. Submission: the same attempt id and idempotency key returns the stored score and does not grant XP twice. A second key on a verified attempt is rejected. A client `score` or `xp` field is ignored.
