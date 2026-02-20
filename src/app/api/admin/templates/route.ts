import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function checkAdminToken(req: NextRequest): boolean {
  const token =
    req.headers.get("x-admin-token") ?? req.nextUrl.searchParams.get("token");
  return token === process.env.ADMIN_SECRET_TOKEN;
}

export async function GET(req: NextRequest) {
  if (!checkAdminToken(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const templates = await prisma.template.findMany({
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

export async function POST(req: NextRequest) {
  if (!checkAdminToken(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, industry, processSteps, errorItems, capexItems, opexItems, rolloutConfig } = body;

  if (!name) {
    return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
  }

  const template = await prisma.$transaction(async (tx) => {
    const tmpl = await tx.template.create({
      data: { name, description: description ?? "", industry: industry ?? "" },
    });

    if (processSteps?.length) {
      await tx.templateProcessStep.createMany({
        data: processSteps.map(
          (s: { type: string; order: number; name: string; employee: string; calendarDays?: number; executionShare?: number }) => ({
            templateId: tmpl.id,
            type: s.type,
            order: s.order,
            name: s.name,
            employee: s.employee,
            calendarDays: s.calendarDays,
            executionShare: s.executionShare,
          })
        ),
      });
    }

    if (errorItems?.length) {
      await tx.templateErrorItem.createMany({
        data: errorItems.map(
          (e: { type: string; order: number; name: string; processStep: string; frequency?: number }) => ({
            templateId: tmpl.id,
            type: e.type,
            order: e.order,
            name: e.name,
            processStep: e.processStep,
            frequency: e.frequency,
          })
        ),
      });
    }

    if (capexItems?.length) {
      await tx.templateCapexItem.createMany({
        data: capexItems.map((c: { order: number; name: string; comment?: string }) => ({
          templateId: tmpl.id,
          order: c.order,
          name: c.name,
          comment: c.comment,
        })),
      });
    }

    if (opexItems?.length) {
      await tx.templateOpexItem.createMany({
        data: opexItems.map((o: { order: number; name: string; comment?: string }) => ({
          templateId: tmpl.id,
          order: o.order,
          name: o.name,
          comment: o.comment,
        })),
      });
    }

    if (rolloutConfig) {
      await tx.templateRolloutConfig.create({
        data: {
          templateId: tmpl.id,
          model: rolloutConfig.model ?? "LINEAR",
          rolloutMonths: rolloutConfig.rolloutMonths,
          targetShare: rolloutConfig.targetShare,
        },
      });
    }

    return tmpl;
  });

  return NextResponse.json({ data: template }, { status: 201 });
}
