import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const template = await prisma.template.findUnique({
    where: { id },
    include: {
      processSteps: { orderBy: { order: "asc" } },
      errorItems: { orderBy: { order: "asc" } },
      capexItems: { orderBy: { order: "asc" } },
      opexItems: { orderBy: { order: "asc" } },
      rolloutConfig: true,
    },
  });

  if (!template) {
    return NextResponse.json({ error: "Шаблон не найден" }, { status: 404 });
  }

  return NextResponse.json({ data: template });
}
