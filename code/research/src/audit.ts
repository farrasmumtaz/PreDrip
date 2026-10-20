import { z } from "zod";

import { readCsv } from "./csv";

export const WEATHER_HEADERS = [
  "date", "region_id", "station_id", "rainfall_mm", "humidity_pct",
  "temperature_c", "available_at", "source_ref",
] as const;
export const LABEL_HEADERS = ["date", "region_id", "flood_status", "source_ref"] as const;
const DAY_MS = 86_400_000;

export interface AuditOptions {
  regionId: string;
  datasetKind: "historical" | "synthetic";
}

interface WeatherRow {
  date: string;
  stationId: string;
  rainfall: number | null;
  humidity: number | null;
  temperature: number | null;
  availableAt: number | null;
}

interface LabelRow {
  date: string;
  status: "0" | "1" | "unknown";
}

export interface AuditIssue {
  file: "weather" | "labels";
  recordNumber: number;
  message: string;
}

export interface AuditReport {
  contractVersion: 1;
  regionId: string;
  datasetKind: AuditOptions["datasetKind"];
  timezone: "Asia/Jakarta";
  predictionCutoff: "23:59:59.999+07:00 on feature date";
  structuralStatus: "pass" | "blocked";
  trainingReadiness: "blocked";
  issues: AuditIssue[];
  weather: {
    inputRows: number;
    validRows: number;
    start: string | null;
    end: string | null;
    stationIds: string[];
    missingCalendarDays: string[];
    missingValues: { rainfall: number; humidity: number; temperature: number };
    unknownAvailability: number;
    unavailableAtCutoff: number;
  };
  labels: {
    inputRows: number;
    validRows: number;
    flood: number;
    noFlood: number;
    unknown: number;
  };
  nextDayAlignment: {
    knownLabelPairs: number;
    floodPairs: number;
    noFloodPairs: number;
    unknownLabelDays: number;
    missingLabelDays: number;
    completeAvailablePairs: number;
  };
  blockers: string[];
}

