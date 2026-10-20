import { z } from "zod";

export const BMKG_AREAS = [
  { adm4: "32.73.19.1001", name: "Braga" },
  { adm4: "32.73.19.1002", name: "Merdeka" },
  { adm4: "32.73.19.1003", name: "Kebon Pisang" },
  { adm4: "32.73.19.1004", name: "Babakan Ciamis" },
] as const;
export const DEFAULT_BMKG_ADM4 = BMKG_AREAS[0].adm4;
const SLOT_MS = 3 * 60 * 60 * 1000;
const MAX_ISSUE_AGE_MS = 24 * 60 * 60 * 1000;

export interface ForecastSlot {
  validAt: string;
  issuedAt: string;
  temperatureC: number | null;
  humidityPercent: number | null;
  windKmh: number | null;
  windDirection: string | null;
  condition: string;
  weatherCode: number;
}

export type WeatherForecast =
  | {
    status: "ready";
    source: "BMKG";
    area: { adm4: string; village: string; district: string; city: string; province: string; latitude: number; longitude: number };
    selected: ForecastSlot;
    slots: ForecastSlot[];
  }
  | { status: "unavailable"; reason: "invalid-area" | "network" | "http" | "invalid-data" | "stale" };

export type BmkgFetcher = (url: string, init: RequestInit & { next: { revalidate: number } }) => Promise<Response>;

const locationSchema = z.object({
  adm4: z.string(), desa: z.string().trim().min(1), kecamatan: z.string().trim().min(1),
  kotkab: z.string().trim().min(1), provinsi: z.string().trim().min(1),
  lat: z.number().finite().min(-90).max(90), lon: z.number().finite().min(-180).max(180),
});
const responseSchema = z.object({
  lokasi: locationSchema,
  data: z.array(z.object({ lokasi: z.object({ adm4: z.string() }), cuaca: z.array(z.array(z.unknown())) })).min(1),
});
const slotSchema = z.object({
  utc_datetime: z.string(), analysis_date: z.string(),
  t: z.number().finite().min(-90).max(60).nullish(),
  hu: z.number().finite().min(0).max(100).nullish(),
  ws: z.number().finite().min(0).max(500).nullish(),
  wd: z.string().max(12).nullish(),
  weather_desc: z.string().trim().min(1).max(120), weather: z.number().int().min(0).max(1000),
});

export function isBmkgArea(adm4: string): boolean {
  return BMKG_AREAS.some((area) => area.adm4 === adm4);
}

function parseUtc(value: string): string | null {
  // Both fields are documented as UTC even when the provider omits the suffix.
  const normalized = value.replace(" ", "T").replace(/Z?$/, "Z");
  if (!z.string().datetime().safeParse(normalized).success) return null;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== normalized.slice(0, 10)) return null;
  return date.toISOString();
}

export function parseBmkgForecast(payload: unknown, adm4: string, now: Date): WeatherForecast {
  if (!isBmkgArea(adm4)) return { status: "unavailable", reason: "invalid-area" };
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success || !Number.isFinite(now.getTime())) return { status: "unavailable", reason: "invalid-data" };
  const location = parsed.data.lokasi;
  if (location.adm4 !== adm4) return { status: "unavailable", reason: "invalid-data" };
  const entry = parsed.data.data.find((item) => item.lokasi.adm4 === adm4);
  if (!entry) return { status: "unavailable", reason: "invalid-data" };
  const byTime = new Map<string, ForecastSlot>();
  for (const raw of entry.cuaca.flat()) {
    const slot = slotSchema.safeParse(raw);
    if (!slot.success) return { status: "unavailable", reason: "invalid-data" };
    const value = slot.data;
    const validAt = parseUtc(value.utc_datetime);
    const issuedAt = parseUtc(value.analysis_date);
    if (!validAt || !issuedAt || Date.parse(issuedAt) > Date.parse(validAt)) return { status: "unavailable", reason: "invalid-data" };
    const next: ForecastSlot = {
      validAt, issuedAt, temperatureC: value.t ?? null, humidityPercent: value.hu ?? null,
      windKmh: value.ws ?? null, windDirection: value.wd ?? null,
      condition: value.weather_desc, weatherCode: value.weather,
    };
    const previous = byTime.get(validAt);
    if (!previous || previous.issuedAt < issuedAt) byTime.set(validAt, next);
  }
  if (byTime.size === 0) return { status: "unavailable", reason: "invalid-data" };
  const timestamp = now.getTime();
  const slots = [...byTime.values()].filter((slot) => {
    const issueAge = timestamp - Date.parse(slot.issuedAt);
    const validTime = Date.parse(slot.validAt);
    return issueAge >= -300_000 && issueAge <= MAX_ISSUE_AGE_MS && validTime + SLOT_MS > timestamp && validTime <= timestamp + 72 * 60 * 60 * 1000;
  }).sort((a, b) => a.validAt.localeCompare(b.validAt));
  const selected = slots.find((slot) => Date.parse(slot.validAt) <= timestamp) ?? slots[0];
  if (!selected) return { status: "unavailable", reason: "stale" };
  return {
    status: "ready", source: "BMKG", selected, slots,
    area: { adm4, village: location.desa, district: location.kecamatan, city: location.kotkab, province: location.provinsi, latitude: location.lat, longitude: location.lon },
  };
}

export async function getWeatherForecast(adm4: string, options: { now?: Date; fetcher?: BmkgFetcher } = {}): Promise<WeatherForecast> {
  if (!isBmkgArea(adm4)) return { status: "unavailable", reason: "invalid-area" };
  try {
    const fetcher = options.fetcher ?? fetch;
    const response = await fetcher(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(adm4)}`, {
      signal: AbortSignal.timeout(8_000), redirect: "error", next: { revalidate: 600 }, headers: { Accept: "application/json" },
    });
    if (!response.ok) return { status: "unavailable", reason: "http" };
    let payload: unknown;
    try { payload = await response.json(); } catch { return { status: "unavailable", reason: "invalid-data" }; }
    return parseBmkgForecast(payload, adm4, options.now ?? new Date());
  } catch {
    return { status: "unavailable", reason: "network" };
  }
}
