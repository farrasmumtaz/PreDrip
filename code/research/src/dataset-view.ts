import { createHash } from "node:crypto";
import { z } from "zod";

import { auditDataset, isDate, LABEL_HEADERS, WEATHER_HEADERS, type AuditReport } from "./audit";
import { readCsv } from "./csv";

const sourceSchema = z.object({
  datasetKind: z.literal("reanalysis"), model: z.literal("ERA5"),
  provider: z.string().min(1), timezone: z.literal("Asia/Jakarta"),
  acquiredAt: z.string().datetime({ offset: true }),
  rows: z.number().int().positive(),
  start: z.string().refine(isDate), end: z.string().refine(isDate),
  request: z.object({
    regionId: z.literal("kota-bandung"),
    latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
    start: z.string().refine(isDate), end: z.string().refine(isDate),
  }),
  returnedGrid: z.object({
    latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
    seriesId: z.string().min(1),
  }),
  files: z.object({ normalized: z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/) }) }),
});

export interface MonthlyRainfall {
  month: number;
  totalMm: number | null;
  observedDays: number;
  missingDays: number;
}

export interface DatasetView {
  source: z.infer<typeof sourceSchema>;
  audit: AuditReport;
  rainfall: { year: number; months: MonthlyRainfall[] }[];
  evidence: { date: string; status: "0" | "1" | "unknown"; sourceRef: string }[];
}

export class DatasetInputError extends Error {}

export function buildDatasetView(manifest: unknown, weatherCsv: string, labelsCsv: string): DatasetView {
  const parsed = sourceSchema.safeParse(manifest);
  if (!parsed.success) throw new DatasetInputError("Metadata sumber tidak sesuai kontrak dataset.");
  const source = parsed.data;
  const hash = createHash("sha256").update(weatherCsv).digest("hex");
  if (hash !== source.files.normalized.sha256) {
    throw new DatasetInputError("Isi CSV telah berubah sejak snapshot dibuat. Metadata sumber perlu diperbarui.");
  }
  let audit: AuditReport;
  try {
    audit = auditDataset(weatherCsv, labelsCsv, { regionId: source.request.regionId, datasetKind: "historical" });
  } catch {
    throw new DatasetInputError("Format CSV tidak dapat diaudit.");
  }
  if (audit.structuralStatus !== "pass") {
    throw new DatasetInputError("Ada record tidak valid, duplikat, atau sumber yang belum sesuai kontrak.");
  }
  if (source.rows !== audit.weather.validRows || source.start !== audit.weather.start || source.end !== audit.weather.end ||
      source.request.start !== source.start || source.request.end !== source.end ||
      audit.weather.stationIds[0] !== source.returnedGrid.seriesId) {
    throw new DatasetInputError("Periode, jumlah hari, atau identitas seri berbeda dari metadata sumber.");
  }
  const byYear = new Map<number, MonthlyRainfall[]>();
  for (let timestamp = Date.parse(`${source.start}T00:00:00Z`); timestamp <= Date.parse(`${source.end}T00:00:00Z`); timestamp += 86_400_000) {
    const day = new Date(timestamp);
    const months = byYear.get(day.getUTCFullYear()) ?? Array.from({ length: 12 }, (_, index) => ({ month: index + 1, totalMm: null, observedDays: 0, missingDays: 0 } satisfies MonthlyRainfall));
    const month = months[day.getUTCMonth()];
    if (month) month.missingDays += 1;
    byYear.set(day.getUTCFullYear(), months);
  }
  for (const { values } of readCsv(weatherCsv, WEATHER_HEADERS)) {
    const date = values.date ?? "";
    const year = Number(date.slice(0, 4));
    const monthIndex = Number(date.slice(5, 7)) - 1;
    const months = byYear.get(year) ?? Array.from({ length: 12 }, (_, index) => ({
      month: index + 1, totalMm: null, observedDays: 0, missingDays: 0,
    } satisfies MonthlyRainfall));
    const month = months[monthIndex];
    if (!month) throw new DatasetInputError("Bulan observasi tidak valid.");
    if (values.rainfall_mm !== "") {
      month.totalMm = (month.totalMm ?? 0) + Number(values.rainfall_mm);
      month.observedDays += 1;
      month.missingDays -= 1;
    }
    byYear.set(year, months);
  }
  const rainfall = [...byYear.entries()].sort(([a], [b]) => a - b).map(([year, months]) => ({
    year, months: months.map((month) => ({
      ...month, totalMm: month.totalMm === null ? null : Math.round(month.totalMm * 100) / 100,
    })),
  }));
  const evidence = readCsv(labelsCsv, LABEL_HEADERS).map(({ values }): DatasetView["evidence"][number] => {
    const status = values.flood_status;
    if (status !== "0" && status !== "1" && status !== "unknown") throw new DatasetInputError("Status label tidak valid.");
    return { date: values.date ?? "", status, sourceRef: values.source_ref ?? "" };
  }).sort((a, b) => b.date.localeCompare(a.date));
  return { source, audit, rainfall, evidence };
}