export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01" || value > "2100-12-31") return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function moveDay(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function nullableNumber(value: string, name: string, min: number, max: number): number | null {
  if (value === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error(`${name}: angka desimal dengan titik diperlukan.`);
  const parsed = Number(value);
  if (parsed === 8888 || parsed === 9999 || parsed === -9999) {
    throw new Error(`${name}: kode khusus sumber harus ditelaah dan dinormalisasi menjadi kosong, bukan angka cuaca.`);
  }
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name}: di luar rentang ${min}..${max}; periksa satuan/sumber.`);
  }
  return parsed;
}

function readAvailability(value: string): number | null {
  if (value === "") return null;
  if (!z.string().datetime({ offset: true }).safeParse(value).success || !isDate(value.slice(0, 10))) {
    throw new Error("available_at: gunakan ISO timestamp dengan Z atau offset eksplisit.");
  }
  return Date.parse(value);
}

export function auditDataset(weatherCsv: string, labelsCsv: string, options: AuditOptions): AuditReport {
  if (!options.regionId.trim()) throw new Error("regionId wajib diisi.");
  const weatherRecords = readCsv(weatherCsv, WEATHER_HEADERS);
  const labelRecords = readCsv(labelsCsv, LABEL_HEADERS);
  const issues: AuditIssue[] = [];
  const weather: WeatherRow[] = [];
  const labels: LabelRow[] = [];
  const seenWeather = new Set<string>();
  const seenLabels = new Set<string>();

  for (const [file, records] of [["weather", weatherRecords], ["labels", labelRecords]] as const) {
    for (const record of records) {
      const values = record.values;
      const date = values.date ?? "";
      try {
        if (!isDate(date)) throw new Error("date: tanggal kalender YYYY-MM-DD tidak valid (1900..2100).");
        if (values.region_id !== options.regionId) {
          throw new Error(`region_id berbeda dari wilayah studi ${options.regionId}. Pisahkan wilayah sebelum audit.`);
        }
        if (file === "weather") {
          if (!values.station_id || !values.source_ref) throw new Error("station_id dan source_ref wajib diisi.");
          const row: WeatherRow = {
            date,
            stationId: values.station_id,
            rainfall: nullableNumber(values.rainfall_mm ?? "", "rainfall_mm", 0, 3000),
            humidity: nullableNumber(values.humidity_pct ?? "", "humidity_pct", 0, 100),
            temperature: nullableNumber(values.temperature_c ?? "", "temperature_c", -90, 60),
            availableAt: readAvailability(values.available_at ?? ""),
          };
          if (seenWeather.has(date)) throw new Error(`Duplikat wilayah/tanggal ${date}; jangan memilih baris secara diam-diam.`);
          seenWeather.add(date);
          weather.push(row);
        } else {
          const status = values.flood_status;
          if (status !== "0" && status !== "1" && status !== "unknown") {
            throw new Error("flood_status harus 0, 1, atau unknown.");
          }
          if (status !== "unknown" && !values.source_ref) {
            throw new Error("Label 0/1 memerlukan source_ref sebagai bukti, termasuk bukti hari tanpa banjir.");
          }
          if (seenLabels.has(date)) throw new Error(`Duplikat label wilayah/tanggal ${date}; selesaikan konflik dahulu.`);
          seenLabels.add(date);
          labels.push({ date, status });
        }
      } catch (error: unknown) {
        issues.push({ file, recordNumber: record.recordNumber, message: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  weather.sort((a, b) => a.date.localeCompare(b.date));
  labels.sort((a, b) => a.date.localeCompare(b.date));
  const first = weather[0]?.date ?? null;
  const last = weather[weather.length - 1]?.date ?? null;
  const missingCalendarDays: string[] = [];
  if (first && last) {
    for (let date = first; date <= last; date = moveDay(date, 1)) {
      if (!seenWeather.has(date)) missingCalendarDays.push(date);
    }
  }
  const labelsByDate = new Map(labels.map((row) => [row.date, row]));
  const alignment: AuditReport["nextDayAlignment"] = {
    knownLabelPairs: 0, floodPairs: 0, noFloodPairs: 0,
    unknownLabelDays: 0, missingLabelDays: 0, completeAvailablePairs: 0,
  };
  let unknownAvailability = 0;
  let unavailableAtCutoff = 0;
  for (const row of weather) {
    const cutoff = Date.parse(`${row.date}T23:59:59.999+07:00`);
    const available = row.availableAt !== null && row.availableAt <= cutoff;
    if (row.availableAt === null) unknownAvailability += 1;
    else if (!available) unavailableAtCutoff += 1;
    const label = labelsByDate.get(moveDay(row.date, 1));
    if (!label) alignment.missingLabelDays += 1;
    else if (label.status === "unknown") alignment.unknownLabelDays += 1;
    else {
      alignment.knownLabelPairs += 1;
      if (label.status === "1") alignment.floodPairs += 1;
      else alignment.noFloodPairs += 1;
      if (available && row.rainfall !== null && row.humidity !== null && row.temperature !== null) {
        alignment.completeAvailablePairs += 1;
      }
    }
  }
  const stationIds = [...new Set(weather.map((row) => row.stationId))].sort();
  const blockers: string[] = [];
  if (options.datasetKind === "synthetic") blockers.push("Data sintetis: hanya untuk memeriksa alat audit, bukan bukti prediksi Bandung.");
  if (weather.length === 0) blockers.push("Belum ada observasi cuaca valid.");
  if (labels.length === 0) blockers.push("Belum ada label banjir valid.");
  if (issues.length > 0) blockers.push("Perbaiki record invalid/duplikat; statistik parsial tidak boleh dipakai sebagai hasil final.");
  if (stationIds.length > 1) blockers.push("Lebih dari satu stasiun: tetapkan satu stasiun atau aturan agregasi spasial sebelum training.");
  if (missingCalendarDays.length > 0) blockers.push("Ada gap kalender cuaca; jangan membuat lag/rolling berdasarkan nomor baris.");
  if (unknownAvailability > 0 || unavailableAtCutoff > 0) blockers.push("Waktu ketersediaan fitur belum sesuai cutoff prediksi; tinjau risiko kebocoran waktu.");
  if (alignment.floodPairs === 0 || alignment.noFloodPairs === 0) blockers.push("Pasangan target besok belum mencakup kedua kelas 0 dan 1.");
  if (alignment.completeAvailablePairs === 0) blockers.push("Belum ada pasangan lengkap yang tersedia sebelum cutoff.");
  blockers.push("Review manual wajib: keterwakilan stasiun, periode ukur, provenance label 0/1, dan ketersediaan historis. Lalu rancang split waktu dan evaluasi.");

  return {
    contractVersion: 1, regionId: options.regionId, datasetKind: options.datasetKind,
    timezone: "Asia/Jakarta", predictionCutoff: "23:59:59.999+07:00 on feature date",
    structuralStatus: issues.length === 0 && weather.length > 0 && labels.length > 0 && stationIds.length === 1 ? "pass" : "blocked",
    trainingReadiness: "blocked", issues,
    weather: {
      inputRows: weatherRecords.length, validRows: weather.length, start: first, end: last,
      stationIds, missingCalendarDays,
      missingValues: {
        rainfall: weather.filter((row) => row.rainfall === null).length,
        humidity: weather.filter((row) => row.humidity === null).length,
        temperature: weather.filter((row) => row.temperature === null).length,
      },
      unknownAvailability, unavailableAtCutoff,
    },
    labels: {
      inputRows: labelRecords.length, validRows: labels.length,
      flood: labels.filter((row) => row.status === "1").length,
      noFlood: labels.filter((row) => row.status === "0").length,
      unknown: labels.filter((row) => row.status === "unknown").length,
    },
    nextDayAlignment: alignment, blockers,
  };
}
