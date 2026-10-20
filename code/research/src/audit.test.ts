import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { auditDataset, isDate, LABEL_HEADERS, WEATHER_HEADERS } from "./audit";
import { readCsv } from "./csv";
import { inspectSacaRainfall } from "./saca";

const options = { regionId: "kota-bandung", datasetKind: "synthetic" } as const;
const weatherHeader = WEATHER_HEADERS.join(",");
const labelHeader = LABEL_HEADERS.join(",");

function weatherRow(date: string, overrides: Partial<Record<typeof WEATHER_HEADERS[number], string>> = {}): string {
  const values: Record<typeof WEATHER_HEADERS[number], string> = {
    date, region_id: "kota-bandung", station_id: "SYNTHETIC", rainfall_mm: "10",
    humidity_pct: "80", temperature_c: "25", available_at: `${date}T20:00:00+07:00`,
    source_ref: "synthetic:weather", ...overrides,
  };
  return WEATHER_HEADERS.map((header) => values[header]).join(",");
}

function weatherCsv(...rows: string[]): string { return [weatherHeader, ...rows].join("\n"); }
function labelCsv(...rows: string[]): string { return [labelHeader, ...rows].join("\n"); }

test("matches labels to calendar tomorrow despite shuffled and missing weather dates", () => {
  const report = auditDataset(
    weatherCsv(weatherRow("2025-01-03"), weatherRow("2025-01-01")),
    labelCsv("2025-01-02,kota-bandung,1,synthetic:event", "2025-01-04,kota-bandung,0,synthetic:no-event"),
    options,
  );
  assert.equal(report.nextDayAlignment.floodPairs, 1);
  assert.equal(report.nextDayAlignment.noFloodPairs, 1);
  assert.deepEqual(report.weather.missingCalendarDays, ["2025-01-02"]);
  assert.equal(report.nextDayAlignment.completeAvailablePairs, 2);
});

test("absence of a report never creates a negative label", () => {
  const report = auditDataset(
    weatherCsv(weatherRow("2025-01-01"), weatherRow("2025-01-02")),
    labelCsv("2025-01-02,kota-bandung,unknown,"), options,
  );
  assert.equal(report.nextDayAlignment.noFloodPairs, 0);
  assert.equal(report.nextDayAlignment.unknownLabelDays, 1);
  assert.equal(report.nextDayAlignment.missingLabelDays, 1);
  assert.equal(report.nextDayAlignment.completeAvailablePairs, 0);
});

test("rejects duplicate observations and conflicting labels rather than silently deduplicating", () => {
  const report = auditDataset(
    weatherCsv(weatherRow("2025-01-01"), weatherRow("2025-01-01")),
    labelCsv("2025-01-02,kota-bandung,0,synthetic:a", "2025-01-02,kota-bandung,1,synthetic:b"), options,
  );
  assert.equal(report.structuralStatus, "blocked");
  assert.equal(report.issues.length, 2);
});

test("rejects undocumented negative labels, mixed regions, special codes, and impossible humidity", () => {
  const report = auditDataset(
    weatherCsv(
      weatherRow("2025-01-01", { rainfall_mm: "8888" }),
      weatherRow("2025-01-02", { region_id: "kabupaten-bandung" }),
      weatherRow("2025-01-03", { humidity_pct: "101" }),
    ), labelCsv("2025-01-02,kota-bandung,0,"), options,
  );
  assert.equal(report.issues.length, 4);
  assert.equal(report.weather.validRows, 0);
  assert.equal(report.labels.noFlood, 0);
  assert.equal(report.structuralStatus, "blocked");
});

test("missing rainfall stays missing while zero rainfall remains an observation", () => {
  const report = auditDataset(
    weatherCsv(weatherRow("2025-01-01", { rainfall_mm: "" }), weatherRow("2025-01-02", { rainfall_mm: "0" })),
    labelCsv("2025-01-02,kota-bandung,1,synthetic:a", "2025-01-03,kota-bandung,0,synthetic:b"), options,
  );
  assert.equal(report.weather.missingValues.rainfall, 1);
  assert.equal(report.nextDayAlignment.knownLabelPairs, 2);
  assert.equal(report.nextDayAlignment.completeAvailablePairs, 1);
});

