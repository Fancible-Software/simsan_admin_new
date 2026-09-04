import assert from "node:assert/strict";
import test from "node:test";
import { money } from "../lib/format";

test("money does not present non-finite legacy values as zero", () => {
  assert.equal(money("NaN"), "—");
  assert.equal(money("Infinity"), "—");
  assert.notEqual(money("125.50"), "—");
});
