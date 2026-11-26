/**
 * Educational game rules shared by the browser and by tests.
 * Postgres `grade_game_payload` / `build_game_round` implement this file.
 * Consistency is not computed: the server only observes start and submit,
 * and per-key timestamps are client clocks that can be spaced evenly.
 */

/** Easy→medium is a smaller step than medium→hard. See GAMES_REDESIGN.md. */
export const TIME_LIMITS = { easy: 120, medium: 105, hard: 60 } as const;
export const MIN_GAP_MS = {
  memory: 180,
  words: 400,
  math: 300,
  alphabet: 120,
  colors: 250,
  typing: 40,
} as const;
export const CLOCK_SKEW_MS = 250;
export const SUBMISSION_GRACE_MS = 36 * 60 * 60 * 1000;

export const GAME_KEYS = ["memory", "words", "math", "alphabet", "colors", "typing"] as const;
export type GameKey = (typeof GAME_KEYS)[number];
export type Difficulty = keyof typeof TIME_LIMITS;

export const MEMORY_EMOJIS = ["🐘", "🦁", "🐍", "🦒", "🐊", "🦓", "🐆", "🦏", "🦩", "🐢", "🦜", "🐠"] as const;

export const COLORS = [
  { id: "red", nameFr: "Rouge", nameEn: "Red", hex: "hsl(0, 80%, 50%)" },
  { id: "blue", nameFr: "Bleu", nameEn: "Blue", hex: "hsl(220, 80%, 50%)" },
  { id: "green", nameFr: "Vert", nameEn: "Green", hex: "hsl(120, 60%, 40%)" },
  { id: "yellow", nameFr: "Jaune", nameEn: "Yellow", hex: "hsl(50, 90%, 50%)" },
  { id: "orange", nameFr: "Orange", nameEn: "Orange", hex: "hsl(30, 90%, 50%)" },
  { id: "purple", nameFr: "Violet", nameEn: "Purple", hex: "hsl(280, 60%, 50%)" },
  { id: "pink", nameFr: "Rose", nameEn: "Pink", hex: "hsl(330, 80%, 60%)" },
  { id: "brown", nameFr: "Marron", nameEn: "Brown", hex: "hsl(25, 60%, 35%)" },
] as const;

export const SCRAMBLE_WORDS: { word: string; hintFr: string; hintEn: string; diff: number }[] = [
  { word: "CHAT", hintFr: "Animal domestique", hintEn: "Pet animal", diff: 1 },
  { word: "LIRE", hintFr: "Avec les yeux", hintEn: "With eyes", diff: 1 },
  { word: "MATH", hintFr: "Nombres et calculs", hintEn: "Numbers", diff: 1 },
  { word: "ÉCOLE", hintFr: "Lieu d'apprentissage", hintEn: "Learning place", diff: 2 },
  { word: "LIVRE", hintFr: "On le lit", hintEn: "You read it", diff: 2 },
  { word: "CLASSE", hintFr: "Salle de cours", hintEn: "Classroom", diff: 2 },
  { word: "CAHIER", hintFr: "On y écrit", hintEn: "Notebook", diff: 2 },
  { word: "ÉCRIRE", hintFr: "Avec un stylo", hintEn: "With a pen", diff: 3 },
  { word: "TABLEAU", hintFr: "Devant la classe", hintEn: "Blackboard", diff: 3 },
  { word: "HISTOIRE", hintFr: "Le passé", hintEn: "The past", diff: 3 },
  { word: "SCIENCES", hintFr: "Expériences", hintEn: "Experiments", diff: 3 },
];

export const TYPING_POOLS = {
  easy: ["le", "un", "et", "la", "il", "de", "en", "ce", "tu", "je"],
  medium: ["maison", "école", "livre", "classe", "enfant", "soleil", "arbre", "manger"],
  hard: ["apprentissage", "éducation", "développement", "connaissance", "bibliothèque", "mathématiques"],
} as const;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export type MathProblem = { a: number; b: number; op: "+" | "-" | "×" | "÷" };
export type ColorRound = { word: string; ink: string; options: string[] };
export type WordRound = { word: string; scrambled: string; hintFr: string; hintEn: string };

