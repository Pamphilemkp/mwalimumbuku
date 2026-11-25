# Games redesign

This is the redesign implemented after `GAMES_AUDIT.md`. The six games stay. No new game type is added. Educational purpose stays the same: memory pairs, mental arithmetic, French spelling, alphabetical order, color names (including a real Stroop round on hard), and copying French words.

The pure rules live in `lib/games/engine.ts`. The client and the Postgres grader (`public.grade_game_payload`) both implement this file. Tests feed the same fixtures to both.

## Shared rules

An attempt starts with `open_game_attempt(game, difficulty)`. Postgres draws a seed, builds the round with the seeded LCG below, and stores it. The browser plays that round. It never sends a score, WPM, or XP number that is trusted.

The duration is the code constant, which is also what the ready screen shows: easy 120 seconds, medium 90, hard 60. Admin `game_settings` is not applied, because the running game already ignored it and a client-supplied duration cannot be the limit.

The clock is one deadline. When the attempt arrives, the client stores `serverNow` and `startedAt` and paints remaining time from that offset. `onTimeUp` fires once. The server does not trust the painted clock. It trusts `started_at` and the event timestamps under the rules below.

Difficulty is chosen before Start and then locked. Play again opens a new attempt id and a new seed.

Input uses a synchronous ref lock so a second click or key, in the same turn, is ignored. Touch targets are at least 44px. Letter, number, and arrow keys are described per game. Feedback is text, not color alone, and errors are announced in an `aria-live` region.

### Seed

```
state starts at (seed >>> 0) or 1 if that is 0
state = (imul32(1664525, state) + 1013904223) mod 2^32
unit = state / 2^32
randInt(n) = floor(unit * n)
shuffle is Fisher-Yates with randInt(i + 1)
```

`imul32` keeps the low 32 bits. The same recurrence is in `lib/games/engine.ts` and `public.game_rng_next`.

### Timing

`serverElapsedMs` is the server clock from `started_at` to submit. `eventsMs` are client timestamps from local start, one per accepted action, strictly increasing.

Reject the payload when any of these is true:

- a timestamp is missing, not an integer, or negative
- a timestamp is greater than `durationSeconds * 1000`
- two timestamps are closer than the game minimum gap
- the last timestamp is greater than `serverElapsedMs + 250` (the claim is ahead of the server clock by more than a small skew)
- `serverElapsedMs` is negative or greater than 36 hours

Minimum gaps: math 300ms, colors 250ms, words 400ms, alphabet 120ms, memory 180ms, typing 40ms per key.

WPM time, typing only: `wpmMs = min(serverElapsedMs, durationSeconds * 1000)`. A late but honest submit cannot shrink the clock to inflate WPM. The 36-hour bound is the streak grace in `REWARDS.md`, not extra play time. Events still have to fit inside the duration.

Consistency is not calculated. A consistency score needs trustworthy gaps between keys or words. The server only observes attempt start and submit. The per-key timestamps are chosen by the browser, so a script can space them evenly. Those timestamps are checked for order and for a human minimum gap, and then they are not turned into a consistency percentage.

## Memory

Purpose: remember where pairs are.

Deal: easy 4 pairs, medium 6, hard 8, from the existing animal list, shuffled as a doubled deck with Fisher-Yates. The grid is 4 columns on a wide screen and 4 on a narrow screen as well, with larger gaps and 44px minimum cells so 16 cards still fit.

Play: one face-up selection, then a second different index. A match stays open. A mismatch closes after the pair is recorded. The UI refuses a third card and a second click on the same card. Arrow keys move a roving tabindex. Enter or Space flips the focused card.

Scoring, once, from the flip list:

```
moves = floor(flips.length / 2)
matches = number of those pairs whose emoji match and whose indexes differ
completed = matches === pairCount and flips.length === pairCount * 2 and every flip was legal
score = completed ? max(100 - moves * 2, 20) : matches * 5
```

An illegal flip (unknown index, already matched, same index twice, a third flip before the pair resolves) rejects the payload. Time-up submits the legal flips so far, so a partial board still scores `matches * 5`.

## Mental math

Purpose: arithmetic facts.

Generation matches the old ranges: easy `+` and `-` with operands up to 10, medium adds `×` up to 20, hard adds `÷` up to 50. Multiplication is 1–12 by 1–10. Division builds an exact multiple. Subtraction is swapped so the answer is not negative. Round counts stay 5, 10, and 15.

The student types an integer and presses Enter or the button. One answer per problem. Junk such as `12abc` or `3.5` is wrong. The streak shown in the round is consecutive correct answers.

```
a correct integer answer scores 10 + streakBefore * 2, then streakBefore increases by 1
a wrong or blank answer scores 0 and sets streakBefore to 0
score = sum of those awards
```

## Word scramble

Purpose: spell the existing school words from a hint.

