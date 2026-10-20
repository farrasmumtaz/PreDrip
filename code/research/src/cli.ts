import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

import { auditDataset } from "./audit";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      weather: { type: "string" }, labels: { type: "string" },
      region: { type: "string" }, kind: { type: "string" },
      out: { type: "string" }, help: { type: "boolean" },
    },
    strict: true, allowPositionals: false,
  });
  if (values.help) {
    console.info("npm run data:audit -- --weather <csv> --labels <csv> --region <id> --kind historical|synthetic [--out <json>]\nExit: 0 struktur valid; 2 struktur/data kosong bermasalah; 1 input/IO gagal. Exit 0 bukan izin training.");
    return;
  }
  if (!values.weather || !values.labels || !values.region ||
      (values.kind !== "historical" && values.kind !== "synthetic")) {
    throw new Error("Wajib: --weather <csv> --labels <csv> --region <id> --kind historical|synthetic. Lihat --help.");
  }
  const inputPaths = { weather: resolve(values.weather), labels: resolve(values.labels) };
  const outputPath = values.out ? resolve(values.out) : null;
  if (outputPath && Object.values(inputPaths).some((path) => path.toLowerCase() === outputPath.toLowerCase())) {
    throw new Error("Output tidak boleh menimpa file input.");
  }
  const [weather, labels] = await Promise.all([readFile(inputPaths.weather), readFile(inputPaths.labels)]);
  const report = auditDataset(weather.toString("utf8"), labels.toString("utf8"), {
    regionId: values.region, datasetKind: values.kind,
  });
  const output = JSON.stringify({
    generatedAt: new Date().toISOString(),
    inputs: {
      weather: { path: values.weather, sha256: createHash("sha256").update(weather).digest("hex") },
      labels: { path: values.labels, sha256: createHash("sha256").update(labels).digest("hex") },
    },
    ...report,
  }, null, 2) + "\n";
  if (outputPath) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, output, { flag: "wx" });
    console.info(`Audit tersimpan: ${values.out}`);
  }
  console.info(output);
  if (report.structuralStatus === "blocked") process.exitCode = 2;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
