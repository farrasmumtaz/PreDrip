import { cookies } from "next/headers";
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { addDays, createPlainToken, hashToken } from "@/lib/auth/tokens";

export const SESSION_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME ?? "predrip_session";

const SESSION_TTL_DAYS = 30;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";

  homeLatitude: number | null;
  homeLongitude: number | null;
}

export async function createSession(userId: string): Promise<void> {
  const token = createPlainToken();
  const tokenHash = hashToken(token);
  const expiresAt = addDays(new Date(), SESSION_TTL_DAYS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hashToken(token),
      },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashToken(token),
    },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          homeLatitude: true,
          homeLongitude: true,
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.user;
});
