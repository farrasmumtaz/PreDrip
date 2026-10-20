import { z } from "zod";

import { isDate, WEATHER_HEADERS } from "./audit";
import { writeCsv } from "./csv";

export interface Era5Request {
  latitude: number;
  longitude: number;
  start: string;
  end: string;
  regionId: string;
}

const requestSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  start: z.string().refine(isDate),
  end: z.string().refine(isDate),
  regionId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
}).refine((value) => value.start <= value.end, "Tanggal mulai harus <= tanggal akhir.");

const responseSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  elevation: z.number().finite(),
  timezone: z.literal("Asia/Jakarta"),
  utc_offset_seconds: z.literal(25200),
  daily_units: z.object({
    time: z.literal("iso8601"), precipitation_sum: z.literal("mm"),
    relative_humidity_2m_mean: z.literal("%"), temperature_2m_mean: z.literal("°C"),
  }),
  daily: z.object({
    time: z.array(z.string().refine(isDate)).min(1),
    precipitation_sum: z.array(z.number().finite().min(0).nullable()),
    relative_humidity_2m_mean: z.array(z.number().finite().min(0).max(100).nullable()),
    temperature_2m_mean: z.array(z.number().finite().min(-90).max(60).nullable()),
  }),
});

export function buildEra5Url(request: Era5Request): string {
  const input = requestSchema.parse(request);
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.search = new URLSearchParams({
    latitude: String(input.latitude), longitude: String(input.longitude),
    start_date: input.start, end_date: input.end,
    daily: "precipitation_sum,relative_humidity_2m_mean,temperature_2m_mean",
    timezone: "Asia/Jakarta", models: "era5", precipitation_unit: "mm",
    temperature_unit: "celsius", cell_selection: "nearest", elevation: "nan",
  }).toString();
  return url.toString();
}

export function normalizeEra5(payload: unknown, request: Era5Request, sourceRef: string): {
  csv: string;
  summary: {
    rows: number;
    start: string;
    end: string;
    requestedCoordinates: { latitude: number; longitude: number };
    returnedGrid: { latitude: number; longitude: number; elevationM: number; seriesId: string };
    missingValues: { rainfall: number; humidity: number; temperature: number };
    unknownAvailability: number;
  };
} {
  requestSchema.parse(request);
  if (!sourceRef.trim()) throw new Error("Referensi provenance ERA5 wajib diisi.");
  const data = responseSchema.parse(payload);
  const days = data.daily;
  const expectedRows = (Date.parse(`${request.end}T00:00:00Z`) - Date.parse(`${request.start}T00:00:00Z`)) / 86_400_000 + 1;
  if (days.time.length !== expectedRows || days.precipitation_sum.length !== expectedRows ||
      days.relative_humidity_2m_mean.length !== expectedRows || days.temperature_2m_mean.length !== expectedRows) {
    throw new Error("ERA5: panjang array/periode tidak sesuai permintaan; tidak boleh mengisi atau memotong secara diam-diam.");
  }
  // A grid cell is explicitly identified as a grid, never as a BMKG station.
  const seriesId = `grid:era5:lat=${data.latitude}:lon=${data.longitude}`;
  const rows = days.time.map((date, index) => {
    const expectedDate = new Date(Date.parse(`${request.start}T00:00:00Z`) + index * 86_400_000).toISOString().slice(0, 10);
    if (date !== expectedDate) throw new Error(`ERA5: tanggal ${date} tidak sesuai kalender ${expectedDate}.`);
    return {
      date, region_id: request.regionId, station_id: seriesId,
      rainfall_mm: days.precipitation_sum[index] ?? null,
      humidity_pct: days.relative_humidity_2m_mean[index] ?? null,
      temperature_c: days.temperature_2m_mean[index] ?? null,
      // Retrieval time is not the historical availability time. Do not invent it.
      available_at: "",
      source_ref: `${sourceRef}#date=${date}`,
    };
  });
  return {
    csv: writeCsv(WEATHER_HEADERS, rows),
    summary: {
      rows: rows.length, start: request.start, end: request.end,
      requestedCoordinates: { latitude: request.latitude, longitude: request.longitude },
      returnedGrid: { latitude: data.latitude, longitude: data.longitude, elevationM: data.elevation, seriesId },
      missingValues: {
        rainfall: days.precipitation_sum.filter((value) => value === null).length,
        humidity: days.relative_humidity_2m_mean.filter((value) => value === null).length,
        temperature: days.temperature_2m_mean.filter((value) => value === null).length,
      },
      unknownAvailability: rows.length,
    },
  };
}
