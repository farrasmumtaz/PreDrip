import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { locationSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = locationSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Koordinat tidak valid." }, { status: 400 });
    const { latitude, longitude } = parsed.data;

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        homeLatitude: latitude,
        homeLongitude: longitude,
      },
    });

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}
