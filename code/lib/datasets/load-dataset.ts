import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cache } from "react";

import { buildDatasetView, DatasetInputError, type DatasetView } from "@/research/src/dataset-view";

export type DatasetState =
  | { status: "ready"; data: DatasetView }
  | { status: "missing" }
  | { status: "invalid" };

const snapshotName = "era5-kota-bandung-2015-01-01-2025-12-31";

export const loadDataset = cache(async (): Promise<DatasetState> => {
  try {
    const root = process.cwd();
    const [manifestText, weatherCsv, labelsCsv] = await Promise.all([
      readFile(join(root, "research", "data", "raw", `${snapshotName}.manifest.json`), "utf8"),
      readFile(join(root, "research", "data", "normalized", `${snapshotName}.weather.csv`), "utf8"),
      readFile(join(root, "research", "evidence", "kota-bandung-positive-labels.csv"), "utf8"),
    ]);
    const manifest: unknown = JSON.parse(manifestText);
    return { status: "ready", data: buildDatasetView(manifest, weatherCsv, labelsCsv) };
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return { status: "missing" };
    console.error("[PreDrip dataset]", error instanceof DatasetInputError ? error.message : "Dataset tidak dapat dibaca atau divalidasi.");
    return { status: "invalid" };
  }
});
