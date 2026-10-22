import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

test("upgrade preserves an existing user, location, sessions and reset tokens", async () => {
  const directory = await mkdtemp(join(tmpdir(), "predrip-migration-"));
  const client = new PrismaClient({ datasourceUrl: `file:${join(directory, "test.db")}` });
  async function migrate(name: string): Promise<void> {
    const sql = await readFile(`prisma/migrations/${name}/migration.sql`, "utf8");
    for (const statement of sql.replace(/\/\*[\s\S]*?\*\//g, "").split(";").filter((part) => part.trim())) {
      await client.$executeRawUnsafe(statement);
    }
  }
  try {
    await migrate("20260607165245_init");
    await client.$executeRaw`INSERT INTO users (id,name,email,password_hash,home_address,home_latitude,home_longitude,created_at,updated_at) VALUES ('u','Audit','audit@example.invalid','preserved-hash','Bandung',-6.9,107.6,1000,2000)`;
    await client.$executeRaw`INSERT INTO sessions (id,user_id,token_hash,expires_at) VALUES ('s','u','session',9999999999999)`;
    await client.$executeRaw`INSERT INTO password_reset_tokens (id,user_id,token_hash,expires_at) VALUES ('r','u','reset',9999999999999)`;
    await migrate("20260609032022_user_updates");
    const user = await client.user.findUniqueOrThrow({ where: { id: "u" } });
    assert.equal(user.passwordHash, "preserved-hash");
    assert.equal(user.homeAddress, "Bandung");
    assert.equal(user.homeLatitude, -6.9);
    assert.equal(user.homeLongitude, 107.6);
    assert.equal(user.createdAt.getTime(), 1000);
    assert.equal(user.updatedAt.getTime(), 2000);
    assert.equal(await client.session.count(), 1);
    assert.equal(await client.passwordResetToken.count(), 1);
    assert.deepEqual(await client.$queryRawUnsafe("PRAGMA foreign_key_check"), []);
  } finally {
    await client.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});
