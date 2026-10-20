import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";

const base = new URL(process.env.PREDRIP_TEST_BASE_URL ?? "http://127.0.0.1:3000");
if (base.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) || base.username || base.password) {
  throw new Error("Verifikasi web hanya boleh berjalan terhadap server HTTP lokal.");
}

test("dataset page protects direct access and renders real audited data with server-side year filtering", async (context) => {
  const prisma = new PrismaClient();
  const userId = randomUUID();
  let createdUser = false;
  try {
    await context.test("unauthenticated direct route redirects to login", async () => {
      const response = await fetch(new URL("/dataset", base), { redirect: "manual" });
      assert.equal(response.status, 307);
      assert.equal(new URL(response.headers.get("location") ?? "", base).pathname, "/login");
    });
    await prisma.user.create({ data: {
      id: userId, name: "Dataset route verification", email: `dataset-test-${userId}@example.invalid`,
      passwordHash: createHash("sha256").update(randomBytes(32)).digest("hex"),
    } });
    createdUser = true;
    const token = randomBytes(32).toString("hex");
    await prisma.session.create({ data: {
      userId, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 300_000),
    } });
    const headers = { cookie: `${process.env.AUTH_COOKIE_NAME ?? "predrip_session"}=${token}` };
    for (const [query, expectedYear] of [["year=2024", "2024"], ["year=2015", "2015"], ["year=invalid", "2025"]]) {
      await context.test(`authenticated ${query}: correct data and chart year ${expectedYear}`, async () => {
        const response = await fetch(new URL(`/dataset?${query}`, base), { headers, redirect: "manual" });
        assert.equal(response.status, 200);
        const html = (await response.text()).replace(/<!--[\s\S]*?-->/g, "");
        assert.match(html, /Fondasi sebelum prediksi\./);
        assert.match(html, /4\.018/);
        assert.match(html, /4\.016/);
        assert.match(html, /Belum siap untuk training/);
        const chartTitle = html.match(/<title id="rainfall-title">([\s\S]*?)<\/title>/)?.[1] ?? "";
        assert.equal(chartTitle, `Curah hujan bulanan Kota Bandung tahun ${expectedYear}`, html.match(/<svg\b[^>]*>[\s\S]{0,500}/)?.[0] ?? "SVG tidak ditemukan");
        assert.match(html, /bey-machmudin-tinjau-banjir-bandang-braga-12039/);
        assert.match(html, /perkembangan-situasi-dan-penanganan-bencana-tanggal-17-maret-2025/);
      });
    }
  } finally {
    // The verification never posts reports or opens the dashboard; only its own user/session are created.
    if (createdUser) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
