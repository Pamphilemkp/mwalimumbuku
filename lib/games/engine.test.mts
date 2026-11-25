import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRound,
  checkTiming,
  foldWord,
  gradeGame,
  gradeSubmittedBody,
  mathValue,
  replayTypingWord,
  rngNext,
  TIME_LIMITS,
} from "./engine.ts";

describe("game engine", () => {
  it("keeps the seeded LCG on the low 32 bits", () => {
    let state = 1;
    const reference = (current: number) => (Math.imul(1664525, current) + 1013904223) >>> 0;
    for (let i = 0; i < 5; i += 1) {
      const step = rngNext(state);
      state = reference(state || 1);
      assert.equal(step.state, state);
    }
  });

  it("builds a stable round and a legal memory deck", () => {
    const first = buildRound("memory", "easy", 42);
    const second = buildRound("memory", "easy", 42);
    assert.deepEqual(first, second);
    if (first.game !== "memory") return;
    assert.equal(first.deck.length, 8);
    assert.equal(first.durationSeconds, TIME_LIMITS.easy);
    const counts = new Map<string, number>();
    for (const face of first.deck) counts.set(face, (counts.get(face) ?? 0) + 1);
    for (const count of counts.values()) assert.equal(count, 2);
  });

  it("scores a cleared memory board once", () => {
    const round = buildRound("memory", "easy", 7);
    if (round.game !== "memory") return;
    const flips: number[] = [];
    const seen = new Map<string, number>();
    for (let index = 0; index < round.deck.length; index += 1) {
      const face = round.deck[index];
      const previous = seen.get(face);
      if (previous === undefined) seen.set(face, index);
      else flips.push(previous, index);
    }
    const atMs = flips.map((_, index) => index * 180);
    const graded = gradeGame(round, { game: "memory", flips, atMs }, 20_000);
    assert.equal(graded.ok, true);
    if (!graded.ok) return;
    assert.equal(graded.score, 92);
    assert.equal(graded.stats.completed, 1);
    const again = gradeGame(round, { game: "memory", flips, atMs }, 20_000);
    assert.deepEqual(again, graded);
  });

  it("rejects a card matching itself and scores a partial board", () => {
    const round = buildRound("memory", "easy", 7);
    if (round.game !== "memory") return;
    const illegal = gradeGame(round, { game: "memory", flips: [0, 0], atMs: [0, 180] }, 5_000);
    assert.deepEqual(illegal, { ok: false, reason: "rules" });
    const face = round.deck[0];
    const pair = round.deck.findIndex((emoji, index) => index !== 0 && emoji === face);
    const partial = gradeGame(round, { game: "memory", flips: [0, pair], atMs: [200, 400] }, 5_000);
    assert.equal(partial.ok && partial.score, 5);
  });

  it("scores a math streak once and rejects junk and a fast double submit", () => {
    const round = {
      game: "math" as const,
      difficulty: "easy" as const,
      durationSeconds: 120,
      problems: [
        { a: 6, b: 4, op: "+" as const },
        { a: 8, b: 3, op: "-" as const },
      ],
    };
    assert.equal(mathValue(round.problems[0]), 10);
    const graded = gradeGame(round, { game: "math", answers: ["10", "5"], atMs: [400, 800] }, 5_000);
    assert.equal(graded.ok && graded.score, 22);
    assert.equal(graded.ok && graded.stats.maxStreak, 2);
    const junk = gradeGame(round, { game: "math", answers: ["10abc"], atMs: [400] }, 5_000);
    assert.equal(junk.ok && junk.score, 0);
    const doubled = gradeGame(round, { game: "math", answers: ["10", "10"], atMs: [400, 500] }, 5_000);
    assert.equal(doubled.ok, false);
  });

  it("scores scramble once and folds accents", () => {
    assert.equal(foldWord("  école "), "ÉCOLE");
    const round = {
      game: "words" as const,
      difficulty: "easy" as const,
      durationSeconds: 120,
      rounds: [{ word: "CHAT", scrambled: "THAC", hintFr: "Animal domestique", hintEn: "Pet animal" }],
    };
    const graded = gradeGame(round, { game: "words", guesses: ["chat"], atMs: [500] }, 4_000);
    assert.equal(graded.ok && graded.score, 20);
  });

  it("grades color ink rather than the written word", () => {
    const round = {
      game: "colors" as const,
      difficulty: "hard" as const,
      durationSeconds: 60,
      rounds: [{ word: "red", ink: "blue", options: ["red", "green", "blue"] }],
    };
    const ink = gradeGame(round, { game: "colors", picks: [2], atMs: [300] }, 3_000);
    const word = gradeGame(round, { game: "colors", picks: [0], atMs: [300] }, 3_000);
    assert.equal(ink.ok && ink.score, 15);
    assert.equal(word.ok && word.score, 0);
    const hard = buildRound("colors", "hard", 3);
    if (hard.game !== "colors") return;
    assert.ok(hard.rounds.every((item) => item.word !== item.ink));
    assert.ok(hard.rounds.every((item) => item.options.includes(item.ink)));
  });

  it("scores alphabet order only when the slice is complete", () => {
    const round = {
      game: "alphabet" as const,
      difficulty: "easy" as const,
      durationSeconds: 120,
      letters: ["C", "A", "E", "B", "D"],
    };
    const perfect = gradeGame(round, { game: "alphabet", order: ["A", "B", "C", "D", "E"], atMs: [120, 240, 360, 480, 600] }, 4_000);
    const prefix = gradeGame(round, { game: "alphabet", order: ["A", "B", "C"], atMs: [120, 240, 360] }, 4_000);
    const duplicate = gradeGame(round, { game: "alphabet", order: ["A", "A", "B", "C", "D"], atMs: [120, 240, 360, 480, 600] }, 4_000);
    assert.equal(perfect.ok && perfect.score, 30);
    assert.equal(prefix.ok && prefix.score, 0);
    assert.equal(duplicate.ok && duplicate.score, 0);
  });

  it("counts typing errors, corrections, accuracy, and WPM from the key log", () => {
    const replay = replayTypingWord("le", ["x", "\b", "l", "e"]);
    assert.equal(replay?.errors, 1);
    assert.equal(replay?.corrected, 1);
    assert.equal(replay?.correct, true);
    assert.equal(replayTypingWord("le", ["le"]), null);
    const words = ["le", "un", "et", "la", "il", "de", "en", "ce"];
    const keys = words.map((word) => [...word]);
    const atMs = keys.flat().map((_, index) => index * 40);
    const round = { game: "typing" as const, difficulty: "easy" as const, durationSeconds: 120, words };
    const graded = gradeGame(round, { game: "typing", keys, atMs }, 60_000);
    assert.equal(graded.ok && graded.score, 40);
    assert.equal(graded.ok && graded.stats.correctChars, 16);
    assert.equal(graded.ok && graded.stats.wpmDeci, 32);
    assert.equal(graded.ok && graded.stats.accuracyMillis, 1000);
    const mixed = gradeGame(
      { game: "typing", difficulty: "easy", durationSeconds: 120, words: ["le"] },
      { game: "typing", keys: [["l", "x", "\b", "e"]], atMs: [40, 80, 120, 160] },
      60_000,
    );
    assert.equal(mixed.ok && mixed.stats.errors, 1);
    assert.equal(mixed.ok && mixed.stats.corrected, 1);
    assert.equal(mixed.ok && mixed.score, 3);
  });

  it("rejects impossible timing and still grades a late honest submit", () => {
    const round = {
      game: "math" as const,
      difficulty: "easy" as const,
      durationSeconds: 120,
      problems: [{ a: 1, b: 1, op: "+" as const }],
    };
    const tight = checkTiming([0, 100], 300, 120, 5_000);
    assert.equal(tight.ok, false);
    const ahead = gradeGame(round, { game: "math", answers: ["2"], atMs: [10_000] }, 1_000);
    assert.equal(ahead.ok, false);
    const instant = gradeGame(round, { game: "math", answers: ["2"], atMs: [2_000] }, 100);
    assert.equal(instant.ok, false);
    const late = gradeGame(round, { game: "math", answers: ["2"], atMs: [1_000] }, 2 * 60 * 60 * 1000);
    assert.equal(late.ok && late.score, 10);
    assert.equal(late.ok && late.elapsedMs, 120_000);
    const expired = gradeGame(round, { game: "math", answers: ["2"], atMs: [1_000] }, 37 * 60 * 60 * 1000);
    assert.deepEqual(expired, { ok: false, reason: "expired" });
  });

  it("ignores a client score and xp field", () => {
    const round = {
      game: "math" as const,
      difficulty: "easy" as const,
      durationSeconds: 120,
      problems: [{ a: 2, b: 2, op: "+" as const }],
    };
    const graded = gradeSubmittedBody(
      round,
      { score: 99999, xp: 99999, events: { game: "math", answers: ["4"], atMs: [400], score: 99999 } },
      5_000,
    );
    assert.equal(graded.ok && graded.score, 10);
  });

  it("deals typing words from a bag before repeating", () => {
    const round = buildRound("typing", "medium", 9);
    if (round.game !== "typing") return;
    const pool = new Set(["maison", "école", "livre", "classe", "enfant", "soleil", "arbre", "manger"]);
    assert.equal(round.words.length, 10);
    assert.equal(new Set(round.words.slice(0, 8)).size, 8);
    for (const word of round.words) assert.equal(pool.has(word), true);
  });
});
