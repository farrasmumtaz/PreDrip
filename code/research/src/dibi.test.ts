import assert from "node:assert/strict";
import { test } from "node:test";
import { extractDibi, extractRegionalDibi } from "./dibi";
import { summarizeRegion } from "./bandung-raya";
import { writeCsv } from "./csv";
import { WEATHER_HEADERS } from "./audit";
import { offsetDate } from "./experiment-data";

test("DIBI extraction separates regions and kinds, preserves dates and deduplicates source records", () => {
  const row = { level1: "3273", nwil: "Kota Bandung, Jawa Barat", tglan: "2020-02-01", kejadian: { nama: "Banjir", url: "https://dibi.bnpb.go.id/d/r/1" } };
  const result = extractDibi([row, row, { ...row, level1: "3204" }, { ...row, tglan: "2024-11-21", kejadian: { ...row.kejadian, nama: "Tanah Longsor" } }], "a".repeat(64));
  assert.equal(result.events.length, 1);
  assert.equal(result.archiveEnd, "2024-11-21", "cutoff follows the whole archive, not the final city flood");
  assert.equal(result.events[0]?.date, "2020-02-01");
  assert.throws(() => extractDibi([row, { ...row, tglan: "2020-02-02" }], "a".repeat(64)), /tanggal berbeda/);
  assert.throws(() => extractDibi([{ ...row, tglan: "2020-02-30" }], "a".repeat(64)));
});

test("regional audit keeps identities, same-day records and unlabelled gaps distinct", () => {
  const region = { code: "3204", id: "kabupaten-bandung", sourceName: "Bandung" };
  const row = { level1: "3204", nwil: "Bandung, Jawa Barat", tglan: "2020-01-08", kejadian: { nama: "Banjir", url: "https://dibi.bnpb.go.id/d/r/1" } };
  const snapshot = extractRegionalDibi([row, row, { ...row, kejadian: { ...row.kejadian, url: "https://dibi.bnpb.go.id/d/r/2" } }, { ...row, level1: "3273", nwil: "Kota Bandung, Jawa Barat", tglan: "2024-11-21" }], "a".repeat(64), region);
  const result = summarizeRegion(snapshot);
  assert.equal(result.uniqueSourceRecords, 2);
  assert.equal(result.uniqueReportedDates, 1);
  assert.equal(result.sameDayAdditionalRecords, 1);
  assert.equal(result.diagnosticWindows.years2020And2021, 1);
  assert.ok(result.zeroReportYears.includes("2024"));
  assert.equal(result.weather.status, "missing");
  assert.equal(snapshot.archiveEnd, "2024-11-21");
  assert.throws(() => extractRegionalDibi([{ ...row, nwil: "Kota Bandung, Jawa Barat" }], "a".repeat(64), region), /Identitas/);
  const rows = Array.from({ length: 7 }, (_, index) => ({ date: offsetDate("2020-01-01", index), region_id: region.id, station_id: "grid:era5:test", rainfall_mm: "1", humidity_pct: "80", temperature_c: "24", available_at: "", source_ref: "https://example.org/era5" }));
  const complete = summarizeRegion(snapshot, writeCsv(WEATHER_HEADERS, rows));
  assert.equal(complete.weather.status, "available");
  if (complete.weather.status === "available") assert.equal(complete.weather.pairedReportedDates, 1);
  const missing = summarizeRegion(snapshot, writeCsv(WEATHER_HEADERS, rows.slice(1)));
  if (missing.weather.status === "available") assert.deepEqual(missing.weather.unpairedReportedDates, ["2020-01-08"]);
  assert.throws(() => summarizeRegion(snapshot, writeCsv(WEATHER_HEADERS, rows.map((item) => ({ ...item, region_id: "kota-bandung" })))), /kontrak/);
});
