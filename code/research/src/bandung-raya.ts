import { auditDataset, LABEL_HEADERS, WEATHER_HEADERS } from "./audit";
import { readCsv, writeCsv } from "./csv";
import type { DibiSnapshot } from "./dibi";
import { DEFAULT_DATES, offsetDate } from "./experiment-data";

// Pilot points, not administrative centroids or validated catchment representations.
export const STUDY_REGIONS = [
  { code: "3273", id: "kota-bandung", sourceName: "Kota Bandung", latitude: -6.9175, longitude: 107.6191, weatherName: "era5-kota-bandung-2015-01-01-2025-12-31" },
  { code: "3204", id: "kabupaten-bandung", sourceName: "Bandung", latitude: -7.001, longitude: 107.625, weatherName: "era5-kabupaten-bandung-2015-01-01-2024-11-21" },
  { code: "3217", id: "kabupaten-bandung-barat", sourceName: "Bandung Barat", latitude: -6.833, longitude: 107.49, weatherName: "era5-kabupaten-bandung-barat-2015-01-01-2024-11-21" },
  { code: "3277", id: "kota-cimahi", sourceName: "Kota Cimahi", latitude: -6.87, longitude: 107.54, weatherName: "era5-kota-cimahi-2015-01-01-2024-11-21" },
] as const;

export function summarizeRegion(snapshot: DibiSnapshot<string>, weatherCsv?: string) {
  const events = snapshot.events.filter((event) => event.date >= DEFAULT_DATES.start && event.date <= DEFAULT_DATES.end);
  const dates = [...new Set(events.map((event) => event.date))].sort();
  const annualCounts = Object.fromEntries(Array.from({ length: 10 }, (_, index) => {
    const year = String(2015 + index);
    return [year, dates.filter((date) => date.startsWith(year)).length];
  }));
  const base = {
    regionId: snapshot.regionId, uniqueSourceRecords: events.length, uniqueReportedDates: dates.length,
    sameDayAdditionalRecords: events.length - dates.length, first: dates[0] ?? null, last: dates.at(-1) ?? null,
    annualCounts, zeroReportYears: Object.entries(annualCounts).filter(([, count]) => count === 0).map(([year]) => year),
    diagnosticWindows: { through2019: dates.filter((date) => date <= DEFAULT_DATES.trainEnd).length,
      years2020And2021: dates.filter((date) => date > DEFAULT_DATES.trainEnd && date <= DEFAULT_DATES.validationEnd).length,
      previouslyInspected2022Onward: dates.filter((date) => date > DEFAULT_DATES.validationEnd).length },
  };
  if (weatherCsv === undefined) return { ...base, weather: { status: "missing" as const } };
  const labels = writeCsv(LABEL_HEADERS, events.map((event) => ({ date: event.date, region_id: snapshot.regionId, flood_status: "1", source_ref: event.sourceRef } )).filter((event, index, all) => all.findIndex((candidate) => candidate.date === event.date) === index));
  const audit = auditDataset(weatherCsv, labels, { regionId: snapshot.regionId, datasetKind: "historical" });
  if (audit.structuralStatus !== "pass") throw new Error(`${snapshot.regionId}: kontrak cuaca tidak valid.`);
  const weather = new Map(readCsv(weatherCsv, WEATHER_HEADERS).map(({ values }) => [values.date!, values]));
  const paired = dates.filter((target) => Array.from({ length: 7 }, (_, index) => weather.get(offsetDate(target, -1 - index))).every((day, index) => day && day.rainfall_mm !== "" && (index !== 0 || (day.humidity_pct !== "" && day.temperature_c !== ""))));
  return { ...base, weather: { status: "available" as const, ...audit.weather, pairedReportedDates: paired.length, unpairedReportedDates: dates.filter((date) => !paired.includes(date)) } };
}
