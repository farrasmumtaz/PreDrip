import type { PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";

export async function completePasswordReset(tokenHash: string, passwordHash: string, client: PrismaClient = prisma): Promise<boolean> {
  const token = await client.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!token) return false;
  return client.$transaction(async (transaction) => {
    const now = new Date();
    const claimed = await transaction.passwordResetToken.updateMany({
      where: { id: token.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now },
    });
    if (claimed.count !== 1) return false;
    await transaction.user.update({ where: { id: token.userId }, data: { passwordHash } });
    await transaction.passwordResetToken.updateMany({ where: { userId: token.userId, usedAt: null }, data: { usedAt: now } });
    await transaction.session.deleteMany({ where: { userId: token.userId } });
    return true;
  });
}
