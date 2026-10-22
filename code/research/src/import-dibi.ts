import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { extractDibi } from "./dibi";

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { file: { type: "string" }, out: { type: "string" } }, strict: true });
  if (!values.file) throw new Error("Gunakan --file <arsip.parquet> [--out <snapshot.json>].");
  const input = await readFile(values.file);
  const { parquetReadObjects } = await import("hyparquet");
  const rows: unknown[] = await parquetReadObjects({ file: input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength), columns: ["level1", "nwil", "tglan", "kejadian"] });
  const snapshot = extractDibi(rows, createHash("sha256").update(input).digest("hex"));
  const out = resolve(values.out ?? "research/data/normalized/dibi-kota-bandung.events.json");
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(snapshot, null, 2) + "\n", { flag: "wx" });
  console.info(JSON.stringify({ output: out, archiveRows: snapshot.archiveRows, archiveEnd: snapshot.archiveEnd, candidateRecords: snapshot.events.length, sourceSha256: snapshot.sourceSha256, operationalUse: false }, null, 2));
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