export type Round =
  | { game: "math"; difficulty: Difficulty; durationSeconds: number; problems: MathProblem[] }
  | { game: "memory"; difficulty: Difficulty; durationSeconds: number; waves: string[][] }
  | { game: "alphabet"; difficulty: Difficulty; durationSeconds: number; stages: string[][] }
  | { game: "colors"; difficulty: Difficulty; durationSeconds: number; rounds: ColorRound[] }
  | { game: "words"; difficulty: Difficulty; durationSeconds: number; rounds: WordRound[] }
  | { game: "typing"; difficulty: Difficulty; durationSeconds: number; words: string[] };

/**
 * Item counts. The easy→medium gap is smaller than the medium→hard gap.
 * Memory values are pair counts per wave. Alphabet values are letters per stage.
 * A round cannot score above the previous maximum: memory 100, math 360,
 * words 140, alphabet 30, colors 180, typing 180.
 */
export const MEMORY_WAVE_PAIRS = { easy: [2, 2], medium: [2, 3], hard: [2, 3, 4] } as const;
export const MATH_COUNTS = { easy: 5, medium: 8, hard: 15 } as const;
export const WORD_COUNTS = { easy: 3, medium: 4, hard: 7 } as const;
export const ALPHABET_STAGE_SIZES = { easy: [5], medium: [4, 6], hard: [4, 6, 10] } as const;
export const COLOR_COUNTS = { easy: 5, medium: 6, hard: 12 } as const;
export const TYPING_COUNTS = { easy: 8, medium: 9, hard: 12 } as const;

export type GradeStats = Record<string, number>;

export type Grade =
  | { ok: false; reason: "mismatch" | "timing" | "rules" | "expired" }
  | { ok: true; score: number; stats: GradeStats; elapsedMs: number };

type Rng = () => number;

/** Unsigned 32-bit LCG. A seed of 0 starts at 1. The draw is integer division, not a float. */
export function rngNext(state: number): { state: number } {
  const current = state >>> 0 || 1;
  const next = (imul32(1664525, current) + 1013904223) >>> 0;
  return { state: next };
}

function imul32(a: number, b: number): number {
  const aLo = a & 0xffff;
  const aHi = a >>> 16;
  const bLo = b & 0xffff;
  const bHi = b >>> 16;
  return ((aLo * bLo) + (((aHi * bLo + aLo * bHi) << 16) >>> 0)) >>> 0;
}

export function makeRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    const step = rngNext(state);
    state = step.state;
    return step.state;
  };
}

function randInt(rng: Rng, n: number): number {
  return Number((BigInt(rng()) * BigInt(n)) / BigInt("4294967296"));
}

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randInt(rng, i + 1);
    const swap = copy[i];
    copy[i] = copy[j];
    copy[j] = swap;
  }
  return copy;
}

export function isGameKey(value: string): value is GameKey {
  return (GAME_KEYS as readonly string[]).includes(value);
}

export function isDifficulty(value: string): value is Difficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

export function buildRound(game: GameKey, difficulty: Difficulty, seed: number): Round {
  const rng = makeRng(seed);
  const durationSeconds = TIME_LIMITS[difficulty];
  if (game === "math") return { game, difficulty, durationSeconds, problems: buildMath(rng, difficulty) };
  if (game === "memory") return { game, difficulty, durationSeconds, waves: buildMemory(rng, difficulty) };
  if (game === "alphabet") return { game, difficulty, durationSeconds, stages: buildAlphabet(rng, difficulty) };
  if (game === "colors") return { game, difficulty, durationSeconds, rounds: buildColors(rng, difficulty) };
  if (game === "words") return { game, difficulty, durationSeconds, rounds: buildWords(rng, difficulty) };
  return { game, difficulty, durationSeconds, words: buildTyping(rng, difficulty) };
}

/** 0 = first third, 1 = middle, 2 = last third. Integer bounds so SQL can match. */
export function difficultyBand(index: number, count: number): 0 | 1 | 2 {
  if (index < Math.ceil(count / 3)) return 0;
  if (index < Math.ceil((2 * count) / 3)) return 1;
  return 2;
}

const MATH_BANDS: Record<Difficulty, { ops: MathProblem["op"][]; maxN: number }[]> = {
  easy: [
    { ops: ["+", "-"], maxN: 5 },
    { ops: ["+", "-"], maxN: 8 },
    { ops: ["+", "-"], maxN: 10 },
  ],
  medium: [
    { ops: ["+", "-"], maxN: 10 },
    { ops: ["+", "-", "×"], maxN: 15 },
    { ops: ["+", "-", "×"], maxN: 20 },
  ],
  hard: [
    { ops: ["+", "-"], maxN: 12 },
    { ops: ["+", "-", "×"], maxN: 20 },
    { ops: ["+", "-", "×", "÷"], maxN: 50 },
  ],
};

