import { z } from "zod";
import { isDate } from "./audit";

const rowSchema = z.object({
  level1: z.string(), nwil: z.string(), tglan: z.string().refine(isDate),
  kejadian: z.object({ nama: z.string(), url: z.string() }),
});
export interface DibiEvent { date: string; sourceRef: string }
export interface DibiSnapshot {
  schemaVersion: 1;
  kind: "reported-events-not-ground-truth";
  regionId: "kota-bandung";
  sourceSha256: string;
  archiveRows: number;
  archiveStart: string;
  archiveEnd: string;
  events: DibiEvent[];
}

export function extractDibi(rows: readonly unknown[], sourceSha256: string): DibiSnapshot {
  if (!/^[a-f0-9]{64}$/.test(sourceSha256) || rows.length === 0) throw new Error("Arsip/hash DIBI tidak valid.");
  const events: DibiEvent[] = [];
  const sources = new Map<string, string>();
  const dates: string[] = [];
  for (const raw of rows) {
    const row = rowSchema.parse(raw);
    dates.push(row.tglan);
    if (row.level1 !== "3273" || row.kejadian.nama !== "Banjir") continue;
    if (!row.nwil.startsWith("Kota Bandung,") || !/^https:\/\/dibi\.bnpb\.go\.id\/d\/r\/\d+$/.test(row.kejadian.url)) throw new Error("Identitas wilayah/referensi DIBI perlu ditinjau.");
    const previous = sources.get(row.kejadian.url);
    if (previous && previous !== row.tglan) throw new Error("Sumber DIBI yang sama memiliki tanggal berbeda.");
    if (!previous) events.push({ date: row.tglan, sourceRef: row.kejadian.url });
    sources.set(row.kejadian.url, row.tglan);
  }
  if (!events.length) throw new Error("Tidak ada laporan banjir Kota Bandung dalam arsip.");
  dates.sort();
  return {
    schemaVersion: 1, kind: "reported-events-not-ground-truth", regionId: "kota-bandung",
    sourceSha256, archiveRows: rows.length, archiveStart: dates[0]!, archiveEnd: dates[dates.length - 1]!,
    events: events.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export const dibiSnapshotSchema = z.object({
  schemaVersion: z.literal(1), kind: z.literal("reported-events-not-ground-truth"), regionId: z.literal("kota-bandung"),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/), archiveRows: z.number().int().positive(),
  archiveStart: z.string().refine(isDate), archiveEnd: z.string().refine(isDate),
  events: z.array(z.object({ date: z.string().refine(isDate), sourceRef: z.string().regex(/^https:\/\/dibi\.bnpb\.go\.id\/d\/r\/\d+$/) })).min(1),
}).refine((value) => value.archiveStart <= value.archiveEnd && value.events.every((event) => event.date >= value.archiveStart && event.date <= value.archiveEnd), "Tanggal di luar rentang arsip.");
