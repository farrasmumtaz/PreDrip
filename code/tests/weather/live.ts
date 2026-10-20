import { DEFAULT_BMKG_ADM4, getWeatherForecast } from "../../lib/services/bmkg";

async function main(): Promise<void> {
  const result = await getWeatherForecast(DEFAULT_BMKG_ADM4);
  if (result.status !== "ready") throw new Error(`BMKG live verification unavailable: ${result.reason}`);
  console.info(JSON.stringify({ source: result.source, area: result.area, selected: result.selected, slots: result.slots.length }, null, 2));
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
