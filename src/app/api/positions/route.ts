import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const positions = await prisma.position.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ data: positions });
}

export async function PUT(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const body = await req.json();
  const { positions } = body as {
    positions: { name: string; hourlyRate: number; order: number }[];
  };

  if (!Array.isArray(positions)) {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.position.deleteMany({ where: { userId: user.id } });
    if (positions.length > 0) {
      await tx.position.createMany({
        data: positions.map((p) => ({
          userId: user.id,
          name: p.name,
          hourlyRate: p.hourlyRate ?? 0,
          order: p.order,
        })),
      });
    }
  });

  const updated = await prisma.position.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ data: updated });
}
