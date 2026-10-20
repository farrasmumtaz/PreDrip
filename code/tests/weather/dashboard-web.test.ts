import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";

const base = new URL(process.env.PREDRIP_TEST_BASE_URL ?? "http://127.0.0.1:3000");
if (base.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) || base.username || base.password) {
  throw new Error("Verifikasi dashboard hanya boleh terhadap server HTTP lokal.");
}

test("BMKG dashboard: auth, live village selection, neutral risk, invalid area, and read-only weather rendering", async (context) => {
  const prisma = new PrismaClient();
  const userId = randomUUID();
  let createdUser = false;
  try {
    await context.test("direct unauthenticated access redirects to login", async () => {
      const response = await fetch(new URL("/dashboard", base), { redirect: "manual" });
      assert.equal(response.status, 307);
      assert.equal(new URL(response.headers.get("location") ?? "", base).pathname, "/login");
    });
    await prisma.user.create({ data: {
      id: userId, name: "Weather route verification", email: `weather-test-${userId}@example.invalid`,
      passwordHash: createHash("sha256").update(randomBytes(32)).digest("hex"),
    } });
    createdUser = true;
    const token = randomBytes(32).toString("hex");
    await prisma.session.create({ data: { userId, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 300_000) } });
    const headers = { cookie: `${process.env.AUTH_COOKIE_NAME ?? "predrip_session"}=${token}` };
    const countBefore = await prisma.weatherSnapshot.count();

    for (const [query, village, adm4] of [["", "Braga", "32.73.19.1001"], ["?adm4=32.73.19.1002", "Merdeka", "32.73.19.1002"]]) {
      await context.test(`live forecast for ${village} preserves source and risk limitations`, async () => {
        const response = await fetch(new URL(`/dashboard${query}`, base), { headers, redirect: "manual" });
        assert.equal(response.status, 200);
        const html = (await response.text()).replace(/<!--[\s\S]*?-->/g, "");
        assert.ok(html.includes(`${village}, Sumur Bandung, Kota Bandung`), "Prakiraan live BMKG belum dapat ditampilkan; periksa koneksi atau status penyedia.");
        assert.match(html, /Diproduksi BMKG:/);
        assert.ok(html.includes(`https://www.bmkg.go.id/cuaca/prakiraan-cuaca/${adm4}`));
        assert.match(html, /Indikator risiko banjir: belum dinilai/);
        assert.match(html, /Metode: aturan manual/);
        assert.match(html, /Skor bukan probabilitas banjir/);
        assert.match(html, /Dataset &amp; Audit/);
        assert.doesNotMatch(html, />Riwayat Cuaca</);
      });
    }
    await context.test("invalid village does not silently fall back to another location", async () => {
      const response = await fetch(new URL("/dashboard?adm4=invalid", base), { headers });
      const html = (await response.text()).replace(/<!--[\s\S]*?-->/g, "");
      assert.equal(response.status, 200);
      assert.match(html, /Wilayah prakiraan belum didukung/);
      assert.match(html, /Indikator risiko banjir: belum dinilai/);
    });
    await context.test("viewing forecasts does not insert observation snapshots", async () => {
      assert.equal(await prisma.weatherSnapshot.count(), countBefore);
    });
  } finally {
    if (createdUser) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
