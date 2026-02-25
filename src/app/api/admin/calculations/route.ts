import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  const sp = req.nextUrl.searchParams;
  const pageRaw = Number(sp.get("page") ?? "1");
  const sizeRaw = Number(sp.get("pageSize") ?? "20");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSize = Number.isFinite(sizeRaw) && sizeRaw > 0 ? Math.min(Math.floor(sizeRaw), 100) : 20;

  const where = {
    isTemplate: false,
    OR: [
      { userId: null },
      { userId: { not: admin.id } },
    ],
  };

  const total = await prisma.calculation.count({ where });

  const calculations = await prisma.calculation.findMany({
    where: {
      ...where,
    },
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      user: {
        select: { email: true },
      },
    },
  });

  const data = calculations.map((c) => ({
    id: c.id,
    name: c.name,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    userId: c.userId,
    userEmail: c.user?.email ?? null,
  }));

  return NextResponse.json({ data, page, pageSize, total });
}