Pools and round counts stay: easy words of difficulty 1, 3 rounds; medium up to difficulty 2, 5 rounds; hard the full list, 7 rounds. The scramble is Fisher-Yates and is dealt again while it equals the word, at most 8 times. Hints stay bilingual. The answer is not shown until that round is judged.

One guess per round. Comparison is trim plus Unicode upper case. `école` matches `ÉCOLE`. A second submit is ignored by the lock.

```
each exact word scores 20
score = 20 * correctGuesses
```

## Alphabet

Purpose: put a consecutive slice of A–Z in order.

Counts stay 5, 8, and 12. The slice start is `randInt(26 - count)`. The tiles are a Fisher-Yates shuffle. Letter keys select that letter. Backspace removes only the last pick. The undo button does the same. A letter already used is inert.

```
perfect = the submitted order is exactly the slice sorted A to Z, each letter once
score = perfect ? 30 : 0
```

A time-up with a partial order scores 0. That keeps the skill “the whole sequence”, which is what the old game graded, without the double-submit path.

## Colors

Purpose: name colors. Hard is a Stroop round.

The eight existing colors stay. Round counts stay 5, 8, and 12. Choice counts stay 3, 4, and 6. Easy and medium show the color name in that same ink and ask which color it is. Hard shows a name in a different ink and asks for the ink. The correct swatch is the ink. The word is the other color. Options are forced to include the ink, then shuffled.

Swatches expose the color name to assistive tech and a visible tooltip. Number keys 1–6 pick a swatch.

```
each pick whose option id equals the ink id scores 15
score = 15 * correctPicks
```

## Typing

Purpose: copy the shown French word.

Pools stay the current easy, medium, and hard lists. Counts stay 8, 10, and 12. Words are dealt from a shuffled bag so the pool is exhausted before a repeat. If a refill would repeat the previous word immediately, the first two bag entries are swapped when the bag has two words.

The field accepts one new character at a time. A paste or a multi-character insertion is dropped. Backspace removes one character.

Replay of the key log:

```
an inserted character that is not the next character of the target counts as one error
a backspace that removes a character which was not the expected character at that index counts as one corrected mistake
a word is correct when the final replayed text equals the target
correctChars = sum, over words, of the length of the correct prefix of the final text
accuracy = correctChars / (correctChars + errors) when the denominator is not 0, else 0
base = easy 5, medium 10, hard 15
score = round(correctWords * base * accuracy)
wpm = 0 when correctChars is 0 or wpmMs is 0, else round10((correctChars / 5) / (wpmMs / 60000))
```

`round10` is one decimal place. `wpmMs` is the timing rule above. Errors, corrected mistakes, accuracy, and WPM are stored on the verified attempt from this replay. Consistency is omitted for the reason in the shared section.

## Result submission

`submit_game_attempt(attempt_id, idempotency_key, events)` loads the caller’s open row with `FOR UPDATE`, grades it with `grade_game_payload`, and stores the payload, the recomputed score, and the stats. The function takes no score argument.

The same attempt id and the same idempotency key return the stored row and do not write a second reward. A different key on an already verified attempt is a replay and is rejected. Events that do not match the stored round, or timings that fail the rules above, are rejected and not stored as a success.

Verified rows are the only rows that grant XP. The mapping is in `REWARDS.md`. Grades and `results.points_earned` are not written.

## Test scenarios

Rules:

- Memory rejects a self-match and a third flip, and scores a partial board as `matches * 5`.
- Math rejects `12abc` and scores a two-correct streak as `10` then `12`.
- Colors scores the ink on a hard round, not the word.
- Alphabet scores `30` only for the full sorted slice.
- Typing drops a multi-character insert, counts a wrong letter plus a repairing backspace as one error and one corrected mistake, and scores a clean word at the difficulty base.

Calculations:

- Memory, 4 pairs in 4 moves: `92`. Memory, 4 pairs in 50 moves: `20`.
- Typing, 8 easy words, 40 correct characters, 0 errors, `wpmMs = 60000`: score `40`, WPM `8.0`, accuracy `1`.
- Typing, 1 correct 2-letter word and 1 error: accuracy `2/3`, score `round(5 * 2/3) = 3`.
- Daily XP and levels are specified in `REWARDS.md` and tested there.

Timing:

- Gaps below the minimum are rejected.
- A last event later than `serverElapsedMs + 250` is rejected, including a fast script that stamps a 2 second answer onto a 100ms request.
- A submit 2 hours after start is still gradable when the events fit in the duration. WPM uses `min(serverElapsedMs, durationMs)`, so the late submit does not invent a 2-second clock.
- The deadline callback fires once.

Submission:

- A body that includes `score: 99999` still stores the recomputed score.
- Reusing the idempotency key does not insert a second ledger row.
- A second key on the same attempt is rejected.
- A student session cannot verify another student’s attempt id.