function buildMath(rng: Rng, difficulty: Difficulty): MathProblem[] {
  const count = MATH_COUNTS[difficulty];
  const problems: MathProblem[] = [];
  for (let n = 0; n < count; n += 1) {
    const plan = MATH_BANDS[difficulty][difficultyBand(n, count)];
    const ops = plan.ops;
    const maxN = plan.maxN;
    const op = ops[randInt(rng, ops.length)];
    let a = randInt(rng, maxN) + 1;
    let b = randInt(rng, Math.floor(maxN / 2)) + 1;
    if (op === "-" && b > a) {
      const swap = a;
      a = b;
      b = swap;
    }
    if (op === "×") {
      a = randInt(rng, 12) + 1;
      b = randInt(rng, 10) + 1;
    }
    if (op === "÷") {
      b = randInt(rng, 10) + 1;
      a = b * (randInt(rng, 10) + 1);
    }
    problems.push({ a, b, op });
  }
  return problems;
}

function buildMemory(rng: Rng, difficulty: Difficulty): string[][] {
  return MEMORY_WAVE_PAIRS[difficulty].map((pairs) => {
    const faces = MEMORY_EMOJIS.slice(0, pairs);
    return shuffle(rng, [...faces, ...faces]);
  });
}

function buildAlphabet(rng: Rng, difficulty: Difficulty): string[][] {
  return ALPHABET_STAGE_SIZES[difficulty].map((count) => {
    const start = randInt(rng, 26 - count);
    return shuffle(rng, ALPHABET.slice(start, start + count));
  });
}

/** Choice count and whether the ink differs from the word. Early rounds stay easier. */
export function colorStep(difficulty: Difficulty, index: number): { optionCount: number; stroop: boolean } {
  if (difficulty === "easy") return { optionCount: index < 2 ? 2 : 3, stroop: false };
  if (difficulty === "medium") return { optionCount: index < 2 ? 3 : 4, stroop: false };
  if (index < 4) return { optionCount: 3, stroop: false };
  if (index < 8) return { optionCount: 4, stroop: true };
  return { optionCount: 6, stroop: true };
}

function buildColors(rng: Rng, difficulty: Difficulty): ColorRound[] {
  const count = COLOR_COUNTS[difficulty];
  const rounds: ColorRound[] = [];
  for (let n = 0; n < count; n += 1) {
    const step = colorStep(difficulty, n);
    const shuffled = shuffle(rng, COLORS);
    const word = shuffled[0].id;
    const ink = step.stroop ? shuffled[1].id : shuffled[0].id;
    const pool = shuffled.slice(0, step.optionCount).map((color) => color.id);
    if (!pool.includes(ink)) pool[pool.length - 1] = ink;
    rounds.push({ word, ink, options: shuffle(rng, pool) });
  }
  return rounds;
}

/** Short words first. Easy stays on difficulty 1. Medium and hard open there, then step up. */
export function wordDifficultyAt(difficulty: Difficulty, index: number): number {
  if (difficulty === "easy") return 1;
  if (difficulty === "medium") return index < 2 ? 1 : 2;
  if (index < 2) return 1;
  if (index < 4) return 2;
  return 3;
}

function buildWords(rng: Rng, difficulty: Difficulty): WordRound[] {
  const count = WORD_COUNTS[difficulty];
  const rounds: WordRound[] = [];
  for (let n = 0; n < count; n += 1) {
    const band = wordDifficultyAt(difficulty, n);
    const pool = SCRAMBLE_WORDS.filter((entry) => entry.diff === band);
    const entry = pool[randInt(rng, pool.length)];
    rounds.push({
      word: entry.word,
      scrambled: scramble(rng, entry.word),
      hintFr: entry.hintFr,
      hintEn: entry.hintEn,
    });
  }
  return rounds;
}

function scramble(rng: Rng, word: string): string {
  const chars = [...word];
  let text = word;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    text = shuffle(rng, chars).join("");
    if (text !== word) return text;
  }
  return text;
}

