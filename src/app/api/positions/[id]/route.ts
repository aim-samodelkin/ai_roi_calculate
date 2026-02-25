import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const { id } = await params;

  const position = await prisma.position.findUnique({ where: { id } });
  if (!position || position.userId !== user.id) {
    return NextResponse.json({ error: "Должность не найдена" }, { status: 404 });
  }

  await prisma.position.delete({ where: { id } });

  return NextResponse.json({ data: { success: true } });
}
