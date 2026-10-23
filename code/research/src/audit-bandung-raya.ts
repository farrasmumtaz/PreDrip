import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { extractRegionalDibi } from "./dibi";
import { STUDY_REGIONS, summarizeRegion } from "./bandung-raya";
import { DEFAULT_DATES } from "./experiment-data";
import { z } from "zod";
import { isDate } from "./audit";

const manifestSchema = z.object({
  model: z.literal("ERA5"), timezone: z.literal("Asia/Jakarta"),
  request: z.object({ regionId: z.string(), latitude: z.number().finite(), longitude: z.number().finite(), start: z.string().refine(isDate), end: z.string().refine(isDate) }),
  files: z.object({ normalized: z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/) }) }),
  returnedGrid: z.object({ seriesId: z.string() }),
});

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { file: { type: "string" }, out: { type: "string", default: "research/reports/bandung-raya-feasibility-v1" } } });
  if (!values.file) throw new Error("Wajib --file <arsip.parquet>.");
  const input = await readFile(values.file);
  const hash = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");
  const { parquetReadObjects } = await import("hyparquet");
  const rows: unknown[] = await parquetReadObjects({ file: input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength), columns: ["level1", "nwil", "tglan", "kejadian"] });
  const snapshots = STUDY_REGIONS.map((region) => extractRegionalDibi(rows, hash(input), region));
  if (snapshots[0]!.archiveStart > DEFAULT_DATES.start || snapshots[0]!.archiveEnd < DEFAULT_DATES.end) throw new Error("Arsip tidak mencakup periode audit yang ditetapkan.");
  const regions = [];
  for (const [index, region] of STUDY_REGIONS.entries()) {
    const path = `research/data/normalized/${region.weatherName}.weather.csv`;
    let weather: string | undefined;
    try { weather = await readFile(path, "utf8"); } catch (error: unknown) { if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error; }
    const summary = summarizeRegion(snapshots[index]!, weather);
    const manifestPath = `research/data/raw/${region.weatherName}.manifest.json`;
    if (weather !== undefined) {
      const manifest = manifestSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")) as unknown);
      if (manifest.files.normalized.sha256 !== hash(weather) || manifest.request.regionId !== region.id || manifest.request.latitude !== region.latitude || manifest.request.longitude !== region.longitude || manifest.request.start !== DEFAULT_DATES.start || manifest.request.end < DEFAULT_DATES.end || summary.weather.status !== "available" || summary.weather.stationIds.length !== 1 || summary.weather.stationIds[0] !== manifest.returnedGrid.seriesId) throw new Error(`${region.id}: manifest/hash/grid tidak cocok.`);
    }
    regions.push({ ...summary, code: region.code,
      pilotCoordinates: { latitude: region.latitude, longitude: region.longitude }, weatherInput: weather === undefined ? null : { path, sha256: hash(weather), manifestPath } });
  }
  const grids = new Map<string, string[]>();
  for (const region of regions) if (region.weather.status === "available") for (const grid of region.weather.stationIds) grids.set(grid, [...(grids.get(grid) ?? []), region.regionId]);
  const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), operationalUse: false,
    scope: "four-region-pilot-not-entire-metropolitan-boundary", sourceSha256: hash(input), archiveRows: rows.length,
    archiveStart: snapshots[0]!.archiveStart, archiveEnd: snapshots[0]!.archiveEnd, period: { start: DEFAULT_DATES.start, end: DEFAULT_DATES.end },
    totalRegionDates: regions.reduce((sum, region) => sum + region.uniqueReportedDates, 0),
    sharedGrids: [...grids].filter(([, ids]) => ids.length > 1).map(([grid, regionIds]) => ({ grid, regionIds })), regions,
    limitations: ["Tidak ada laporan bukan label negatif terverifikasi.", "Catatan kejadian dan kelengkapan tahun belum diverifikasi ulang.", "Titik pilot/grid tidak mewakili seluruh wilayah atau DAS.", "ERA5 retrospektif; waktu tersedia historis tidak diketahui.", "Tanggal/wilayah yang berdekatan dan grid sama tidak boleh dianggap sampel independen.", "Periode 2022–2024 sudah ditinjau; bukan holdout baru yang belum dilihat."],
  };
  await mkdir(dirname(values.out), { recursive: true });
  await mkdir(values.out);
  for (const snapshot of snapshots) await writeFile(join(values.out, `${snapshot.regionId}.events.json`), JSON.stringify(snapshot, null, 2) + "\n", { flag: "wx" });
  await writeFile(join(values.out, "feasibility.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(report, null, 2));
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Audit gagal."); process.exitCode = 1; });
