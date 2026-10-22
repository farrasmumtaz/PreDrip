import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExamples, offsetDate } from "./experiment-data";
import { fitLogistic, scoreLogistic, evaluate, chooseThreshold } from "./logistic";
import { writeCsv } from "./csv";
import { WEATHER_HEADERS } from "./audit";
import { createHash } from "node:crypto";
import { buildExperimentView } from "./experiment-view";
import { DEFAULT_DATES, FEATURES } from "./experiment-data";

const snapshot = { schemaVersion: 1, kind: "reported-events-not-ground-truth", regionId: "kota-bandung", sourceSha256: "a".repeat(64), archiveRows: 2, archiveStart: "2020-01-01", archiveEnd: "2020-01-20", events: [{ date: "2020-01-11", sourceRef: "https://dibi.bnpb.go.id/d/r/1" }] };
const dates = { start: "2020-01-08", end: "2020-01-20", trainEnd: "2020-01-10", validationEnd: "2020-01-15" };
const weatherRows = Array.from({ length: 20 }, (_, index) => ({ date: offsetDate("2020-01-01", index), region_id: "kota-bandung", station_id: "ERA5", rainfall_mm: String(index + 1), humidity_pct: "80", temperature_c: "24", available_at: "", source_ref: "https://example.org/era5" }));
const csv = (rows = weatherRows) => writeCsv(WEATHER_HEADERS, rows);

test("features use only prior days, partition on target, no assumed future coverage", () => {
  const result = buildExamples(csv(), snapshot, dates);
  assert.deepEqual(result.examples[0]?.x, [7, 6, 18, 28, 80, 24]);
  assert.equal(result.examples.find((row) => row.targetDate === "2020-01-11")?.partition, "validation");
  assert.equal(result.examples.find((row) => row.targetDate === "2020-01-11")?.y, 1);
  const changed = buildExamples(csv(weatherRows.map((row) => row.date >= "2020-01-08" ? { ...row, rainfall_mm: "999" } : row)), snapshot, dates);
  assert.deepEqual(changed.examples[0], result.examples[0]);
  const futureLabels = buildExamples(csv(), { ...snapshot, events: [...snapshot.events, { date: "2020-01-19", sourceRef: "https://dibi.bnpb.go.id/d/r/2" }] }, dates);
  assert.deepEqual(futureLabels.examples.filter((row) => row.partition === "train"), result.examples.filter((row) => row.partition === "train"));
  assert.throws(() => buildExamples(csv(), snapshot, { ...dates, end: "2020-01-21" }), /rentang arsip/);
});

test("missing history is skipped rather than imputed; invalid region rejected", () => {
  assert.equal(buildExamples(csv(weatherRows.filter((row) => row.date !== "2020-01-05")), snapshot, dates).skippedMissing, 5);
  assert.equal(buildExamples(csv(weatherRows.map((row) => row.date === "2020-01-05" ? { ...row, rainfall_mm: "" } : row)), snapshot, dates).skippedMissing, 5);
  assert.throws(() => buildExamples(csv(weatherRows.map((row) => ({ ...row, region_id: "kabupaten-bandung" }))), snapshot, dates), /struktural/);
});

test("optimizer fits signal with constant column and reaches analytic stationary point", () => {
  const x = [[-2, 7], [-1, 7], [1, 7], [2, 7]], y = [0, 0, 1, 1];
  const model = fitLogistic(x, y);
  assert.deepEqual(model.means, [0, 7]);
  assert.equal(model.scales[1], 1);
  assert.ok(model.gradientMax < 1e-7);
  assert.ok(scoreLogistic(model, [-2, 7]) < 0.1);
  assert.ok(scoreLogistic(model, [2, 7]) > 0.9);
  assert.ok(Math.abs(model.intercept) < 1e-8);
  const gradient = x.reduce((sum, row, index) => sum + (scoreLogistic(model, row) - y[index]!) * row[0]! / model.scales[0]!, 0) / x.length + model.l2 * model.coefficients[0]!;
  assert.ok(Math.abs(gradient) < 1e-7);
  const before = structuredClone(model);
  scoreLogistic(model, [1000, 7]);
  assert.deepEqual(model, before);
  assert.throws(() => scoreLogistic(model, [NaN, 7]));
  assert.throws(() => fitLogistic(x, [0, 0, 0, 0]));
});

test("balanced training and undefined metrics remain explicit", () => {
  const model = fitLogistic([[1], [1], [1], [1]], [0, 0, 0, 1]);
  assert.equal(scoreLogistic(model, [1]), 0.5);
  const metrics = evaluate([1, 0, 1, 0], [0.9, 0.8, 0.2, 0.1], 0.5);
  assert.deepEqual([metrics.tp, metrics.fp, metrics.tn, metrics.fn], [1, 1, 1, 1]);
  assert.equal(metrics.f1, 0.5);
  assert.equal(evaluate([0, 0], [0, 0], 0.5).recall, null);
  assert.equal(evaluate([1, 0], [0, 0], 0.5).precision, null);
  assert.equal(chooseThreshold([0, 1], [0.01, 0.99]), 0.9);
  assert.throws(() => evaluate([], [], 0.5));
  assert.throws(() => chooseThreshold([0, 0], [0, 0]));
});

test("dashboard recomputes historical inference; rejects changed inputs and incompatible model", () => {
  const weather = csv(Array.from({ length: 3613 }, (_, index) => ({ ...weatherRows[0]!, date: offsetDate("2015-01-01", index), rainfall_mm: "2" })));
  const events = JSON.stringify({ ...snapshot, archiveStart: "2015-01-01", archiveEnd: DEFAULT_DATES.end, events: [{ date: "2024-01-11", sourceRef: "https://dibi.bnpb.go.id/d/r/1" }] });
  const hash = (text: string) => createHash("sha256").update(text).digest("hex");
  const model = fitLogistic([Array(6).fill(1) as number[], Array(6).fill(1) as number[]], [0, 1]);
  const artifact = { schemaVersion: 1, operationalUse: false, target: "next-day-report-in-DIBI-snapshot", positive: "reported-event-date", negative: "assumed-no-report-not-verified-no-flood", weather: "retrospective-ERA5-not-operational-forecast", score: "uncalibrated-not-flood-probability", dates: DEFAULT_DATES, features: FEATURES, threshold: 0.5, model,
    inputs: { weather: { sha256: hash(weather) }, events: { sha256: hash(events), originalSha256: snapshot.sourceSha256 } } };
  const view = buildExperimentView(JSON.stringify(artifact), weather, events);
  assert.equal(view.metrics.rows, 1056);
  assert.equal(view.metrics.tp, 1);
  assert.equal(view.metrics.fp, 1055);
  assert.equal(view.latest.targetDate, "2024-11-21");
  assert.equal(view.latest.score, 0.5);
  assert.throws(() => buildExperimentView(JSON.stringify(artifact), weather + "\n", events), /hash/);
  assert.throws(() => buildExperimentView(JSON.stringify({ ...artifact, features: [...FEATURES].reverse() }), weather, events));
  assert.throws(() => buildExperimentView(JSON.stringify({ ...artifact, operationalUse: true }), weather, events));
  assert.throws(() => buildExperimentView(JSON.stringify({ ...artifact, model: { ...model, scales: Array(6).fill(0) as number[] } }), weather, events));
});
