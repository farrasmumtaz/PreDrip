import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { createPlainToken, hashToken } from "../../lib/auth/tokens";

test("real server actions and API writes use only an isolated temporary database", { timeout: 120_000 }, async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "predrip-http-"));
  const databaseUrl = `file:${join(directory, "test.db")}`;
  const client = new PrismaClient({ datasourceUrl: databaseUrl });
  let server: ReturnType<typeof spawn> | undefined;
  try {
    for (const name of (await readdir("prisma/migrations")).filter((value) => /^\d/.test(value)).sort()) {
      const sql = await readFile(`prisma/migrations/${name}/migration.sql`, "utf8");
      for (const statement of sql.replace(/\/\*[\s\S]*?\*\//g, "").split(";").filter((part) => part.trim())) await client.$executeRawUnsafe(statement);
    }
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "0"], {
      cwd: process.cwd(), env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
    });
    const child = server;
    const base = await new Promise<string>((resolve, reject) => {
      let output = "";
      const timeout = setTimeout(() => reject(new Error("Test server startup timed out")), 30_000);
      child.on("error", (error) => { clearTimeout(timeout); reject(error); });
      child.on("exit", (code) => { clearTimeout(timeout); reject(new Error(`Test server exited: ${code}`)); });
      child.stdout?.on("data", (chunk: Buffer) => {
        output += chunk.toString();
        const address = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
        if (address && /Ready in/.test(output)) { clearTimeout(timeout); resolve(address); }
      });
    });
    async function submit(path: string, values: Record<string, string>, cookie = ""): Promise<Response> {
      const page = await fetch(base + path, { headers: { cookie }, redirect: "manual" });
      const html = await page.text();
      const action = html.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];
      assert.ok(action, `Server action missing on ${path}`);
      const body = new FormData();
      body.set(action, "");
      for (const [key, value] of Object.entries(values)) body.set(key, value);
      return fetch(base + path, { method: "POST", headers: { cookie, origin: base }, body, redirect: "manual" });
    }
    const email = "http-test@example.invalid";
    let cookie = "";
    await context.test("register and login create real sessions; invalid login fails", async () => {
      assert.equal((await fetch(base + "/dashboard", { redirect: "manual" })).status, 307);
      const registration = await submit("/register", { name: "HTTP verification", email, password: "ValidPassword1", homeAddress: "Bandung" });
      assert.equal(registration.status, 303);
      assert.equal(registration.headers.get("location"), "/dashboard");
      const user = await client.user.findUniqueOrThrow({ where: { email } });
      assert.equal(user.role, "USER");
      const wrong = await submit("/login", { email, password: "WrongPassword1" });
      assert.match(decodeURIComponent(wrong.headers.get("location") ?? ""), /Email atau password salah/);
      const login = await submit("/login", { email, password: "ValidPassword1" });
      assert.equal(login.headers.get("location"), "/dashboard");
      cookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
      assert.ok(cookie);
    });
    await context.test("API auth, invalid JSON, ranges and valid ownership", async () => {
      async function post(path: string, body: string, authenticated = true): Promise<Response> {
        return fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", cookie: authenticated ? cookie : "" }, body });
      }
      assert.equal((await post("/api/report", "{}", false)).status, 401);
      assert.equal((await post("/api/location", "{}", false)).status, 401);
      assert.equal((await post("/api/location", "not-json")).status, 400);
      assert.equal((await post("/api/location", JSON.stringify({ latitude: 999, longitude: 107 }))).status, 400);
      const valid = { latitude: -6.9, longitude: 107.6, waterLevel: 0, description: "Air mulai menggenang" };
      assert.equal((await post("/api/report", JSON.stringify({ ...valid, waterLevel: -1 }))).status, 400);
      assert.equal(await client.citizenReport.count(), 0);
      assert.equal((await post("/api/report", JSON.stringify(valid))).status, 201);
      assert.equal((await post("/api/location", JSON.stringify({ latitude: -6.9, longitude: 107.6 }))).status, 200);
      const user = await client.user.findUniqueOrThrow({ where: { email } });
      const report = await client.citizenReport.findFirstOrThrow();
      assert.equal(report.userId, user.id);
      assert.equal(report.waterLevel, 0);
      assert.equal(user.homeLatitude, -6.9);
    });
    await context.test("password correction preserves token; reset revokes old sessions and links", async () => {
      const user = await client.user.findUniqueOrThrow({ where: { email } });
      const token = createPlainToken();
      const sibling = createPlainToken();
      for (const value of [token, sibling]) await client.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(value), expiresAt: new Date(Date.now() + 60_000) } });
      const path = `/reset-password?token=${token}`;
      const invalid = await submit(path, { token, password: "short" });
      const returned = new URL(invalid.headers.get("location") ?? "", base);
      assert.equal(returned.searchParams.get("token"), token);
      assert.ok(returned.searchParams.get("error"));
      const reset = await submit(path, { token, password: "NewPassword2" });
      assert.equal(new URL(reset.headers.get("location") ?? "", base).pathname, "/login");
      assert.equal(await client.session.count(), 0);
      const reuse = await submit(`/reset-password?token=${sibling}`, { token: sibling, password: "WrongPassword3" });
      assert.match(decodeURIComponent(reuse.headers.get("location") ?? ""), /Token reset tidak valid/);
      const oldLogin = await submit("/login", { email, password: "ValidPassword1" });
      assert.match(decodeURIComponent(oldLogin.headers.get("location") ?? ""), /Email atau password salah/);
      const newLogin = await submit("/login", { email, password: "NewPassword2" });
      assert.equal(newLogin.headers.get("location"), "/dashboard");
      cookie = newLogin.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    });
    await context.test("logout revokes the active session", async () => {
      const response = await submit("/dashboard?adm4=invalid", {}, cookie);
      assert.equal(response.headers.get("location"), "/login");
      assert.equal(await client.session.count(), 0);
      assert.equal((await fetch(base + "/dashboard", { headers: { cookie }, redirect: "manual" })).status, 307);
    });
    await context.test("production recovery is uniform, creates no tokens, and login is rate limited", async () => {
      const before = await client.passwordResetToken.count();
      const known = await submit("/forgot-password", { email });
      const unknown = await submit("/forgot-password", { email: "unknown@example.invalid" });
      assert.equal(known.headers.get("location"), unknown.headers.get("location"));
      assert.equal(await client.passwordResetToken.count(), before);
      let response: Response | undefined;
      for (let count = 0; count < 11; count += 1) response = await submit("/login", { email: "limited@example.invalid", password: "WrongPassword1" });
      assert.match(decodeURIComponent(response?.headers.get("location") ?? ""), /Terlalu banyak permintaan/);
    });
  } finally {
    if (server && server.exitCode === null) { const exited = once(server, "exit"); server.kill(); await exited; }
    await client.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});
