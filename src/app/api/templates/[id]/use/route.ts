import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

/** Creates a new Calculation from a Template, mapping fields as per DATA_MODEL spec. */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const { id: templateId } = await params;

  const template = await prisma.template.findUnique({
    where: { id: templateId },
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

  const calculation = await prisma.$transaction(async (tx) => {
    const calc = await tx.calculation.create({
      data: {
        name: `${template.name} (копия)`,
        templateId: template.id,
      },
    });

    if (template.processSteps.length > 0) {
      await tx.processStep.createMany({
        data: template.processSteps.map((s) => ({
          calculationId: calc.id,
          type: s.type,
          order: s.order,
          name: s.name,
          employee: s.employee,
          hourlyRate: 0,
          timeHours: s.timeHours ?? 0,
          timeUnit: s.timeUnit ?? "hours",
          calendarDays: s.calendarDays ?? 0,
          executionShare: s.executionShare ?? 1,
        })),
      });
    }

    if (template.errorItems.length > 0) {
      await tx.errorItem.createMany({
        data: template.errorItems.map((e) => ({
          calculationId: calc.id,
          type: e.type,
          order: e.order,
          name: e.name,
          processStep: e.processStep,
          frequency: e.frequency ?? 0,
          fixCost: 0,
          fixTimeHours: 0,
        })),
      });
    }

    if (template.capexItems.length > 0) {
      await tx.capexItem.createMany({
        data: template.capexItems.map((c) => ({
          calculationId: calc.id,
          order: c.order,
          name: c.name,
          amount: 0,
          comment: c.comment,
        })),
      });
    }

    if (template.opexItems.length > 0) {
      await tx.opexItem.createMany({
        data: template.opexItems.map((o) => ({
          calculationId: calc.id,
          order: o.order,
          name: o.name,
          monthlyAmount: 0,
          comment: o.comment,
        })),
      });
    }

    await tx.rolloutConfig.create({
      data: {
        calculationId: calc.id,
        model: template.rolloutConfig?.model ?? "LINEAR",
        rolloutMonths: template.rolloutConfig?.rolloutMonths ?? 6,
        targetShare: template.rolloutConfig?.targetShare ?? 1,
        operationsPerMonth: 0,
      },
    });

    return calc;
  });

  return NextResponse.redirect(
    new URL(`/${calculation.id}`, process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"),
    { status: 303 }
  );
}
