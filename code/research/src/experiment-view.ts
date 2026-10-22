import { createHash } from "node:crypto";
import { z } from "zod";
import { buildExamples, DEFAULT_DATES, FEATURES } from "./experiment-data";
import { dibiSnapshotSchema } from "./dibi";
import { evaluate, scoreLogistic } from "./logistic";

const vector = z.array(z.number().finite()).length(FEATURES.length);
const artifactSchema = z.object({
  schemaVersion: z.literal(1), operationalUse: z.literal(false),
  target: z.literal("next-day-report-in-DIBI-snapshot"),
  positive: z.literal("reported-event-date"), negative: z.literal("assumed-no-report-not-verified-no-flood"),
  weather: z.literal("retrospective-ERA5-not-operational-forecast"), score: z.literal("uncalibrated-not-flood-probability"),
  features: z.array(z.string()).refine((value) => JSON.stringify(value) === JSON.stringify(FEATURES)),
  dates: z.object({ start: z.literal(DEFAULT_DATES.start), end: z.literal(DEFAULT_DATES.end), trainEnd: z.literal(DEFAULT_DATES.trainEnd), validationEnd: z.literal(DEFAULT_DATES.validationEnd) }),
  threshold: z.number().finite().gt(0).lte(1),
  inputs: z.object({ weather: z.object({ sha256: z.string() }), events: z.object({ sha256: z.string(), originalSha256: z.string() }) }),
  model: z.object({ method: z.literal("weighted-logistic-regression"), means: vector, scales: z.array(z.number().finite().positive()).length(FEATURES.length), coefficients: vector,
    intercept: z.number().finite(), iterations: z.number().int().nonnegative(), gradientMax: z.number().finite().nonnegative().lt(1e-7), l2: z.literal(0.01) }),
});

export function buildExperimentView(modelJson: string, weatherCsv: string, eventsJson: string) {
  const artifact = artifactSchema.parse(JSON.parse(modelJson) as unknown);
  const hash = (text: string) => createHash("sha256").update(text).digest("hex");
  const snapshot = dibiSnapshotSchema.parse(JSON.parse(eventsJson) as unknown);
  if (artifact.inputs.weather.sha256 !== hash(weatherCsv) || artifact.inputs.events.sha256 !== hash(eventsJson) || artifact.inputs.events.originalSha256 !== snapshot.sourceSha256) throw new Error("Snapshot eksperimen tidak sesuai hash model.");
  const { examples } = buildExamples(weatherCsv, snapshot, artifact.dates);
  const test = examples.filter((row) => row.partition === "test");
  const last = test.at(-1);
  if (!last || last.targetDate !== artifact.dates.end) throw new Error("Periode test tidak lengkap.");
  const scores = test.map((row) => scoreLogistic(artifact.model, row.x));
  return {
    start: test[0]!.targetDate, end: last.targetDate, threshold: artifact.threshold,
    metrics: evaluate(test.map((row) => row.y), scores, artifact.threshold),
    baseline: evaluate(test.map((row) => row.y), test.map(() => 0), 0.5),
    latest: { targetDate: last.targetDate, featureDate: last.featureDate, score: scores.at(-1)!, predictedReport: scores.at(-1)! >= artifact.threshold, reported: last.y === 1 },
  };
}
