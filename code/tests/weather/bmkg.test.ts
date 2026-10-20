import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_BMKG_ADM4, getWeatherForecast, parseBmkgForecast, type BmkgFetcher } from "../../lib/services/bmkg";
import { calculateFloodRisk } from "../../lib/risk-engine";

const now = new Date("2026-10-20T07:30:00Z");
function point(hour: string) {
  return { utc_datetime: `2026-10-20 ${hour}:00:00`, analysis_date: "2026-10-20T00:00:00", t: 32 as number | null, hu: 80 as number | null, ws: 0 as number | null, wd: "E", weather_desc: "Cuaca sintetis untuk pengujian", weather: 3 };
}
function fixture() {
  return {
    lokasi: { adm4: DEFAULT_BMKG_ADM4 as string, desa: "Braga", kecamatan: "Sumur Bandung", kotkab: "Kota Bandung", provinsi: "Jawa Barat", lat: -6.918, lon: 107.608 },
    data: [{ lokasi: { adm4: DEFAULT_BMKG_ADM4 as string }, cuaca: [[point("10"), point("04"), point("07")]] }],
  };
}

test("BMKG UTC timestamps are explicit and the active slot is selected after sorting", () => {
  const result = parseBmkgForecast(fixture(), DEFAULT_BMKG_ADM4, now);
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.selected.validAt, "2026-10-20T07:00:00.000Z");
  assert.equal(result.selected.issuedAt, "2026-10-20T00:00:00.000Z");
  assert.equal(result.slots.length, 2);
  assert.equal(result.selected.windKmh, 0);
});

test("slot expiry is exclusive, and a nearest future slot is labelled with its own validity time", () => {
  const boundary = parseBmkgForecast(fixture(), DEFAULT_BMKG_ADM4, new Date("2026-10-20T10:00:00Z"));
  assert.equal(boundary.status, "ready");
  if (boundary.status === "ready") assert.equal(boundary.selected.validAt, "2026-10-20T10:00:00.000Z");
  const future = parseBmkgForecast(fixture(), DEFAULT_BMKG_ADM4, new Date("2026-10-20T03:00:00Z"));
  assert.equal(future.status, "ready");
  if (future.status === "ready") assert.equal(future.selected.validAt, "2026-10-20T04:00:00.000Z");
});

test("missing measurements remain null rather than becoming synthetic zero readings", () => {
  const input = fixture();
  const selected = input.data[0]?.cuaca[0]?.[2];
  assert.ok(selected); selected.t = null; selected.hu = null; selected.ws = null;
  const result = parseBmkgForecast(input, DEFAULT_BMKG_ADM4, now);
  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    assert.equal(result.selected.temperatureC, null);
    assert.equal(result.selected.humidityPercent, null);
    assert.equal(result.selected.windKmh, null);
  }
});

test("root and nested location IDs must match the selected village", () => {
  const root = fixture(); root.lokasi.adm4 = "32.73.19.1002";
  const nested = fixture(); const entry = nested.data[0]; assert.ok(entry); entry.lokasi.adm4 = "32.73.19.1002";
  for (const input of [root, nested]) assert.deepEqual(parseBmkgForecast(input, DEFAULT_BMKG_ADM4, now), { status: "unavailable", reason: "invalid-data" });
});

test("expired forecasts, stale issue times and future issue times are rejected", () => {
  assert.deepEqual(parseBmkgForecast(fixture(), DEFAULT_BMKG_ADM4, new Date("2026-10-22T07:00:00Z")), { status: "unavailable", reason: "stale" });
  const stale = fixture();
  for (const item of stale.data[0]?.cuaca[0] ?? []) item.analysis_date = "2026-10-19T00:00:00";
  assert.deepEqual(parseBmkgForecast(stale, DEFAULT_BMKG_ADM4, now), { status: "unavailable", reason: "stale" });
  const future = fixture();
  for (const item of future.data[0]?.cuaca[0] ?? []) { item.analysis_date = "2026-10-20T08:00:00"; item.utc_datetime = "2026-10-20 10:00:00"; }
  assert.deepEqual(parseBmkgForecast(future, DEFAULT_BMKG_ADM4, now), { status: "unavailable", reason: "stale" });
});

