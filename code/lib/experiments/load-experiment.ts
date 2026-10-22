import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildExperimentView } from "../../research/src/experiment-view";

export type ExperimentState =
  | { status: "ready"; data: ReturnType<typeof buildExperimentView> }
  | { status: "unavailable"; reason: "missing" | "invalid" };

export async function loadExperiment(): Promise<ExperimentState> {
  try {
    const [model, weather, events] = await Promise.all([
      "research/reports/report-proxy-v1/model.json",
      "research/data/normalized/era5-kota-bandung-2015-01-01-2025-12-31.weather.csv",
      "research/data/normalized/dibi-kota-bandung.events.json",
    ].map((path) => readFile(join(process.cwd(), path), "utf8")));
    return { status: "ready", data: buildExperimentView(model!, weather!, events!) };
  } catch (error: unknown) {
    return { status: "unavailable", reason: error instanceof Error && "code" in error && error.code === "ENOENT" ? "missing" : "invalid" };
  }
}
