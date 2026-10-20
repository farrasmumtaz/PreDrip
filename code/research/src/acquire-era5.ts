import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

import { buildEra5Url, normalizeEra5, type Era5Request } from "./era5";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      latitude: { type: "string" }, longitude: { type: "string" }, region: { type: "string" },
      start: { type: "string" }, end: { type: "string" }, name: { type: "string" }, help: { type: "boolean" },
    }, strict: true, allowPositionals: false,
  });
  if (values.help) {
    console.info("npm run data:acquire:era5 -- --latitude=-6.9175 --longitude=107.6191 --region kota-bandung --start 2015-01-01 --end 2025-12-31 [--name <nama-snapshot-baru>]\nERA5 reanalysis untuk eksperimen historis. Tidak menghasilkan label banjir atau bukti data tersedia sebelum cutoff.");
    return;
  }
  if (!values.latitude?.trim() || !values.longitude?.trim() || !values.region || !values.start || !values.end) {
    throw new Error("Koordinat, --region, --start, dan --end wajib diisi. Gunakan --help.");
  }
  const request: Era5Request = {
    latitude: Number(values.latitude), longitude: Number(values.longitude),
    regionId: values.region, start: values.start, end: values.end,
  };
  const requestUrl = buildEra5Url(request);
  const name = values.name ?? `era5-${request.regionId}-${request.start}-${request.end}`;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error("--name hanya boleh berisi huruf kecil, angka, dan tanda hubung.");
  const paths = {
    raw: `research/data/raw/${name}.json`,
    manifest: `research/data/raw/${name}.manifest.json`,
    normalized: `research/data/normalized/${name}.weather.csv`,
  };
  for (const path of Object.values(paths)) {
    try {
      await access(path);
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
    throw new Error(`Snapshot sudah ada: ${path}. Gunakan --name baru; input tidak ditimpa.`);
  }
  const response = await fetch(requestUrl, { signal: AbortSignal.timeout(45_000) });
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}; belum menulis snapshot.`);
  const raw = Buffer.from(await response.arrayBuffer());
  const payload: unknown = JSON.parse(raw.toString("utf8"));
  const normalized = normalizeEra5(payload, request, paths.manifest);
  const acquiredAt = new Date().toISOString();
  const manifest = {
    schemaVersion: 1, acquiredAt, requestUrl, request,
    datasetKind: "reanalysis", model: "ERA5", provider: "Open-Meteo / Copernicus C3S / ECMWF",
    timezone: "Asia/Jakarta", utcOffsetSeconds: 25200,
    gridResolutionDegrees: 0.25,
    attribution: "Weather data by Open-Meteo.com, based on ERA5 Copernicus Climate Change Service information.",
    documentation: "https://open-meteo.com/en/docs/historical-weather-api",
    licence: "https://open-meteo.com/en/terms",
    files: {
      raw: { path: paths.raw, sha256: createHash("sha256").update(raw).digest("hex") },
      normalized: { path: paths.normalized, sha256: createHash("sha256").update(normalized.csv).digest("hex") },
    },
    ...normalized.summary,
    historicalAvailability: "not_verified; available_at deliberately empty; reanalysis has publication latency",
    permittedUseInProject: "historical EDA and retrospective methods development",
    trainingReadiness: "blocked",
    blockers: [
      "Reanalysis grid, bukan observasi stasiun BMKG; keterwakilan wilayah belum divalidasi.",
      "Fitur tanggal D tidak terbukti tersedia pada cutoff D; latensi/revisi reanalysis harus dipertimbangkan.",
      "Belum ada label banjir 0/1 terverifikasi dan split waktu yang ditinjau.",
    ],
  };
  for (const path of Object.values(paths)) await mkdir(dirname(resolve(path)), { recursive: true });
  // Exclusive writes preserve the source and every prior acquisition snapshot.
  await writeFile(paths.raw, raw, { flag: "wx" });
  await writeFile(paths.manifest, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  await writeFile(paths.normalized, normalized.csv, { flag: "wx" });
  console.info(JSON.stringify({ files: paths, ...normalized.summary, trainingReadiness: "blocked" }, null, 2));
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && error.cause instanceof Error ? ` (${error.cause.message})` : "";
  console.error(message + cause);
  process.exitCode = 1;
});
