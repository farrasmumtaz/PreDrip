import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { reportSchema } from "@/lib/validation";
import { consumeLimit } from "@/lib/auth/rate-limit";

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

    const body: unknown = await request.json().catch(() => null);
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Laporan tidak valid. Periksa koordinat, tinggi air 0–2000 cm, dan deskripsi 1–2000 karakter." }, { status: 400 });
    if (!await consumeLimit("report", user.id, 20)) return NextResponse.json({ error: "Terlalu banyak laporan. Coba lagi dalam 15 menit." }, { status: 429, headers: { "Retry-After": "900" } });
    const { latitude, longitude, waterLevel, description } = parsed.data;

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
