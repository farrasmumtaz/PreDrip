import type { PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { hashToken } from "./tokens";

const WINDOW_MS = 15 * 60_000;

// SQLite counters are shared by workers; no untrusted forwarding header is used as an identity.
export async function consumeLimit(scope: string, identity: string, limit: number, client: PrismaClient = prisma): Promise<boolean> {
  const now = Date.now();
  const window = Math.floor(now / WINDOW_MS);
  const key = `${scope}:${hashToken(identity)}:${window}`;
  const expires = new Date((window + 1) * WINDOW_MS);
  await client.$executeRaw`DELETE FROM request_limits WHERE expires_at <= ${new Date(now)}`;
  const changed = await client.$executeRaw`
    INSERT INTO request_limits (key, count, expires_at) VALUES (${key}, 1, ${expires})
    ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < ${limit}`;
  return changed === 1;
}

export async function allowAuthRequest(scope: "register" | "login" | "forgot" | "reset", identity: string): Promise<boolean> {
  const perAccount = { register: 5, login: 10, forgot: 3, reset: 5 }[scope];
  return await consumeLimit(`${scope}:global`, "all", scope === "login" ? 300 : 100) &&
    await consumeLimit(scope, identity.trim().toLowerCase(), perAccount);
}
