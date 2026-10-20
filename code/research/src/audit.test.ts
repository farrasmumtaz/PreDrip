import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { auditDataset, isDate, LABEL_HEADERS, WEATHER_HEADERS } from "./audit";
import { readCsv, writeCsv } from "./csv";
import { inspectSacaRainfall } from "./saca";
import { buildEra5Url, normalizeEra5 } from "./era5";

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

const era5Request = { latitude: -6.9175, longitude: 107.6191, start: "2025-01-01", end: "2025-01-02", regionId: "kota-bandung" };
function era5Fixture() {
  return {
    latitude: -7, longitude: 107.5, elevation: 700, timezone: "Asia/Jakarta", utc_offset_seconds: 25200,
    daily_units: { time: "iso8601", precipitation_sum: "mm", relative_humidity_2m_mean: "%", temperature_2m_mean: "°C" },
    daily: { time: ["2025-01-01", "2025-01-02"], precipitation_sum: [0, 10] as (number | null)[], relative_humidity_2m_mean: [80, 90], temperature_2m_mean: [25, 26] },
  };
}

test("ERA5 acquisition pins one model, WIB day boundaries, units, and grid selection", () => {
  const url = new URL(buildEra5Url(era5Request));
  assert.equal(url.hostname, "archive-api.open-meteo.com");
  assert.equal(url.searchParams.get("models"), "era5");
  assert.equal(url.searchParams.get("timezone"), "Asia/Jakarta");
  assert.equal(url.searchParams.get("cell_selection"), "nearest");
  assert.equal(url.searchParams.get("elevation"), "nan");
  assert.throws(() => buildEra5Url({ ...era5Request, latitude: 91 }));
  assert.throws(() => buildEra5Url({ ...era5Request, start: "2025-02-01" }));
});

test("ERA5 normalization preserves zero/missing, identifies the returned grid, and never invents historical availability", () => {
  const fixture = era5Fixture();
  fixture.daily.precipitation_sum[1] = null;
  const result = normalizeEra5(fixture, era5Request, "raw/source.manifest.json");
  const rows = readCsv(result.csv, WEATHER_HEADERS);
  assert.equal(rows[0]?.values.rainfall_mm, "0");
  assert.equal(rows[1]?.values.rainfall_mm, "");
  assert.equal(rows[0]?.values.available_at, "");
  assert.match(rows[0]?.values.station_id ?? "", /^grid:era5:lat=-7:lon=107.5$/);
  assert.equal(result.summary.unknownAvailability, 2);
  assert.equal(result.summary.missingValues.rainfall, 1);
  assert.match(rows[1]?.values.source_ref ?? "", /#date=2025-01-02$/);
});

test("ERA5 rejects unit/timezone mismatches, invalid values, and unequal arrays", () => {
  const timezone = era5Fixture(); timezone.timezone = "GMT";
  const units = era5Fixture(); units.daily_units.precipitation_sum = "inch";
  const length = era5Fixture(); length.daily.temperature_2m_mean.pop();
  const badValue = era5Fixture(); badValue.daily.relative_humidity_2m_mean[0] = 150;
  for (const fixture of [timezone, units, length, badValue]) {
    assert.throws(() => normalizeEra5(fixture, era5Request, "source"));
  }
});

test("ERA5 rejects duplicate/shifted dates even if all array lengths match", () => {
  const duplicate = era5Fixture(); duplicate.daily.time[1] = "2025-01-01";
  const shifted = era5Fixture(); shifted.daily.time = ["2025-01-02", "2025-01-03"];
  assert.throws(() => normalizeEra5(duplicate, era5Request, "source"));
  assert.throws(() => normalizeEra5(shifted, era5Request, "source"));
});

test("normalized CSV writer round-trips quoted provenance without losing empty or zero values", () => {
  const csv = writeCsv(["date", "value", "source"], [{ date: "2025-01-01", value: 0, source: 'a,"b"\nc' }, { date: "2025-01-02", value: null, source: "x" }]);
  const rows = readCsv(csv, ["date", "value", "source"]);
  assert.equal(rows[0]?.values.value, "0");
  assert.equal(rows[0]?.values.source, 'a,"b"\nc');
  assert.equal(rows[1]?.values.value, "");
});
