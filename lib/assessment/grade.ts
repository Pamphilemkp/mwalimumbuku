export const EXERCISE_TYPES = [
  "multiple_choice",
  "true_false",
  "short_answer",
  "matching",
  "fill_blank",
] as const;

export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export type GradeInput = {
  type: string;
  points: number;
  correctAnswer: string;
  partialCredit: boolean;
  attemptLimit: number;
  attemptsUsed: number;
  answer: string;
};

export type GradeResult =
  | { status: "graded"; correct: boolean; points: number; feedback: string }
  | { status: "rejected"; reason: "attempts" | "invalid" };

const CORRECT = "Correct.";
const INCORRECT = "Not quite. Review the lesson and try again.";

function pairs(value: string): Map<string, string> | null {
  const map = new Map<string, string>();
  const parts = value.split("|").map((part) => part.trim()).filter((part) => part.length > 0);
  if (parts.length === 0) return null;
  for (const part of parts) {
    const splitAt = part.indexOf("=");
    if (splitAt <= 0 || splitAt === part.length - 1) return null;
    const left = part.slice(0, splitAt).trim().toLowerCase();
    const right = part.slice(splitAt + 1).trim().toLowerCase();
    if (left.length === 0 || right.length === 0 || map.has(left)) return null;
    map.set(left, right);
  }
  return map;
}

export function gradeAnswer(input: GradeInput): GradeResult {
  if (!EXERCISE_TYPES.includes(input.type as ExerciseType)) return { status: "rejected", reason: "invalid" };
  if (!Number.isInteger(input.points) || input.points < 0 || input.points > 100) return { status: "rejected", reason: "invalid" };
  if (!Number.isInteger(input.attemptLimit) || input.attemptLimit < 1 || input.attemptLimit > 10) {
    return { status: "rejected", reason: "invalid" };
  }
  if (input.attemptsUsed >= input.attemptLimit) return { status: "rejected", reason: "attempts" };
  if (input.partialCredit && input.type !== "matching") return { status: "rejected", reason: "invalid" };

  const answer = input.answer.trim();
  if (answer.length === 0 || answer.length > 2000) return { status: "rejected", reason: "invalid" };

  if (input.type === "true_false") {
    const given = answer.toLowerCase();
    const expected = input.correctAnswer.trim().toLowerCase();
    if ((given !== "true" && given !== "false") || (expected !== "true" && expected !== "false")) {
      return { status: "graded", correct: false, points: 0, feedback: INCORRECT };
    }
    const correct = given === expected;
    return { status: "graded", correct, points: correct ? input.points : 0, feedback: correct ? CORRECT : INCORRECT };
  }

  if (input.type === "short_answer" || input.type === "fill_blank") {
    const correct = answer.toLowerCase() === input.correctAnswer.trim().toLowerCase();
    return { status: "graded", correct, points: correct ? input.points : 0, feedback: correct ? CORRECT : INCORRECT };
  }

  if (input.type === "multiple_choice") {
    const correct = answer === input.correctAnswer.trim();
    return { status: "graded", correct, points: correct ? input.points : 0, feedback: correct ? CORRECT : INCORRECT };
  }

  const expected = pairs(input.correctAnswer);
  const given = pairs(answer);
  if (!expected || !given) return { status: "graded", correct: false, points: 0, feedback: INCORRECT };
  let matched = 0;
  for (const [left, right] of expected) {
    if (given.get(left) === right) matched += 1;
  }
  const correct = matched === expected.size && given.size === expected.size;
  const points = input.partialCredit ? Math.round((input.points * matched) / expected.size) : correct ? input.points : 0;
  return { status: "graded", correct, points, feedback: correct ? CORRECT : INCORRECT };
}
