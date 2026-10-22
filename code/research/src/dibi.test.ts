import assert from "node:assert/strict";
import { test } from "node:test";
import { extractDibi } from "./dibi";

test("DIBI extraction separates regions and kinds, preserves dates and deduplicates source records", () => {
  const row = { level1: "3273", nwil: "Kota Bandung, Jawa Barat", tglan: "2020-02-01", kejadian: { nama: "Banjir", url: "https://dibi.bnpb.go.id/d/r/1" } };
  const result = extractDibi([row, row, { ...row, level1: "3204" }, { ...row, tglan: "2024-11-21", kejadian: { ...row.kejadian, nama: "Tanah Longsor" } }], "a".repeat(64));
  assert.equal(result.events.length, 1);
  assert.equal(result.archiveEnd, "2024-11-21", "cutoff follows the whole archive, not the final city flood");
  assert.equal(result.events[0]?.date, "2020-02-01");
  assert.throws(() => extractDibi([row, { ...row, tglan: "2020-02-02" }], "a".repeat(64)), /tanggal berbeda/);
  assert.throws(() => extractDibi([{ ...row, tglan: "2020-02-30" }], "a".repeat(64)));
});
