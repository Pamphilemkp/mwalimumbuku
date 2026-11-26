import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { adminScope } from "./scope.ts";

const schoolA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const schoolB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("adminScope", () => {
  it("refuses a school admin and a teacher for a platform action", () => {
    assert.equal(
      adminScope({ platformAdmin: false, administeredSchoolIds: [schoolA], schoolId: schoolA, platformOnly: true }),
      "refused",
    );
    assert.equal(
      adminScope({ platformAdmin: false, administeredSchoolIds: [], schoolId: schoolA, platformOnly: true }),
      "refused",
    );
  });

  it("keeps a school admin inside the school they administer", () => {
    assert.equal(
      adminScope({ platformAdmin: false, administeredSchoolIds: [schoolA], schoolId: schoolA, platformOnly: false }),
      "school",
    );
    assert.equal(
      adminScope({ platformAdmin: false, administeredSchoolIds: [schoolA], schoolId: schoolB, platformOnly: false }),
      "refused",
    );
  });

  it("lets platform staff act without becoming a member of the school", () => {
    assert.equal(
      adminScope({ platformAdmin: true, administeredSchoolIds: [], schoolId: schoolB, platformOnly: false }),
      "platform",
    );
  });
});