/**
 * Shorter (or, on easy, the more common) words, then the rest.
 * Easy keeps the pool order and splits it in half. Other levels sort by
 * character length, then by UTF-16 code unit, and split in half.
 */
export function typingGroups(difficulty: Difficulty): [string[], string[]] {
  const pool = [...TYPING_POOLS[difficulty]];
  if (difficulty === "easy") return [pool.slice(0, 5), pool.slice(5)];
  const sorted = pool.sort((a, b) => [...a].length - [...b].length || (a < b ? -1 : a > b ? 1 : 0));
  const mid = Math.ceil(sorted.length / 2);
  return [sorted.slice(0, mid), sorted.slice(mid)];
}

function buildTyping(rng: Rng, difficulty: Difficulty): string[] {
  const total = TYPING_COUNTS[difficulty];
  const refill = () => {
    const [early, later] = typingGroups(difficulty);
    return [...shuffle(rng, early), ...shuffle(rng, later)];
  };
  let bag = refill();
  let index = 0;
  let last = "";
  const words: string[] = [];
  for (let n = 0; n < total; n += 1) {
    if (index >= bag.length) {
      bag = refill();
      index = 0;
      if (bag.length > 1 && bag[0] === last) {
        const swap = bag[0];
        bag[0] = bag[1];
        bag[1] = swap;
      }
    }
    words.push(bag[index]);
    last = bag[index];
    index += 1;
  }
  return words;
}

export function mathValue(problem: MathProblem): number {
  if (problem.op === "+") return problem.a + problem.b;
  if (problem.op === "-") return problem.a - problem.b;
  if (problem.op === "×") return problem.a * problem.b;
  return Math.floor(problem.a / problem.b);
}

/** Trim and uppercase, including the accents used by the scramble list. */
export function foldWord(value: string): string {
  const accents: Record<string, string> = {
    é: "É", è: "È", ê: "Ê", ë: "Ë", à: "À", â: "Â", ù: "Ù", û: "Û", ô: "Ô", î: "Î", ç: "Ç",
  };
  let out = "";
  for (const char of value.trim()) out += accents[char] ?? char.toUpperCase();
  return out;
}

export function colorById(id: string) {
  return COLORS.find((color) => color.id === id) ?? null;
}

function reject(reason: "mismatch" | "timing" | "rules" | "expired"): Grade {
  return { ok: false, reason };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function integerList(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const numbers: number[] = [];
  for (const item of value) {
    if (typeof item !== "number" || !Number.isInteger(item)) return null;
    numbers.push(item);
  }
  return numbers;
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const texts: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    texts.push(item);
  }
  return texts;
}

/**
 * Timestamps are milliseconds from the student clock at local start.
 * They must sit inside the duration, respect the minimum gap, and not run
 * ahead of the server clock by more than CLOCK_SKEW_MS.
 * WPM uses min(serverElapsed, duration) so a late retry cannot shrink the clock.
 */
export function checkTiming(
  atMs: number[],
  minGap: number,
  durationSeconds: number,
  serverElapsedMs: number,
): { ok: true; wpmMs: number } | { ok: false; reason: "timing" | "expired" } {
  if (!Number.isInteger(serverElapsedMs) || serverElapsedMs < 0) return { ok: false, reason: "timing" };
  if (serverElapsedMs > SUBMISSION_GRACE_MS) return { ok: false, reason: "expired" };
  const limit = durationSeconds * 1000;
  for (let i = 0; i < atMs.length; i += 1) {
    const stamp = atMs[i];
    if (stamp < 0 || stamp > limit) return { ok: false, reason: "timing" };
    if (i > 0 && stamp - atMs[i - 1] < minGap) return { ok: false, reason: "timing" };
  }
  const last = atMs.length > 0 ? atMs[atMs.length - 1] : 0;
  if (last > serverElapsedMs + CLOCK_SKEW_MS) return { ok: false, reason: "timing" };
  return { ok: true, wpmMs: Math.min(serverElapsedMs, limit) };
}

function pass(score: number, stats: GradeStats, elapsedMs: number): Grade {
  return { ok: true, score, stats, elapsedMs };
}

