import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

function checkAdminToken(req: NextRequest): boolean {
  const token =
    req.headers.get("x-admin-token") ?? req.nextUrl.searchParams.get("token");
  return token === process.env.ADMIN_SECRET_TOKEN;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  if (!checkAdminToken(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

export async function PUT(req: NextRequest, { params }: RouteParams) {
  if (!checkAdminToken(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, description, industry, isPublished, processSteps, errorItems, capexItems, opexItems, rolloutConfig } = body;

  await prisma.$transaction(async (tx) => {
    await tx.template.update({
      where: { id },
      data: {
        name: name ?? undefined,
        description: description ?? undefined,
        industry: industry ?? undefined,
        isPublished: isPublished ?? undefined,
      },
    });

    if (processSteps !== undefined) {
      await tx.templateProcessStep.deleteMany({ where: { templateId: id } });
      if (processSteps.length > 0) {
        await tx.templateProcessStep.createMany({
          data: processSteps.map(
            (s: { type: string; order: number; name: string; employee: string; timeHours?: number; calendarDays?: number; executionShare?: number }) => ({
              templateId: id,
              type: s.type,
              order: s.order,
              name: s.name,
              employee: s.employee,
              timeHours: s.timeHours,
              calendarDays: s.calendarDays,
              executionShare: s.executionShare,
            })
          ),
        });
      }
    }

    if (errorItems !== undefined) {
      await tx.templateErrorItem.deleteMany({ where: { templateId: id } });
      if (errorItems.length > 0) {
        await tx.templateErrorItem.createMany({
          data: errorItems.map(
            (e: { type: string; order: number; name: string; processStep: string; frequency?: number }) => ({
              templateId: id,
              type: e.type,
              order: e.order,
              name: e.name,
              processStep: e.processStep,
              frequency: e.frequency,
            })
          ),
        });
      }
    }

    if (capexItems !== undefined) {
      await tx.templateCapexItem.deleteMany({ where: { templateId: id } });
      if (capexItems.length > 0) {
        await tx.templateCapexItem.createMany({
          data: capexItems.map((c: { order: number; name: string; comment?: string }) => ({
            templateId: id,
            order: c.order,
            name: c.name,
            comment: c.comment,
          })),
        });
      }
    }

    if (opexItems !== undefined) {
      await tx.templateOpexItem.deleteMany({ where: { templateId: id } });
      if (opexItems.length > 0) {
        await tx.templateOpexItem.createMany({
          data: opexItems.map((o: { order: number; name: string; comment?: string }) => ({
            templateId: id,
            order: o.order,
            name: o.name,
            comment: o.comment,
          })),
        });
      }
    }

    if (rolloutConfig !== undefined) {
      await tx.templateRolloutConfig.upsert({
        where: { templateId: id },
        create: {
          templateId: id,
          model: rolloutConfig.model ?? "LINEAR",
          rolloutMonths: rolloutConfig.rolloutMonths,
          targetShare: rolloutConfig.targetShare,
        },
        update: {
          model: rolloutConfig.model ?? undefined,
          rolloutMonths: rolloutConfig.rolloutMonths ?? undefined,
          targetShare: rolloutConfig.targetShare ?? undefined,
        },
      });
    }
  });

  const updated = await prisma.template.findUnique({
    where: { id },
    include: {
      processSteps: { orderBy: { order: "asc" } },
      errorItems: { orderBy: { order: "asc" } },
      capexItems: { orderBy: { order: "asc" } },
      opexItems: { orderBy: { order: "asc" } },
      rolloutConfig: true,
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  if (!checkAdminToken(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.template.delete({ where: { id } });
  return NextResponse.json({ data: { success: true } });
}
