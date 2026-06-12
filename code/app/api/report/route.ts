import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const body = await request.json();

    const {
      latitude,
      longitude,
      waterLevel,
      description,
    } = body;

    const report =
      await prisma.citizenReport.create({
        data: {
          userId: user.id,
          latitude,
          longitude,
          waterLevel,
          description,
        },
      });

    return NextResponse.json(
      {
        success: true,
        report,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      {
        status: 500,
      },
    );
  }
}