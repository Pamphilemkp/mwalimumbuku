# Games redesign

This is the redesign implemented after `GAMES_AUDIT.md`. The six games stay. No new game type is added. Educational purpose stays the same: memory pairs, mental arithmetic, French spelling, alphabetical order, color names (including a real Stroop round on hard), and copying French words.

The pure rules live in `lib/games/engine.ts`. The client and the Postgres grader (`public.grade_game_payload`) both implement this file. Tests feed the same fixtures to both.

## Shared rules

An attempt starts with `open_game_attempt(game, difficulty)`. Postgres draws a seed, builds the round with the seeded LCG below, and stores it. The browser plays that round. It never sends a score, WPM, or XP number that is trusted.

The duration is the code constant, which is also what the ready screen shows: easy 120 seconds, medium 105, hard 60. The easy-to-medium step is 15 seconds. The medium-to-hard step is 45 seconds. Admin `game_settings` is not applied, because the running game already ignored it and a client-supplied duration cannot be the limit.

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

## Difficulty curve

The three names stay: easy, medium, and hard. Two rules shape every round.

1. Inside one round, the first items are easier than the later items. The server builds that order from the seed. The client plays `problems[i]`, `waves[i]`, `stages[i]`, `rounds[i]`, or `words[i]` and does not choose a different next item.
2. The step from easy to medium is smaller than the step from medium to hard, in item count, in time, or in both.

| | Easy | Medium | Hard | Easy → medium | Medium → hard |
| --- | --- | --- | --- | --- | --- |
| Time | 120s | 105s | 60s | 15s | 45s |
| Memory pairs | 2 then 2 | 2 then 3 | 2 then 3 then 4 | +1 pair | +4 pairs |
| Math problems | 5 | 8 | 15 | +3 | +7 |
| Word rounds | 3 | 4 | 7 | +1 | +3 |
| Alphabet letters | 5 | 4 then 6 | 4 then 6 then 10 | +5 letters | +10 letters |
| Color rounds | 5 | 6 | 12 | +1 | +6 |
| Typing words | 8 | 9 | 12 | +1 | +3 |

Score formulas are unchanged. Counts were lowered on some medium rounds so a round cannot score more than the previous maximum:

| Game | Previous maximum | After this curve |
| --- | --- | --- |
| Memory | 100 from the formula. A perfect 4-pair clear is 92. | Same formula. Perfect clears score 92, 90, and 82 for 4, 5, and 9 pairs. |
| Math | 360, a perfect 15-answer streak: `15 × (15 + 9)`. | Hard stays 15, so 360. Easy stays 5, so 70. Medium is 8, so 136, down from 190. |
| Words | 140 (`7 × 20`) | Hard stays 7. Medium is 4, so 80, down from 100. |
| Alphabet | 30 | Still 30, and only when every stage is exact. |
| Colors | 180 (`12 × 15`) | Hard stays 12. Medium is 6, so 90, down from 120. |
| Typing | 180 (`12 × 15` at full accuracy) | Hard stays 12. Medium is 9, so 90, down from 100. |

XP stays `min(score, max(0, 400 - xpAlreadyToday))`.

WPM time, typing only: `wpmMs = min(serverElapsedMs, durationSeconds * 1000)`. A late but honest submit cannot shrink the clock to inflate WPM. The 36-hour bound is the streak grace in `REWARDS.md`, not extra play time. Events still have to fit inside the duration.

Consistency is not calculated. A consistency score needs trustworthy gaps between keys or words. The server only observes attempt start and submit. The per-key timestamps are chosen by the browser, so a script can space them evenly. Those timestamps are checked for order and for a human minimum gap, and then they are not turned into a consistency percentage.

## Memory

Purpose: remember where pairs are.

Deal: waves of pairs from the front of the animal list. Easy is 2 pairs, then 2 pairs. Medium is 2, then 3. Hard is 2, then 3, then 4. Each wave is that many animals doubled and shuffled with Fisher-Yates. The grid is 4 columns, with 44px minimum cells. The largest wave is 8 cards.

Play: one face-up selection, then a second different index, on the current wave only. A match stays open. A mismatch closes after the pair is recorded. When the wave is fully matched, the next flips belong to the next wave and indexes start again at 0. The UI refuses a third card and a second click on the same card. Arrow keys move a roving tabindex. Enter or Space flips the focused card. A flip index outside the current wave is illegal.

Scoring, once, from the flip list:

```
moves = floor(flips.length / 2)
matches = number of those pairs whose emoji match and whose indexes differ
completed = every wave is fully matched and no card is left face-up
score = completed ? max(100 - moves * 2, 20) : matches * 5
```

