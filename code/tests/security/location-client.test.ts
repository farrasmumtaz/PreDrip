import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";

test("GPS refreshes only after a successful changed-location save and reports errors", async () => {
  const source = await readFile("app/components/dashboard/LocationTracker.tsx", "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  for (const scenario of ["changed", "unchanged", "failed", "denied"] as const) {
    let locate: ((position: { coords: { latitude: number; longitude: number } }) => Promise<void>) | undefined;
    let denied: (() => void) | undefined;
    const states: string[] = [];
    let refreshes = 0;
    let saves = 0;
    const moduleExports: { default?: (props: { latitude: number | null; longitude: number | null }) => unknown } = {};
    runInNewContext(compiled, {
      exports: moduleExports,
      require: (name: string): unknown => {
        if (name === "react") return { useState: () => ["", (value: string) => states.push(value)], useEffect: (effect: () => unknown) => effect() };
        if (name === "next/navigation") return { useRouter: () => ({ refresh: () => { refreshes += 1; } }) };
        if (name === "react/jsx-runtime") return { jsx: () => null };
        throw new Error(`Unexpected import: ${name}`);
      },
      navigator: { geolocation: { getCurrentPosition: (success: typeof locate, error: typeof denied) => { locate = success; denied = error; } } },
      fetch: async () => { saves += 1; return { ok: scenario !== "failed" }; },
    });
    assert.ok(moduleExports.default);
    moduleExports.default({ latitude: scenario === "unchanged" ? -6.9 : null, longitude: scenario === "unchanged" ? 107.6 : null });
    if (scenario === "denied") { assert.ok(denied); denied(); }
    else { assert.ok(locate); await locate({ coords: { latitude: -6.9, longitude: 107.6 } }); }
    assert.equal(refreshes, scenario === "changed" ? 1 : 0, scenario);
    assert.equal(saves, scenario === "changed" || scenario === "failed" ? 1 : 0, scenario);
    assert.ok(states.length > 0);
    if (scenario === "failed") assert.match(states.join(" "), /belum dapat disimpan/);
    if (scenario === "denied") assert.match(states.join(" "), /izin ditolak/);
  }
});