test("checks feature availability against WIB cutoff, independent of timestamp offset", () => {
  const report = auditDataset(
    weatherCsv(
      weatherRow("2025-01-01", { available_at: "2025-01-01T17:00:00Z" }),
      weatherRow("2025-01-02", { available_at: "2025-01-02T16:59:59.999Z" }),
      weatherRow("2025-01-03", { available_at: "" }),
    ), labelCsv(
      "2025-01-02,kota-bandung,1,synthetic:a", "2025-01-03,kota-bandung,0,synthetic:b",
      "2025-01-04,kota-bandung,0,synthetic:c",
    ), options,
  );
  assert.equal(report.weather.unavailableAtCutoff, 1);
  assert.equal(report.weather.unknownAvailability, 1);
  assert.equal(report.nextDayAlignment.completeAvailablePairs, 1);
});

test("invalid dates and timezone-less timestamps become issues; leap days are accepted", () => {
  assert.equal(isDate("2024-02-29"), true);
  for (const date of ["2025-02-29", "2025-13-01", "2025-00-01", "2025-01-32", "01-02-2025"]) {
    assert.equal(isDate(date), false);
  }
  const report = auditDataset(
    weatherCsv(weatherRow("2025-02-29"), weatherRow("2025-01-01", { available_at: "2025-01-01T20:00:00" })),
    labelCsv(), options,
  );
  assert.equal(report.issues.length, 2);
});

test("CSV supports BOM, CRLF, quoted commas, escaped quotes, and embedded newlines", () => {
  const records = readCsv('\uFEFFdate,source_ref\r\n2025-01-01,"a,""quoted""\nreference"\r\n', ["date", "source_ref"]);
  assert.equal(records[0]?.values.source_ref, 'a,"quoted"\nreference');
  for (const csv of ['a,a\n1,2', 'a,b\n1', 'a,b\n1,"unclosed', 'a,b\n1,"x"y', 'a,b\n1,x"y']) {
    assert.throws(() => readCsv(csv, ["a", "b"]));
  }
});

test("switching stations blocks the daily single-station study", () => {
  const report = auditDataset(
    weatherCsv(weatherRow("2025-01-01"), weatherRow("2025-01-02", { station_id: "OTHER" })),
    labelCsv("2025-01-02,kota-bandung,1,synthetic:a"), options,
  );
  assert.equal(report.structuralStatus, "blocked");
  assert.equal(report.weather.stationIds.length, 2);
});

test("empty templates do not pass, and synthetic examples never claim training readiness", () => {
  const empty = auditDataset(weatherCsv(), labelCsv(), options);
  assert.equal(empty.structuralStatus, "blocked");
  const report = auditDataset(
    readFileSync("research/fixtures/weather.synthetic.csv", "utf8"),
    readFileSync("research/fixtures/labels.synthetic.csv", "utf8"), options,
  );
  assert.equal(report.structuralStatus, "pass");
  assert.equal(report.trainingReadiness, "blocked");
  assert.equal(report.weather.validRows, 5);
  assert.equal(report.nextDayAlignment.knownLabelPairs, 3);
  assert.equal(report.nextDayAlignment.completeAvailablePairs, 2);
  assert.match(report.blockers[0] ?? "", /sintetis/i);
});

test("SACA inspector distinguishes padded missing years from real coverage and converts tenths of mm", () => {
  const inspection = inspectSacaRainfall([
    "RR: precipitation amount in 0.1 mm", "STAID,SOUID,DATE,RR,Q_RR",
    "153,101993,19890101,70,0", "153,101993,19890102,100,1",
    "153,101993,20150101,-9999,9", "153,101993,20251231,-9999,9",
  ].join("\n"), { stationId: "153", sourceId: "101993", start: "2015-01-01", end: "2025-12-31" });
  assert.equal(inspection.filePeriod.end, "2025-12-31");
  assert.equal(inspection.validObservationPeriod.end, "1989-01-01");
  assert.equal(inspection.requestedPeriod.validObservations, 0);
  assert.equal(inspection.suspectObservations, 1);
  assert.equal(inspection.missingObservations, 2);
  assert.equal(inspection.validRainfallMm.max, 7);
  assert.equal(inspection.decision, "reject_for_requested_period");
});

test("SACA metadata identifiers must match actual series and source units must be explicit", () => {
  const input = ["RR: precipitation amount in 0.1 mm", "STAID,SOUID,DATE,RR,Q_RR", "1993,101993,20250101,70,0"].join("\n");
  const inspection = inspectSacaRainfall(input, { stationId: "153", sourceId: "101993", start: "2025-01-01", end: "2025-12-31" });
  assert.equal(inspection.identifierMismatch, true);
  assert.equal(inspection.decision, "reject_for_requested_period");
  assert.throws(() => inspectSacaRainfall(input.replace("0.1 mm", "mm"), { stationId: "153", sourceId: "101993", start: "2025-01-01", end: "2025-12-31" }));
});
