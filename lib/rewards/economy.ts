/**
 * Reward rules. Points stay the exercise currency in `results.points_earned`.
 * XP, levels, streaks, and badges here come only from verified game attempts.
 * Grades are not an input and are not an output.
 */

export const DAILY_XP_CAP = 400;
export const STREAK_ZONE = "Asia/Nicosia";
export const STREAK_GRACE_MS = 36 * 60 * 60 * 1000;

export type AchievementCode =
  | "first_game"
  | "memory_clear"
  | "alphabet_perfect"
  | "math_streak_5"
  | "typing_accurate"
  | "color_clear"
  | "word_clear"
  | "streak_3";

/** XP from a verified score. There is no parameter for a client-supplied XP value. */
export function xpGrant(score: number, alreadyToday: number): number {
  if (!Number.isInteger(score) || score <= 0) return 0;
  if (!Number.isInteger(alreadyToday) || alreadyToday < 0) return 0;
  return Math.min(score, Math.max(0, DAILY_XP_CAP - alreadyToday));
}

/** threshold(level) = 0 for level 1, else 25 * (level - 1) * level. */
export function xpThreshold(level: number): number {
  if (!Number.isInteger(level) || level <= 1) return 0;
  return 25 * (level - 1) * level;
}

/**
 * Largest level whose threshold is still <= xp.
 * Equivalent to floor((1 + sqrt(1 + 4 * xp / 25)) / 2), counted in integers
 * so the database loop and this function cannot drift on a float boundary.
 */
export function levelForXp(xp: number): number {
  if (!Number.isInteger(xp) || xp <= 0) return 1;
  let level = 1;
  while (xpThreshold(level + 1) <= xp) level += 1;
  return level;
}

export function localDate(epochMs: number, zone: string = STREAK_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(epochMs));
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function previousDate(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, date));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return utc.toISOString().slice(0, 10);
}

/**
 * Credits the local date of the attempt start when the submit lands within
 * 36 hours. A Monday attempt submitted Tuesday morning still credits Monday.
 * Returns null when the submit is outside that grace.
 */
export function creditDay(startedAtMs: number, submittedAtMs: number): string | null {
  if (!Number.isInteger(startedAtMs) || !Number.isInteger(submittedAtMs)) return null;
  const gap = submittedAtMs - startedAtMs;
  if (gap < 0 || gap > STREAK_GRACE_MS) return null;
  return localDate(startedAtMs);
}

/** Walks back from today, or from yesterday when today is not credited yet. */
export function currentStreak(creditDays: string[], today: string): number {
  const credited = new Set(creditDays);
  let cursor = credited.has(today) ? today : previousDate(today);
  if (!credited.has(cursor)) return 0;
  let count = 0;
  while (credited.has(cursor)) {
    count += 1;
    cursor = previousDate(cursor);
  }
  return count;
}

/** First name plus last initial. Never the full multi-word name. */
export function publicLearnerLabel(fullName: string | null | undefined): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter((part) => part.length > 0);
  if (parts.length === 0) return "Élève";
  const first = [...parts[0]].slice(0, 12).join("");
  if (parts.length === 1) return first;
  const initial = [...parts[parts.length - 1]][0]?.toLocaleUpperCase("fr-FR") ?? "";
  return `${first} ${initial}.`;
}

export function achievementCodes(input: {
  game: string;
  score: number;
  stats: Record<string, number>;
  streakAfter: number;
}): AchievementCode[] {
  const codes: AchievementCode[] = ["first_game"];
  if (input.game === "memory" && input.stats.completed === 1) codes.push("memory_clear");
  if (input.game === "alphabet" && input.score === 30) codes.push("alphabet_perfect");
  if (input.game === "math" && (input.stats.maxStreak ?? 0) >= 5) codes.push("math_streak_5");
  if (input.game === "typing" && (input.stats.correctWords ?? 0) >= 5 && (input.stats.accuracyMillis ?? 0) >= 900) {
    codes.push("typing_accurate");
  }
  if (input.game === "colors" && input.stats.rounds > 0 && input.stats.correct === input.stats.rounds) codes.push("color_clear");
  if (input.game === "words" && input.stats.rounds > 0 && input.stats.correct === input.stats.rounds) codes.push("word_clear");
  if (input.streakAfter >= 3) codes.push("streak_3");
  return codes;
}

export type LedgerGrant = { userId: string; key: string; amount: number };

/**
 * Applies grants in order. A repeated user/key pair does not add a second row.
 * This is the in-memory picture of the unique (user_id, idempotency_key) index.
 */
export function applyGameGrants(existing: LedgerGrant[], incoming: LedgerGrant[]): LedgerGrant[] {
  const seen = new Set(existing.map((entry) => `${entry.userId}:${entry.key}`));
  const next = existing.slice();
  for (const grant of incoming) {
    const id = `${grant.userId}:${grant.key}`;
    if (seen.has(id) || grant.amount === 0) continue;
    seen.add(id);
    next.push(grant);
  }
  return next;
}
