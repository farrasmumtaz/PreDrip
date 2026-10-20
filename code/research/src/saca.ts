import { isDate } from "./audit";
import { readCsv } from "./csv";

const HEADERS = ["STAID", "SOUID", "DATE", "RR", "Q_RR"] as const;

export interface SacaRainfallInspection {
  rowCount: number;
  filePeriod: { start: string | null; end: string | null };
  validObservationPeriod: { start: string | null; end: string | null };
  validObservations: number;
  suspectObservations: number;
  missingObservations: number;
  invalidRecords: number;
  duplicateDates: string[];
  observedStationIds: string[];
  observedSourceIds: string[];
  expectedStationId: string;
  expectedSourceId: string;
  identifierMismatch: boolean;
  sourceUnit: "0.1 mm";
  validRainfallMm: { min: number | null; max: number | null };
  requestedPeriod: { start: string; end: string; expectedDays: number; rows: number; validObservations: number };
  decision: "review_required" | "reject_for_requested_period";
}

export function inspectSacaRainfall(
  text: string,
  options: { stationId: string; sourceId: string; start: string; end: string },
): SacaRainfallInspection {
  if (!isDate(options.start) || !isDate(options.end) || options.start > options.end) {
    throw new Error("Periode inspeksi SACA tidak valid.");
  }
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => /^\s*STAID\s*,\s*SOUID\s*,\s*DATE\s*,\s*RR\s*,\s*Q_RR\s*$/.test(line));
  if (headerIndex < 0 || !text.includes("precipitation amount in 0.1 mm")) {
    throw new Error("Format atau satuan ekspor SACA RR tidak dikenali; periksa preamble asli.");
  }
  const records = readCsv(lines.slice(headerIndex).join("\n"), HEADERS);
  const dates: string[] = [];
  const validDates: string[] = [];
  const validRainfall: number[] = [];
  const stationIds = new Set<string>();
  const sourceIds = new Set<string>();
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  let suspect = 0;
  let missing = 0;
  let invalid = 0;
  let periodRows = 0;
  let periodValid = 0;

  for (const { values } of records) {
    const compact = values.DATE ?? "";
    const date = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
    const rrText = values.RR ?? "";
    const rr = Number(rrText);
    const quality = values.Q_RR;
    if (!/^\d{8}$/.test(compact) || !isDate(date) || !/^-?\d+$/.test(rrText) ||
        !/^\d+$/.test(values.STAID ?? "") || !/^\d+$/.test(values.SOUID ?? "") ||
        !Number.isSafeInteger(rr) || (quality !== "0" && quality !== "1" && quality !== "9") ||
        (quality === "0" && rr < 0)) {
      invalid += 1;
      continue;
    }
    const key = `${values.SOUID}:${date}`;
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
    stationIds.add(values.STAID ?? "");
    sourceIds.add(values.SOUID ?? "");
    dates.push(date);
    const inPeriod = date >= options.start && date <= options.end;
    if (inPeriod) periodRows += 1;
    if (quality === "9" || rr === -9999) missing += 1;
    else if (quality === "1") suspect += 1;
    else {
      validDates.push(date);
      validRainfall.push(rr / 10);
      if (inPeriod) periodValid += 1;
    }
  }
  dates.sort();
  validDates.sort();
  const identifierMismatch = stationIds.size !== 1 || !stationIds.has(options.stationId) ||
    sourceIds.size !== 1 || !sourceIds.has(options.sourceId);
  return {
    rowCount: records.length,
    filePeriod: { start: dates[0] ?? null, end: dates[dates.length - 1] ?? null },
    validObservationPeriod: { start: validDates[0] ?? null, end: validDates[validDates.length - 1] ?? null },
    validObservations: validDates.length, suspectObservations: suspect, missingObservations: missing,
    invalidRecords: invalid, duplicateDates: [...duplicates].sort(),
    observedStationIds: [...stationIds].sort(), observedSourceIds: [...sourceIds].sort(),
    expectedStationId: options.stationId, expectedSourceId: options.sourceId, identifierMismatch,
    sourceUnit: "0.1 mm",
    validRainfallMm: {
      min: validRainfall.length > 0 ? validRainfall.reduce((min, value) => Math.min(min, value), Infinity) : null,
      max: validRainfall.length > 0 ? validRainfall.reduce((max, value) => Math.max(max, value), -Infinity) : null,
    },
    requestedPeriod: {
      start: options.start, end: options.end,
      expectedDays: (Date.parse(`${options.end}T00:00:00Z`) - Date.parse(`${options.start}T00:00:00Z`)) / 86_400_000 + 1,
      rows: periodRows, validObservations: periodValid,
    },
    decision: periodValid === 0 || identifierMismatch || invalid > 0 || duplicates.size > 0 ? "reject_for_requested_period" : "review_required",
  };
}
