import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { supportObjectPath, validateSupportFile } from "./support-files.ts";

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";

describe("support files", () => {
  it("rejects another user, a mismatched type, and a public leftover url from another path", () => {
    const file = {
      fileName: "note.pdf",
      size: 1000,
      contentType: "application/pdf",
      ownerId: owner,
      callerId: owner,
      objectName: "note.pdf",
    };
    assert.equal(validateSupportFile(file).ok, true);
    assert.equal(validateSupportFile({ ...file, callerId: other }).ok, false);
    assert.equal(validateSupportFile({ ...file, contentType: "text/html" }).ok, false);
    assert.equal(validateSupportFile({ ...file, size: 9_000_000 }).ok, false);
    assert.equal(supportObjectPath(`${owner}/note.pdf`), `${owner}/note.pdf`);
    assert.equal(
      supportObjectPath(`https://example.supabase.co/storage/v1/object/public/support-files/${owner}/note.pdf`),
      `${owner}/note.pdf`,
    );
    assert.equal(supportObjectPath(`${other}/../note.pdf`), null);
  });
});