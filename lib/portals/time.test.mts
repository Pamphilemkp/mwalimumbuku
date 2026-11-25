import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatNicosia, nicosiaLocalToIso } from "./time.ts";

describe("Nicosia session times", () => {
  it("stores a winter wall time as UTC and shows the offset", () => {
    const iso = nicosiaLocalToIso("2026-11-25T15:00");
    assert.equal(iso, "2026-11-25T13:00:00.000Z");
    const label = formatNicosia(iso ?? "");
    assert.match(label, /25 Nov 2026/);
    assert.match(label, /15:00/);
    assert.match(label, /GMT\+2|UTC\+2/);
  });
});