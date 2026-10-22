import assert from "node:assert/strict";
import { test } from "node:test";

const base = new URL(process.env.PREDRIP_TEST_BASE_URL ?? "http://127.0.0.1:3011");
if (base.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) || base.username || base.password) throw new Error("Pengujian aset hanya untuk server HTTP lokal.");

test("auth pages serve their actual CSS and JavaScript assets", async () => {
  for (const route of ["/login", "/register", "/forgot-password"]) {
    const page = await fetch(new URL(route, base));
    assert.equal(page.status, 200, route);
    const html = await page.text();
    const paths = [...new Set([...html.matchAll(/(?:href|src)="(\/_next\/[^"\s]+\.(?:css|js)(?:\?[^"\s]*)?)"/g)].map((match) => match[1]!.replace(/&amp;/g, "&")))];
    assert.ok(paths.some((path) => /\.css(?:\?|$)/.test(path)), `${route}: stylesheet harus tersedia`);
    assert.ok(paths.some((path) => /\.js(?:\?|$)/.test(path)), `${route}: JavaScript harus tersedia`);
    for (const path of paths) {
      const response = await fetch(new URL(path, base));
      assert.equal(response.status, 200, `${route}: ${path}`);
      assert.match(response.headers.get("content-type") ?? "", /\.css(?:\?|$)/.test(path) ? /text\/css/ : /(?:javascript|ecmascript)/, path);
      assert.ok((await response.text()).length > 0, path);
    }
  }
});
