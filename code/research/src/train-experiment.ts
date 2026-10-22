import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { buildExamples, DEFAULT_DATES, FEATURES, Partition } from "./experiment-data";
import { dibiSnapshotSchema } from "./dibi";
import { chooseThreshold, evaluate, fitLogistic, scoreLogistic } from "./logistic";
import { writeCsv } from "./csv";

async function main(): Promise<void> {
  const { values } = parseArgs({ options: {
    "accept-report-proxy": { type: "boolean" },
    weather: { type: "string", default: "research/data/normalized/era5-kota-bandung-2015-01-01-2025-12-31.weather.csv" },
    events: { type: "string", default: "research/data/normalized/dibi-kota-bandung.events.json" },
    out: { type: "string", default: "research/reports/report-proxy-v1" },
  } });
  if (!values["accept-report-proxy"]) throw new Error("Wajib --accept-report-proxy: label 0 hanya asumsi tidak ada laporan, bukan tidak banjir.");
  const weather = await readFile(values.weather);
  const events = await readFile(values.events);
  const snapshot = dibiSnapshotSchema.parse(JSON.parse(events.toString("utf8")) as unknown);
  const dataset = buildExamples(weather.toString("utf8"), snapshot, DEFAULT_DATES);
  const partitions = (name: Partition) => dataset.examples.filter((row) => row.partition === name);
  const train = partitions("train"), validation = partitions("validation");
  const model = fitLogistic(train.map((row) => row.x), train.map((row) => row.y));
  const validationScores = validation.map((row) => scoreLogistic(model, row.x));
  const threshold = chooseThreshold(validation.map((row) => row.y), validationScores);
  const hash = (buffer: Buffer) => createHash("sha256").update(buffer).digest("hex");
  const policy = {
    operationalUse: false, target: "next-day-report-in-DIBI-snapshot",
    positive: "reported-event-date", negative: "assumed-no-report-not-verified-no-flood",
    weather: "retrospective-ERA5-not-operational-forecast", score: "uncalibrated-not-flood-probability",
  };
  const inputs = { weather: { path: values.weather, sha256: hash(weather) }, events: { path: values.events, sha256: hash(events), originalSha256: snapshot.sourceSha256 } };
  const predictions = dataset.examples.map((row) => ({ ...row, score: scoreLogistic(model, row.x) }));
  const evaluation = (["train", "validation", "test"] as const).map((partition) => {
    const rows = predictions.filter((row) => row.partition === partition);
    const labels = rows.map((row) => row.y);
    return {
      partition, start: rows[0]?.targetDate, end: rows.at(-1)?.targetDate,
      assumedNegatives: rows.filter((row) => row.y === 0).length,
      logistic: evaluate(labels, rows.map((row) => row.score), threshold),
      alwaysNoReport: evaluate(labels, rows.map(() => 0), 0.5),
    };
  });
  const report = {
    schemaVersion: 1, generatedAt: new Date().toISOString(), ...policy, inputs,
    dates: DEFAULT_DATES, threshold, thresholdSelection: "validation F1; ties precision then higher threshold; grid 0.1/0.25/0.5/0.75/0.9",
    features: FEATURES, skippedMissing: dataset.skippedMissing,
    unknownAvailabilityInWeatherInput: dataset.unknownAvailability,
    reportedDatesInPeriod: dataset.reportDates,
    includedPositiveDates: predictions.filter((row) => row.y === 1).length,
    evaluation,
  };
  // mkdir without recursive prevents overwriting an earlier experiment.
  await mkdir(dirname(values.out), { recursive: true });
  await mkdir(values.out);
  const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
  await writeFile(join(values.out, "model.json"), json({ schemaVersion: 1, ...policy, inputs, dates: DEFAULT_DATES, features: FEATURES, threshold, model }), { flag: "wx" });
  await writeFile(join(values.out, "evaluation.json"), json(report), { flag: "wx" });
  await writeFile(join(values.out, "predictions.csv"), writeCsv(
    ["feature_date", "target_date", "partition", "proxy_label", "label_basis", "source_ref", "score", "predicted_report"],
    predictions.map((row) => ({ feature_date: row.featureDate, target_date: row.targetDate, partition: row.partition, proxy_label: row.y,
      label_basis: row.y ? "reported" : "assumed-no-report", source_ref: snapshot.events.filter((event) => event.date === row.targetDate).map((event) => event.sourceRef).join(";"),
      score: row.score, predicted_report: Number(row.score >= threshold),
    }))), { flag: "wx" });
  console.log(json({ output: values.out, ...report }));
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Training gagal."); process.exitCode = 1; });
