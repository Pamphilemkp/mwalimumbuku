import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  achievementCodes,
  applyGameGrants,
  creditDay,
  currentStreak,
  levelForXp,
  localDate,
  publicLearnerLabel,
  xpGrant,
  xpThreshold,
} from "./economy.ts";

describe("reward economy", () => {
  it("caps daily XP and ignores anything but the verified score", () => {
    assert.equal(xpGrant(30, 0), 30);
    assert.equal(xpGrant(50, 380), 20);
    assert.equal(xpGrant(10, 400), 0);
    assert.equal(xpGrant(0, 0), 0);
    assert.equal(xpGrant(12.5, 0), 0);
  });

  it("derives levels from XP thresholds", () => {
    assert.equal(xpThreshold(1), 0);
    assert.equal(xpThreshold(2), 50);
    assert.equal(xpThreshold(3), 150);
    assert.equal(xpThreshold(4), 300);
    assert.equal(levelForXp(0), 1);
    assert.equal(levelForXp(49), 1);
    assert.equal(levelForXp(50), 2);
    assert.equal(levelForXp(149), 2);
    assert.equal(levelForXp(150), 3);
    assert.equal(levelForXp(300), 4);
  });

  it("keeps a streak when an honest attempt is submitted the next morning", () => {
    const monday = Date.parse("2026-11-23T10:00:00.000Z");
    const tuesdayMorning = Date.parse("2026-11-24T06:00:00.000Z");
    assert.equal(localDate(monday), "2026-11-23");
    assert.equal(creditDay(monday, tuesdayMorning), "2026-11-23");
    const tooLate = monday + 36 * 60 * 60 * 1000 + 1;
    assert.equal(creditDay(monday, tooLate), null);
    const days = ["2026-11-21", "2026-11-22", "2026-11-23"];
    assert.equal(currentStreak(days, "2026-11-24"), 3);
    assert.equal(currentStreak(["2026-11-21", "2026-11-23"], "2026-11-23"), 1);
    assert.equal(currentStreak(["2026-11-21"], "2026-11-23"), 0);
  });

  it("hides other children's full names", () => {
    assert.equal(publicLearnerLabel("Ada Lovelace"), "Ada L.");
    assert.equal(publicLearnerLabel("Jean-Pierre Kabila"), "Jean-Pierre K.");
    assert.equal(publicLearnerLabel("Solange"), "Solange");
    assert.equal(publicLearnerLabel("  "), "Élève");
    assert.equal(publicLearnerLabel("Ada Lovelace").includes("Lovelace"), false);
  });

  it("awards badges from verified stats and records one grant per idempotency key", () => {
    const codes = achievementCodes({
      game: "typing",
      score: 40,
      stats: { correctWords: 8, accuracyMillis: 1000, rounds: 0, correct: 0 },
      streakAfter: 3,
    });
    assert.deepEqual(codes, ["first_game", "typing_accurate", "streak_3"]);
    const userId = "student-a";
    const key = "attempt-1";
    const once = applyGameGrants([], [
      { userId, key, amount: xpGrant(30, 0) },
      { userId, key, amount: xpGrant(99999, 0) },
    ]);
    assert.deepEqual(once, [{ userId, key, amount: 30 }]);
  });
});
