import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const calculation = await prisma.calculation.findUnique({
    where: { id },
    include: {
      processSteps: { orderBy: { order: "asc" } },
      errorItems: { orderBy: { order: "asc" } },
      capexItems: { orderBy: { order: "asc" } },
      opexItems: { orderBy: { order: "asc" } },
      rolloutConfig: true,
    },
  });

  if (!calculation) {
    return NextResponse.json({ error: "Расчёт не найден" }, { status: 404 });
  }

  return NextResponse.json({ data: calculation });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await req.json();

  try {
    const { name, processSteps, errorItems, capexItems, opexItems, rolloutConfig } = body;

    await prisma.$transaction(async (tx) => {
      // Update calculation name
      await tx.calculation.update({
        where: { id },
        data: { name: name ?? undefined },
      });

      // Replace process steps
      if (processSteps !== undefined) {
        await tx.processStep.deleteMany({ where: { calculationId: id } });
        if (processSteps.length > 0) {
          await tx.processStep.createMany({
            data: processSteps.map(
              (s: {
                type: string;
                order: number;
                name: string;
                employee: string;
                hourlyRate: number;
                timeHours: number;
                timeUnit: string;
                calendarDays: number;
                executionShare: number;
                extraCost: number;
              }) => ({
                calculationId: id,
                type: s.type,
                order: s.order,
                name: s.name,
                employee: s.employee,
                hourlyRate: s.hourlyRate,
                timeHours: s.timeHours,
                timeUnit: s.timeUnit ?? "hours",
                calendarDays: s.calendarDays,
                executionShare: s.executionShare,
                extraCost: s.extraCost ?? 0,
              })
            ),
          });
        }
      }

      // Replace error items
      if (errorItems !== undefined) {
        await tx.errorItem.deleteMany({ where: { calculationId: id } });
        if (errorItems.length > 0) {
          await tx.errorItem.createMany({
            data: errorItems.map(
              (e: {
                type: string;
                order: number;
                name: string;
                processStep: string;
                frequency: number;
                fixCost: number;
                fixTimeHours: number;
              }) => ({
                calculationId: id,
                type: e.type,
                order: e.order,
                name: e.name,
                processStep: e.processStep,
                frequency: e.frequency,
                fixCost: e.fixCost,
                fixTimeHours: e.fixTimeHours,
              })
            ),
          });
        }
      }

      // Replace CAPEX items
      if (capexItems !== undefined) {
        await tx.capexItem.deleteMany({ where: { calculationId: id } });
        if (capexItems.length > 0) {
          await tx.capexItem.createMany({
            data: capexItems.map(
              (c: { order: number; name: string; amount: number; comment?: string }) => ({
                calculationId: id,
                order: c.order,
                name: c.name,
                amount: c.amount,
                comment: c.comment ?? null,
              })
            ),
          });
        }
      }

      // Replace OPEX items
      if (opexItems !== undefined) {
        await tx.opexItem.deleteMany({ where: { calculationId: id } });
        if (opexItems.length > 0) {
          await tx.opexItem.createMany({
            data: opexItems.map(
              (o: { order: number; name: string; monthlyAmount: number; comment?: string }) => ({
                calculationId: id,
                order: o.order,
                name: o.name,
                monthlyAmount: o.monthlyAmount,
                comment: o.comment ?? null,
              })
            ),
          });
        }
      }

      // Upsert rollout config
      if (rolloutConfig !== undefined) {
        await tx.rolloutConfig.upsert({
          where: { calculationId: id },
          create: {
            calculationId: id,
            model: rolloutConfig.model,
            rolloutMonths: rolloutConfig.rolloutMonths,
            targetShare: rolloutConfig.targetShare,
            operationsPerMonth: rolloutConfig.operationsPerMonth,
          },
          update: {
            model: rolloutConfig.model,
            rolloutMonths: rolloutConfig.rolloutMonths,
            targetShare: rolloutConfig.targetShare,
            operationsPerMonth: rolloutConfig.operationsPerMonth,
          },
        });
      }
    });

    const updated = await prisma.calculation.findUnique({
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
  } catch (error) {
    console.error("Failed to update calculation:", error);
    return NextResponse.json({ error: "Ошибка при обновлении расчёта" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    await prisma.calculation.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: "Расчёт не найден" }, { status: 404 });
  }
}
