import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  const showAll = req.nextUrl.searchParams.get("all") === "1" && user?.role === "ADMIN";

  const templates = await prisma.calculation.findMany({
    where: {
      isTemplate: true,
      ...(showAll ? {} : { isPublished: true }),
    },
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
