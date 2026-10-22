import assert from "node:assert/strict";
import { test } from "node:test";
import { locationSchema, reportSchema } from "../../lib/validation";

test("location rejects malformed, missing, nonfinite and out-of-range inputs", () => {
  for (const input of [null, {}, { latitude: "-6.9", longitude: 107 }, { latitude: 91, longitude: 0 }, { latitude: 0, longitude: 181 }, { latitude: NaN, longitude: Infinity }, { latitude: null, longitude: null }]) {
    assert.equal(locationSchema.safeParse(input).success, false);
  }
  assert.equal(locationSchema.safeParse({ latitude: 0, longitude: 0 }).success, true);
});

test("report preserves zero height, trims description and rejects invalid writes", () => {
  const valid = { latitude: -6.9, longitude: 107.6, waterLevel: 0, description: "  Jalan tergenang  " };
  assert.equal(reportSchema.parse(valid).description, "Jalan tergenang");
  for (const input of [{ ...valid, waterLevel: -10 }, { ...valid, waterLevel: 2001 }, { ...valid, description: " " }, { ...valid, description: "x".repeat(2001) }, { ...valid, userId: "another-user" }]) {
    assert.equal(reportSchema.safeParse(input).success, false);
  }
});
