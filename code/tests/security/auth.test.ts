import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { registerSchema, loginSchema, resetPasswordSchema } from "../../lib/auth/validators";
import { hashPassword, verifyPassword } from "../../lib/auth/password";
import { completePasswordReset } from "../../lib/auth/reset-password";
import { consumeLimit } from "../../lib/auth/rate-limit";

test("bcrypt passwords are bounded by bytes and valid credentials still work", async () => {
  const password = "Aa1" + "x".repeat(67) + "\u00e9A";
  assert.equal(password.length, 72);
  assert.equal(Buffer.byteLength(password), 73);
  assert.equal(registerSchema.safeParse({ name: "Test", email: "test@example.invalid", password }).success, false);
  assert.equal(loginSchema.safeParse({ email: "test@example.invalid", password }).success, false);
  assert.equal(resetPasswordSchema.safeParse({ token: "a".repeat(43), password }).success, false);
  const hash = await hashPassword("ValidPassword1");
  assert.equal(await verifyPassword("ValidPassword1", hash), true);
  assert.equal(await verifyPassword("WrongPassword1", hash), false);
});

test("reset is single-use, revokes sibling links and sessions; limits are shared", async () => {
  const directory = await mkdtemp(join(tmpdir(), "predrip-auth-"));
  const url = `file:${join(directory, "test.db")}`;
  const client = new PrismaClient({ datasourceUrl: url });
  const second = new PrismaClient({ datasourceUrl: url });
  try {
    for (const name of (await readdir("prisma/migrations")).filter((value) => /^\d/.test(value)).sort()) {
      const sql = await readFile(`prisma/migrations/${name}/migration.sql`, "utf8");
      for (const statement of sql.replace(/\/\*[\s\S]*?\*\//g, "").split(";").filter((part) => part.trim())) await client.$executeRawUnsafe(statement);
    }
    const user = await client.user.create({ data: { name: "Test", email: "test@example.invalid", passwordHash: "old" } });
    for (const tokenHash of ["token-a", "token-b"]) await client.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60_000) } });
    await client.passwordResetToken.create({ data: { userId: user.id, tokenHash: "expired", expiresAt: new Date(0) } });
    await client.session.create({ data: { userId: user.id, tokenHash: "session", expiresAt: new Date(Date.now() + 60_000) } });
    assert.equal(await completePasswordReset("expired", "bad", client), false);
    const attempts = await Promise.all([
      completePasswordReset("token-a", "first", client),
      completePasswordReset("token-a", "second", second),
    ]);
    assert.equal(attempts.filter(Boolean).length, 1);
    assert.equal(await completePasswordReset("token-b", "bad", client), false);
    assert.equal(await client.session.count(), 0);
    const updated = await client.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.ok(["first", "second"].includes(updated.passwordHash));
    const limits = await Promise.all(Array.from({ length: 12 }, (_, index) => consumeLimit("test", "same", 3, index % 2 ? client : second)));
    assert.equal(limits.filter(Boolean).length, 3);
    assert.equal(await consumeLimit("test", "different", 3, second), true);
    await client.$executeRaw`UPDATE request_limits SET expires_at = ${new Date(0)}`;
    assert.equal(await consumeLimit("test", "same", 3, client), true);
  } finally {
    await Promise.all([client.$disconnect(), second.$disconnect()]);
    await rm(directory, { recursive: true, force: true });
  }
});
