import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/** Creates a new Calculation from a Template (which is itself a Calculation with isTemplate=true). */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: templateId } = await params;
  const user = await getUserFromRequest(req);

  const template = await prisma.calculation.findUnique({
    where: { id: templateId, isTemplate: true },
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
        userId: user?.id ?? null,
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
          hourlyRate: s.hourlyRate,
          timeHours: s.timeHours,
          timeUnit: s.timeUnit,
          calendarDays: s.calendarDays,
          executionShare: s.executionShare,
          extraCost: s.extraCost,
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
          frequency: e.frequency,
          fixCost: e.fixCost,
          fixTimeHours: e.fixTimeHours,
        })),
      });
    }

    if (template.capexItems.length > 0) {
      await tx.capexItem.createMany({
        data: template.capexItems.map((c) => ({
          calculationId: calc.id,
          order: c.order,
          name: c.name,
          amount: c.amount,
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
          monthlyAmount: o.monthlyAmount,
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
        operationsPerMonth: template.rolloutConfig?.operationsPerMonth ?? 100,
        growthEnabled: template.rolloutConfig?.growthEnabled ?? false,
        growthType: template.rolloutConfig?.growthType ?? "COMPOUND",
        growthRate: template.rolloutConfig?.growthRate ?? 0,
        growthCeiling: template.rolloutConfig?.growthCeiling ?? null,
      },
    });

    return calc;
  });

  return NextResponse.redirect(
    new URL(`/${calculation.id}`, process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"),
    { status: 303 }
  );
}
