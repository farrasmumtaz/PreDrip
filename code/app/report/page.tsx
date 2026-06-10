"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function createReport(
  waterLevel: number,
  description: string,
) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  await prisma.citizenReport.create({
    data: {
      userId: user.id,

      latitude: user.homeLatitude!,
      longitude: user.homeLongitude!,

      waterLevel,
      description,
    },
  });
}