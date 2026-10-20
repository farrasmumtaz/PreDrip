import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

import { inspectSacaRainfall } from "./saca";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      file: { type: "string" }, station: { type: "string" }, source: { type: "string" },
      start: { type: "string" }, end: { type: "string" }, out: { type: "string" },
    }, strict: true, allowPositionals: false,
  });
  if (!values.file || !values.station || !values.source || !values.start || !values.end) {
    throw new Error("Wajib: --file <SACA-RR.txt> --station <STAID-metadata> --source <SOUID> --start YYYY-MM-DD --end YYYY-MM-DD [--out <json>].");
  }
  if (values.out && resolve(values.out).toLowerCase() === resolve(values.file).toLowerCase()) {
    throw new Error("Output tidak boleh menimpa input.");
  }
  const input = await readFile(values.file);
  const report = inspectSacaRainfall(input.toString("utf8"), {
    stationId: values.station, sourceId: values.source, start: values.start, end: values.end,
  });
  const output = JSON.stringify({
    generatedAt: new Date().toISOString(),
    input: { path: values.file, sha256: createHash("sha256").update(input).digest("hex") },
    ...report,
  }, null, 2) + "\n";
  if (values.out) {
    await mkdir(dirname(resolve(values.out)), { recursive: true });
    await writeFile(values.out, output, { flag: "wx" });
  }
  console.info(output);
  if (report.decision === "reject_for_requested_period") process.exitCode = 2;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