test("duplicate validity timestamps use the newest issue instead of duplicate UI rows", () => {
  const input = fixture(); const duplicate = { ...point("07"), analysis_date: "2026-10-20T01:00:00", t: 33 };
  input.data[0]?.cuaca[0]?.push(duplicate);
  const result = parseBmkgForecast(input, DEFAULT_BMKG_ADM4, now);
  assert.equal(result.status, "ready");
  if (result.status === "ready") { assert.equal(result.selected.temperatureC, 33); assert.equal(result.slots.length, 2); }
});

test("invalid shapes, humidity, timestamps, and empty forecasts never generate demo data", () => {
  const humidity = fixture(); const bad = humidity.data[0]?.cuaca[0]?.[0]; assert.ok(bad); bad.hu = 101;
  const timestamp = fixture(); const badDate = timestamp.data[0]?.cuaca[0]?.[0]; assert.ok(badDate); badDate.utc_datetime = "2026-02-30 10:00:00";
  const empty = fixture(); const entry = empty.data[0]; assert.ok(entry); entry.cuaca = [];
  for (const input of [{}, humidity, timestamp, empty]) {
    assert.deepEqual(parseBmkgForecast(input, DEFAULT_BMKG_ADM4, now), { status: "unavailable", reason: "invalid-data" });
  }
});

test("invalid area is rejected before any network request", async () => {
  let called = false;
  const fetcher: BmkgFetcher = async () => { called = true; throw new Error("unexpected request"); };
  assert.deepEqual(await getWeatherForecast("https://example.invalid", { fetcher }), { status: "unavailable", reason: "invalid-area" });
  assert.equal(called, false);
});

test("HTTP, JSON and timeout/network failures return explicit unavailable states", async () => {
  const cases: { fetcher: BmkgFetcher; reason: string }[] = [
    { fetcher: async () => new Response("", { status: 503 }), reason: "http" },
    { fetcher: async () => new Response("<html>not JSON</html>"), reason: "invalid-data" },
    { fetcher: async () => { throw new DOMException("timeout", "TimeoutError"); }, reason: "network" },
  ];
  for (const input of cases) assert.deepEqual(await getWeatherForecast(DEFAULT_BMKG_ADM4, { fetcher: input.fetcher, now }), { status: "unavailable", reason: input.reason });
});

test("provider request pins the official host, has a timeout and bounded cache", async () => {
  const fetcher: BmkgFetcher = async (url, options) => {
    assert.equal(url, "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=32.73.19.1001");
    assert.equal(options.next.revalidate, 600);
    assert.equal(options.redirect, "error");
    assert.ok(options.signal);
    return Response.json(fixture());
  };
  assert.equal((await getWeatherForecast(DEFAULT_BMKG_ADM4, { fetcher, now })).status, "ready");
});

test("flood heuristic rejects forecasts and missing daily rainfall instead of claiming AMAN", () => {
  for (const input of [
    { sourceKind: "forecast" as const, rainfallDailyMm: 35, humidityPercent: 88 },
    { sourceKind: "daily_observation" as const, rainfallDailyMm: null, humidityPercent: 88 },
    { sourceKind: "daily_observation" as const, rainfallDailyMm: NaN, humidityPercent: 88 },
    { sourceKind: "daily_observation" as const, rainfallDailyMm: -1, humidityPercent: 88 },
  ]) {
    const risk = calculateFloodRisk(input);
    assert.equal(risk.status, "unavailable"); assert.equal(risk.level, null); assert.equal(risk.score, null);
  }
  const daily = calculateFloodRisk({ sourceKind: "daily_observation", rainfallDailyMm: 35, humidityPercent: 88 });
  assert.equal(daily.method, "rule-based");
  assert.equal(daily.status, "available");
  if (daily.status === "available") assert.equal(daily.level, "WASPADA");
});