/** Grades one attempt. Ignores any score, xp, or wpm field on the event object. */
export function gradeGame(round: Round, events: unknown, serverElapsedMs: number): Grade {
  const record = asRecord(events);
  if (!record || record.game !== round.game) return reject("mismatch");
  const atMs = integerList(record.atMs);
  if (!atMs) return reject("mismatch");
  const timing = checkTiming(atMs, MIN_GAP_MS[round.game], round.durationSeconds, serverElapsedMs);
  if (!timing.ok) return reject(timing.reason);

  if (round.game === "math") return gradeMath(round, record, atMs, timing.wpmMs);
  if (round.game === "memory") return gradeMemory(round, record, atMs, timing.wpmMs);
  if (round.game === "alphabet") return gradeAlphabet(round, record, atMs, timing.wpmMs);
  if (round.game === "colors") return gradeColors(round, record, atMs, timing.wpmMs);
  if (round.game === "words") return gradeWords(round, record, atMs, timing.wpmMs);
  return gradeTyping(round, record, atMs, timing.wpmMs);
}

/** A submit body may carry a client score or xp. Those fields are not read. */
export function gradeSubmittedBody(round: Round, body: unknown, serverElapsedMs: number): Grade {
  const record = asRecord(body);
  if (!record) return reject("mismatch");
  return gradeGame(round, record.events, serverElapsedMs);
}

function gradeMath(round: Extract<Round, { game: "math" }>, record: Record<string, unknown>, atMs: number[], elapsedMs: number): Grade {
  const answers = stringList(record.answers);
  if (!answers || answers.length !== atMs.length || answers.length > round.problems.length) return reject("mismatch");
  let streak = 0;
  let maxStreak = 0;
  let correct = 0;
  let score = 0;
  for (let i = 0; i < answers.length; i += 1) {
    const expected = mathValue(round.problems[i]);
    const text = answers[i].trim();
    const value = /^-?\d+$/.test(text) ? Number(text) : null;
    if (value === expected) {
      // 10 points plus 2 for each correct answer already in this streak.
      score += 10 + streak * 2;
      streak += 1;
      correct += 1;
      if (streak > maxStreak) maxStreak = streak;
    } else {
      streak = 0;
    }
  }
  return pass(score, { correct, maxStreak, answered: answers.length }, elapsedMs);
}

function gradeMemory(round: Extract<Round, { game: "memory" }>, record: Record<string, unknown>, atMs: number[], elapsedMs: number): Grade {
  const flips = integerList(record.flips);
  if (!flips || flips.length !== atMs.length) return reject("mismatch");
  if (round.waves.length === 0 || flips.length > 400) return reject("rules");
  let wave = 0;
  let matched = new Set<number>();
  let pending = -1;
  let moves = 0;
  let matches = 0;
  for (const index of flips) {
    const deck = round.waves[wave];
    if (!deck || deck.length < 2 || deck.length % 2 !== 0) return reject("rules");
    if (index < 0 || index >= deck.length || matched.has(index)) return reject("rules");
    if (pending === -1) {
      pending = index;
      continue;
    }
    if (pending === index) return reject("rules");
    moves += 1;
    if (deck[pending] === deck[index]) {
      matched.add(pending);
      matched.add(index);
      matches += 1;
    }
    pending = -1;
    if (matched.size === deck.length) {
      wave += 1;
      matched = new Set();
    }
  }
  const completed = wave === round.waves.length && pending === -1 ? 1 : 0;
  // A finished round is max(100 - 2 per move, 20). A partial round is 5 per match.
  const score = completed === 1 ? Math.max(100 - moves * 2, 20) : matches * 5;
  return pass(score, { moves, matches, completed }, elapsedMs);
}

function gradeAlphabet(round: Extract<Round, { game: "alphabet" }>, record: Record<string, unknown>, atMs: number[], elapsedMs: number): Grade {
  if (!Array.isArray(record.orders)) return reject("mismatch");
  const orders: string[][] = [];
  let picks = 0;
  for (const entry of record.orders) {
    const order = stringList(entry);
    if (!order) return reject("mismatch");
    orders.push(order);
    picks += order.length;
  }
  if (picks !== atMs.length || orders.length > round.stages.length) return reject("mismatch");
  const perfect = orders.length === round.stages.length && orders.every((order, stage) => {
    const expected = round.stages[stage].slice().sort();
    return order.length === expected.length && order.every((letter, index) => letter === expected[index]);
  }) ? 1 : 0;
  // Every stage in A–Z order scores 30. A wrong or unfinished stage scores 0.
  return pass(perfect === 1 ? 30 : 0, { perfect }, elapsedMs);
}

