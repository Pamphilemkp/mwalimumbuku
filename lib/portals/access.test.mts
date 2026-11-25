import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAttendanceStatus,
  previewExposesPrivateFields,
  resolveChildSelection,
  PROFILE_PREVIEW_COLUMNS,
} from "./access.ts";

describe("portal access helpers", () => {
  it("keeps a parent on their own active links", () => {
    const links = [
      { studentId: "child-a", status: "active" },
      { studentId: "child-b", status: "revoked" },
    ];
    assert.deepEqual(resolveChildSelection(links, null), {
      childIds: ["child-a"],
      selectedId: "child-a",
      denied: false,
    });
    assert.equal(resolveChildSelection(links, "child-a").denied, false);
    assert.deepEqual(resolveChildSelection(links, "child-b"), {
      childIds: ["child-a"],
      selectedId: null,
      denied: true,
    });
    assert.deepEqual(resolveChildSelection(links, "other-child"), {
      childIds: ["child-a"],
      selectedId: null,
      denied: true,
    });
    assert.deepEqual(resolveChildSelection([{ studentId: "child-b", status: "revoked" }], "child-b"), {
      childIds: [],
      selectedId: null,
      denied: false,
    });
  });

  it("hides private profile fields from preview columns", () => {
    assert.equal(previewExposesPrivateFields(PROFILE_PREVIEW_COLUMNS), false);
    assert.equal(previewExposesPrivateFields(["full_name", "student_code"]), true);
    assert.equal(isAttendanceStatus("late"), true);
    assert.equal(isAttendanceStatus("present-self"), false);
  });
});
