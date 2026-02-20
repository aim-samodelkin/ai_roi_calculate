import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const templates = await prisma.template.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    include: {
      processSteps: { orderBy: { order: "asc" } },
      errorItems: { orderBy: { order: "asc" } },
      capexItems: { orderBy: { order: "asc" } },
      opexItems: { orderBy: { order: "asc" } },
      rolloutConfig: true,
    },
  });

  return NextResponse.json({ data: templates });
}
