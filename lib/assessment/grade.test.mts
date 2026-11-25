import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gradeAnswer } from "./grade.ts";
import { authorizeHomeworkDownload, HOMEWORK_URL_SECONDS, validateHomeworkFile } from "./files.ts";

const base = {
  points: 10,
  partialCredit: false,
  attemptLimit: 2,
  attemptsUsed: 0,
};

describe("gradeAnswer", () => {
  it("grades each exercise type without returning the correct answer", () => {
    const secret = "hidden-answer";
    const cases = [
      gradeAnswer({ ...base, type: "multiple_choice", correctAnswer: "B", answer: "A" }),
      gradeAnswer({ ...base, type: "true_false", correctAnswer: "true", answer: "false" }),
      gradeAnswer({ ...base, type: "short_answer", correctAnswer: secret, answer: "wrong" }),
      gradeAnswer({ ...base, type: "fill_blank", correctAnswer: secret, answer: secret }),
      gradeAnswer({ ...base, type: "matching", correctAnswer: "cat=chat|dog=chien", answer: "cat=chat|dog=chien", partialCredit: true }),
    ];
    assert.equal(cases[0].status === "graded" && cases[0].points, 0);
    assert.equal(cases[3].status === "graded" && cases[3].points, 10);
    assert.equal(cases[4].status === "graded" && cases[4].correct, true);
    for (const result of cases) {
      assert.equal(JSON.stringify(result).includes(secret), false);
      assert.equal(JSON.stringify(result).includes("correctAnswer"), false);
    }
  });

  it("gives partial credit only for a matching exercise that allows it", () => {
    const half = gradeAnswer({
      ...base,
      type: "matching",
      correctAnswer: "a=1|b=2",
      answer: "a=1|b=9",
      partialCredit: true,
    });
    const allOrNothing = gradeAnswer({
      ...base,
      type: "matching",
      correctAnswer: "a=1|b=2",
      answer: "a=1|b=9",
      partialCredit: false,
    });
    const rejected = gradeAnswer({ ...base, type: "short_answer", correctAnswer: "a", answer: "a", partialCredit: true });
    assert.equal(half.status === "graded" && half.points, 5);
    assert.equal(allOrNothing.status === "graded" && allOrNothing.points, 0);
    assert.deepEqual(rejected, { status: "rejected", reason: "invalid" });
  });

  it("stops another attempt after the limit and does not change an academic grade", () => {
    const blocked = gradeAnswer({ ...base, type: "multiple_choice", correctAnswer: "A", answer: "A", attemptsUsed: 2 });
    assert.deepEqual(blocked, { status: "rejected", reason: "attempts" });
    const sql = readFileSync(new URL("../../supabase/migrations/20261125160000_courses_and_assessment.sql", import.meta.url), "utf8");
    assert.equal(sql.includes("UPDATE public.homework_submissions"), false);
    assert.equal(sql.toLowerCase().includes("points_earned"), true);
  });
});

describe("homework files", () => {
  it("accepts an owned pdf and refuses another student or a script", () => {
    const owner = "11111111-1111-1111-1111-111111111111";
    const other = "22222222-2222-2222-2222-222222222222";
    const assignment = "33333333-3333-3333-3333-333333333333";
    const file = { ownerId: owner, callerId: owner, assignmentId: assignment, objectName: "notes.pdf" };
    assert.equal(validateHomeworkFile({ ...file, fileName: "notes.pdf", size: 1000 }).ok, true);
    assert.equal(validateHomeworkFile({ ...file, fileName: "notes.exe", objectName: "notes.exe", size: 1000 }).ok, false);
    assert.equal(validateHomeworkFile({ ...file, fileName: "notes.pdf", size: 9_000_000 }).ok, false);
    assert.equal(validateHomeworkFile({ ...file, fileName: "notes.pdf", size: 1000, callerId: other }).ok, false);
  });

  it("issues a short-lived path only for the caller's own file", () => {
    const owner = "11111111-1111-1111-1111-111111111111";
    const granted = authorizeHomeworkDownload({ path: `${owner}/notes.pdf`, callerId: owner, nowMs: 1_000 });
    assert.equal(granted?.expiresAtMs, 1_000 + HOMEWORK_URL_SECONDS * 1000);
    assert.equal(authorizeHomeworkDownload({ path: "someone/notes.pdf", callerId: owner, nowMs: 1_000 }), null);
    assert.equal(authorizeHomeworkDownload({ path: `${owner}/../notes.pdf`, callerId: owner, nowMs: 1_000 }), null);
  });
});
