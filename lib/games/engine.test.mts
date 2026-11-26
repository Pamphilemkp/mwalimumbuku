import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALPHABET_STAGE_SIZES,
  buildRound,
  checkTiming,
  COLOR_COUNTS,
  colorStep,
  difficultyBand,
  foldWord,
  gradeGame,
  gradeSubmittedBody,
  MATH_COUNTS,
  mathValue,
  MEMORY_WAVE_PAIRS,
  replayTypingWord,
  rngNext,
  TIME_LIMITS,
  typingGroups,
  WORD_COUNTS,
  wordDifficultyAt,
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
    assert.deepEqual(first.waves.map((wave) => wave.length), [4, 4]);
    assert.equal(first.durationSeconds, TIME_LIMITS.easy);
    for (const wave of first.waves) {
      const counts = new Map<string, number>();
      for (const face of wave) counts.set(face, (counts.get(face) ?? 0) + 1);
      for (const count of counts.values()) assert.equal(count, 2);
    }
  });

  it("scores a cleared memory board once", () => {
    const round = buildRound("memory", "easy", 7);
    if (round.game !== "memory") return;
    const flips: number[] = [];
    for (const wave of round.waves) {
      const seen = new Map<string, number>();
      wave.forEach((face, index) => {
        const previous = seen.get(face);
        if (previous === undefined) seen.set(face, index);
        else flips.push(previous, index);
      });
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
    const face = round.waves[0][0];
    const pair = round.waves[0].findIndex((emoji, index) => index !== 0 && emoji === face);
    const partial = gradeGame(round, { game: "memory", flips: [0, pair], atMs: [200, 400] }, 5_000);
    assert.equal(partial.ok && partial.score, 5);
    const earlyHardIndex = gradeGame(round, { game: "memory", flips: [0, pair, 5], atMs: [200, 400, 600] }, 5_000);
    assert.deepEqual(earlyHardIndex, { ok: false, reason: "rules" });
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
    assert.equal(hard.rounds.length, COLOR_COUNTS.hard);
    hard.rounds.forEach((item, index) => {
      const step = colorStep("hard", index);
      assert.equal(item.word !== item.ink, step.stroop);
      assert.equal(item.options.length, step.optionCount);
      assert.equal(item.options.includes(item.ink), true);
    });
    assert.equal(hard.rounds.slice(0, 4).every((item) => item.word === item.ink), true);
    assert.equal(hard.rounds.slice(8).every((item) => item.word !== item.ink), true);
  });

  it("scores alphabet order only when every stage is complete", () => {
    const round = {
      game: "alphabet" as const,
      difficulty: "medium" as const,
      durationSeconds: 105,
      stages: [["C", "A"], ["E", "B", "D"]],
    };
    const perfect = gradeGame(
      round,
      { game: "alphabet", orders: [["A", "C"], ["B", "D", "E"]], atMs: [120, 240, 360, 480, 600] },
      4_000,
    );
    const prefix = gradeGame(round, { game: "alphabet", orders: [["A", "C"]], atMs: [120, 240] }, 4_000);
    const duplicate = gradeGame(
      round,
      { game: "alphabet", orders: [["A", "C"], ["B", "B", "D"]], atMs: [120, 240, 360, 480, 600] },
      4_000,
    );
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
    const [early, later] = typingGroups("medium");
    assert.deepEqual(early, ["arbre", "livre", "école", "classe"]);
    assert.deepEqual(later, ["enfant", "maison", "manger", "soleil"]);
    assert.deepEqual(typingGroups("hard"), [
      ["éducation", "bibliothèque", "connaissance"],
      ["apprentissage", "développement", "mathématiques"],
    ]);
    assert.equal(round.words.length, 9);
    assert.equal(new Set(round.words.slice(0, 8)).size, 8);
    for (const word of round.words.slice(0, 4)) assert.equal(early.includes(word), true);
    for (const word of round.words.slice(4, 8)) assert.equal(later.includes(word), true);
  });

  it("steps difficulty up inside a round and keeps the old score ceilings", () => {
    assert.deepEqual(TIME_LIMITS, { easy: 120, medium: 105, hard: 60 });
    assert.ok(TIME_LIMITS.easy - TIME_LIMITS.medium < TIME_LIMITS.medium - TIME_LIMITS.hard);
    assert.deepEqual(MEMORY_WAVE_PAIRS.easy, [2, 2]);
    assert.deepEqual(MEMORY_WAVE_PAIRS.medium, [2, 3]);
    assert.deepEqual(MEMORY_WAVE_PAIRS.hard, [2, 3, 4]);
    assert.deepEqual(MATH_COUNTS, { easy: 5, medium: 8, hard: 15 });
    assert.deepEqual(WORD_COUNTS, { easy: 3, medium: 4, hard: 7 });
    assert.deepEqual(ALPHABET_STAGE_SIZES, { easy: [5], medium: [4, 6], hard: [4, 6, 10] });
    assert.deepEqual(COLOR_COUNTS, { easy: 5, medium: 6, hard: 12 });

    const math = buildRound("math", "hard", 11);
    if (math.game !== "math") return;
    assert.equal(math.problems.length, 15);
    assert.equal(math.durationSeconds, 60);
    math.problems.slice(0, 5).forEach((problem) => {
      assert.equal(problem.op === "+" || problem.op === "-", true);
      assert.ok(problem.a <= 12 && problem.b <= 6);
    });
    assert.equal(math.problems.slice(0, 5).some((problem) => problem.op === "×" || problem.op === "÷"), false);
    const sawDivision = [1, 2, 3, 4, 5, 8, 11, 19, 42].some((seed) => {
      const round = buildRound("math", "hard", seed);
      return round.game === "math" && round.problems.slice(10).some((problem) => problem.op === "÷");
    });
    assert.equal(sawDivision, true);
    const perfectMath = math.problems.map((problem) => String(mathValue(problem)));
    const mathScore = gradeGame(
      math,
      { game: "math", answers: perfectMath, atMs: perfectMath.map((_, index) => (index + 1) * 300) },
      20_000,
    );
    assert.equal(mathScore.ok && mathScore.score, 15 * (15 + 9));
    assert.ok(mathScore.ok && mathScore.score <= 360);

    const words = buildRound("words", "hard", 5);
    if (words.game !== "words") return;
    words.rounds.forEach((round, index) => {
      const band = wordDifficultyAt("hard", index);
      const known = { CHAT: 1, LIRE: 1, MATH: 1, ÉCOLE: 2, LIVRE: 2, CLASSE: 2, CAHIER: 2, ÉCRIRE: 3, TABLEAU: 3, HISTOIRE: 3, SCIENCES: 3 };
      assert.equal(known[round.word as keyof typeof known], band);
    });
    assert.ok(words.rounds[0].word.length <= words.rounds[words.rounds.length - 1].word.length);

    const alphabet = buildRound("alphabet", "hard", 4);
    if (alphabet.game !== "alphabet") return;
    assert.deepEqual(alphabet.stages.map((stage) => stage.length), [4, 6, 10]);
    alphabet.stages.forEach((stage) => {
      const sorted = stage.slice().sort();
      const start = sorted[0].charCodeAt(0);
      assert.equal(sorted.every((letter, index) => letter.charCodeAt(0) === start + index), true);
    });

    const memory = buildRound("memory", "hard", 6);
    if (memory.game !== "memory") return;
    assert.deepEqual(memory.waves.map((wave) => wave.length / 2), [2, 3, 4]);
    assert.equal(difficultyBand(0, 15), 0);
    assert.equal(difficultyBand(14, 15), 2);
  });
});