function gradeColors(round: Extract<Round, { game: "colors" }>, record: Record<string, unknown>, atMs: number[], elapsedMs: number): Grade {
  const picks = integerList(record.picks);
  if (!picks || picks.length !== atMs.length || picks.length > round.rounds.length) return reject("mismatch");
  let correct = 0;
  for (let i = 0; i < picks.length; i += 1) {
    const choice = round.rounds[i].options[picks[i]];
    if (choice === undefined) return reject("rules");
    if (choice === round.rounds[i].ink) correct += 1;
  }
  // 15 points for each swatch that matches the ink, which is the word color except on hard.
  return pass(correct * 15, { correct, rounds: round.rounds.length }, elapsedMs);
}

function gradeWords(round: Extract<Round, { game: "words" }>, record: Record<string, unknown>, atMs: number[], elapsedMs: number): Grade {
  const guesses = stringList(record.guesses);
  if (!guesses || guesses.length !== atMs.length || guesses.length > round.rounds.length) return reject("mismatch");
  let correct = 0;
  for (let i = 0; i < guesses.length; i += 1) {
    if (foldWord(guesses[i]) === round.rounds[i].word) correct += 1;
  }
  // 20 points for each word spelled exactly, after trim and upper case.
  return pass(correct * 20, { correct, rounds: round.rounds.length }, elapsedMs);
}

export type TypingReplay = {
  correct: boolean;
  errors: number;
  corrected: number;
  correctPrefix: number;
};

/** Replays one word. A key is one character or a backspace (`\\b`). */
export function replayTypingWord(target: string, keys: string[]): TypingReplay | null {
  let input = "";
  let errors = 0;
  let corrected = 0;
  for (const key of keys) {
    if (key === "\b") {
      if (input.length === 0) continue;
      const removed = input[input.length - 1];
      const expected = target[input.length - 1];
      if (expected === undefined || removed !== expected) corrected += 1;
      input = input.slice(0, -1);
      continue;
    }
    if ([...key].length !== 1) return null;
    const expected = target[input.length];
    if (expected === undefined || key !== expected) errors += 1;
    input += key;
    if ([...input].length > [...target].length + 8) return null;
  }
  let correctPrefix = 0;
  const inputChars = [...input];
  const targetChars = [...target];
  while (correctPrefix < inputChars.length && correctPrefix < targetChars.length && inputChars[correctPrefix] === targetChars[correctPrefix]) {
    correctPrefix += 1;
  }
  return { correct: input === target, errors, corrected, correctPrefix };
}

function gradeTyping(round: Extract<Round, { game: "typing" }>, record: Record<string, unknown>, atMs: number[], elapsedMs: number): Grade {
  if (!Array.isArray(record.keys) || record.keys.length > round.words.length) return reject("mismatch");
  const logs: string[][] = [];
  let keyCount = 0;
  for (const entry of record.keys) {
    const keys = stringList(entry);
    if (!keys || keys.length > 40) return reject("mismatch");
    logs.push(keys);
    keyCount += keys.length;
  }
  if (keyCount !== atMs.length) return reject("mismatch");
  const base = round.difficulty === "easy" ? 5 : round.difficulty === "medium" ? 10 : 15;
  let correctWords = 0;
  let errors = 0;
  let corrected = 0;
  let correctChars = 0;
  for (let i = 0; i < logs.length; i += 1) {
    const replay = replayTypingWord(round.words[i], logs[i]);
    if (!replay) return reject("rules");
    errors += replay.errors;
    corrected += replay.corrected;
    correctChars += replay.correctPrefix;
    if (replay.correct) correctWords += 1;
  }
  const denom = correctChars + errors;
  // score = round(correctWords * base * correctChars / (correctChars + errors))
  const score = denom === 0 ? 0 : Math.round((correctWords * base * correctChars) / denom);
  // accuracyMillis = round(1000 * correctChars / (correctChars + errors))
  const accuracyMillis = denom === 0 ? 0 : Math.round((correctChars * 1000) / denom);
  // wpm to 1 decimal: round(correctChars * 120000 / wpmMs) / 10, stored as deci-WPM.
  const wpmDeci = correctChars === 0 || elapsedMs <= 0 ? 0 : Math.round((correctChars * 120000) / elapsedMs);
  return pass(score, { correctWords, errors, corrected, correctChars, accuracyMillis, wpmDeci }, elapsedMs);
}
