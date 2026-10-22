import { auditDataset, LABEL_HEADERS, WEATHER_HEADERS, isDate } from "./audit";
import { readCsv, writeCsv } from "./csv";
import { dibiSnapshotSchema } from "./dibi";

export const FEATURES = ["rainfall_mm", "rainfall_lag1_mm", "rainfall_3d_mm", "rainfall_7d_mm", "humidity_pct", "temperature_c"] as const;
export type Partition = "train" | "validation" | "test";
export interface Example { featureDate: string; targetDate: string; x: number[]; y: 0 | 1; partition: Partition }
export interface ExperimentDates { start: string; end: string; trainEnd: string; validationEnd: string }
export const DEFAULT_DATES: ExperimentDates = { start: "2015-01-01", end: "2024-11-21", trainEnd: "2019-12-31", validationEnd: "2021-12-31" };
export function offsetDate(date: string, days: number): string { return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10); }

export function buildExamples(weatherCsv: string, snapshotInput: unknown, dates: ExperimentDates): { examples: Example[]; skippedMissing: number; reportDates: number; unknownAvailability: number } {
  const snapshot = dibiSnapshotSchema.parse(snapshotInput);
  if (!Object.values(dates).every(isDate) || !(dates.start <= dates.trainEnd && dates.trainEnd < dates.validationEnd && dates.validationEnd < dates.end) || dates.start < snapshot.archiveStart || dates.end > snapshot.archiveEnd) throw new Error("Split waktu/periode harus berurutan dan berada dalam rentang arsip.");
  const positives = new Set(snapshot.events.map((event) => event.date));
  const labelCsv = writeCsv(LABEL_HEADERS, [...positives].map((date) => ({ date, region_id: "kota-bandung", flood_status: "1", source_ref: snapshot.events.find((event) => event.date === date)!.sourceRef })));
  const audit = auditDataset(weatherCsv, labelCsv, { regionId: "kota-bandung", datasetKind: "historical" });
  if (audit.structuralStatus !== "pass") throw new Error("Input cuaca tidak lolos kontrak struktural.");
  const weather = new Map(readCsv(weatherCsv, WEATHER_HEADERS).map(({ values }) => [values.date!, values]));
  const examples: Example[] = [];
  let skippedMissing = 0;
  for (let target = dates.start; target <= dates.end; target = offsetDate(target, 1)) {
    const featureDate = offsetDate(target, -1);
    const days = Array.from({ length: 7 }, (_, index) => weather.get(offsetDate(featureDate, -index)));
    const today = days[0];
    if (!today || days.some((day) => !day || day.rainfall_mm === "") || today.humidity_pct === "" || today.temperature_c === "") { skippedMissing += 1; continue; }
    const rain = days.map((day) => Number(day!.rainfall_mm));
    examples.push({
      featureDate, targetDate: target,
      x: [rain[0]!, rain[1]!, rain.slice(0, 3).reduce((sum, value) => sum + value, 0), rain.reduce((sum, value) => sum + value, 0), Number(today.humidity_pct), Number(today.temperature_c)],
      y: positives.has(target) ? 1 : 0,
      partition: target <= dates.trainEnd ? "train" : target <= dates.validationEnd ? "validation" : "test",
    });
  }
  return { examples, skippedMissing, reportDates: [...positives].filter((date) => date >= dates.start && date <= dates.end).length, unknownAvailability: audit.weather.unknownAvailability };
}