Flips are indexes into the wave that is still open. After a wave’s cards are all matched, the next index is read against the next wave. An illegal flip (unknown index for that wave, already matched, same index twice) rejects the payload. Time-up submits the legal flips so far, so a partial round still scores `matches * 5`.

## Mental math

Purpose: arithmetic facts.

Counts are 5, 8, and 15. Each round is split into thirds with `difficultyBand`: index below `ceil(count / 3)`, then below `ceil(2 * count / 3)`, then the rest. The first third is only `+` and `-` with a small maximum. Multiplication and division, when the level has them, arrive in a later third.

| Third | Easy | Medium | Hard |
| --- | --- | --- | --- |
| First | `+` `−` up to 5 | `+` `−` up to 10 | `+` `−` up to 12 |
| Middle | `+` `−` up to 8 | `+` `−` `×` up to 15 | `+` `−` `×` up to 20 |
| Last | `+` `−` up to 10 | `+` `−` `×` up to 20 | `+` `−` `×` `÷` up to 50 |

Multiplication is still 1–12 by 1–10, drawn after the band’s operand draw so the seed stays aligned. Division still builds an exact multiple. Subtraction is swapped so the answer is not negative. Easy 5 stays a maximum of 70. Hard 15 stays a maximum of 360.

The student types an integer and presses Enter or the button. One answer per problem. Junk such as `12abc` or `3.5` is wrong. The streak shown in the round is consecutive correct answers.

```
a correct integer answer scores 10 + streakBefore * 2, then streakBefore increases by 1
a wrong or blank answer scores 0 and sets streakBefore to 0
score = sum of those awards
```

## Word scramble

Purpose: spell the existing school words from a hint.

Counts are 3, 4, and 7. Each round draws from one difficulty band, not from every easier word at once. Easy is three draws from difficulty 1. Medium is two from difficulty 1, then two from difficulty 2. Hard is two from difficulty 1, two from difficulty 2, then three from difficulty 3. The scramble is Fisher-Yates and is dealt again while it equals the word, at most 8 times. Hints stay bilingual. The answer is not shown until that round is judged.

One guess per round. Comparison is trim plus Unicode upper case. `école` matches `ÉCOLE`. A second submit is ignored by the lock.

```
each exact word scores 20
score = 20 * correctGuesses
```

## Alphabet

Purpose: put a consecutive slice of A–Z in order.

Stages are easy `[5]`, medium `[4, 6]`, and hard `[4, 6, 10]`. Each stage’s start is `randInt(26 - count)` and its tiles are a Fisher-Yates shuffle. The player finishes one stage before the next, longer stage. Letter keys select that letter. Backspace removes only the last pick of the current stage. The undo button does the same. A letter already used in the stage is inert.

Events are `orders`, one array per stage. `atMs` has one stamp per letter that is still in those arrays.

```
perfect = every stage’s order is exactly that stage sorted A to Z, each letter once
score = perfect ? 30 : 0
```

A time-up with a missing or partial stage scores 0. One wrong stage scores 0 even if the others are exact. That keeps the skill “the whole sequence” and the old maximum of 30.

## Colors

Purpose: name colors. Hard is a Stroop round.

The eight existing colors stay. Round counts are 5, 6, and 12. Choice counts grow inside the round. Easy uses 2 choices for the first two rounds and 3 after that. Medium uses 3, then 4. Hard uses 3 choices with the word painted in that same ink for the first four rounds, then 4 Stroop choices, then 6 Stroop choices. Stroop means the name and the ink differ, and the correct swatch is the ink. Options are forced to include the ink, then shuffled. Each swatch shows its color name in text.

Swatches expose the color name to assistive tech and a visible tooltip. Number keys 1–6 pick a swatch.

```
each pick whose option id equals the ink id scores 15
score = 15 * correctPicks
```

## Typing

Purpose: copy the shown French word.

Pools stay the current easy, medium, and hard lists. Counts are 8, 9, and 12. Each bag is the shuffled shorter half, then the shuffled longer half, so a short word comes before a long one. Easy splits the list in its written order (`le un et la il`, then `de en ce tu je`) because every word is two letters. Medium and hard sort by character length, then by UTF-16 code unit, and split in half:

- Medium early: `arbre`, `livre`, `école`, `classe`. Later: `enfant`, `maison`, `manger`, `soleil`.
- Hard early: `éducation`, `bibliothèque`, `connaissance`. Later: `apprentissage`, `développement`, `mathématiques`.

The bag is exhausted before a repeat. A refill builds the same two halves again. If that refill would repeat the previous word immediately, the first two bag entries are swapped when the bag has two words. The base stays easy 5, medium 10, hard 15, so a perfect medium round scores 90 and a perfect hard round still scores 180.

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
- Colors scores the ink. On a Stroop round that is not the written word. The first four hard rounds are not Stroop.
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
