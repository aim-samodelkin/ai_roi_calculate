import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return err instanceof Response ? err : NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  try {
    const { calculationId, name, description, industry, replaceTemplateId } = await req.json();

    if (!calculationId || !name) {
      return NextResponse.json({ error: "calculationId и name обязательны" }, { status: 400 });
    }

    const source = await prisma.calculation.findUnique({
      where: { id: calculationId },
      include: {
        processSteps: { orderBy: { order: "asc" } },
        errorItems: { orderBy: { order: "asc" } },
        capexItems: { orderBy: { order: "asc" } },
        opexItems: { orderBy: { order: "asc" } },
        rolloutConfig: true,
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Расчёт не найден" }, { status: 404 });
    }

    const template = await prisma.$transaction(async (tx) => {
      // Delete old template if replacing
      if (replaceTemplateId) {
        await tx.calculation.delete({ where: { id: replaceTemplateId, isTemplate: true } });
      }

      const tmpl = await tx.calculation.create({
        data: {
          name,
          description: description ?? "",
          industry: industry ?? "",
          isTemplate: true,
          isPublished: true,
        },
      });

      if (source.processSteps.length > 0) {
        await tx.processStep.createMany({
          data: source.processSteps.map((s) => ({
            calculationId: tmpl.id,
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

      if (source.errorItems.length > 0) {
        await tx.errorItem.createMany({
          data: source.errorItems.map((e) => ({
            calculationId: tmpl.id,
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

      if (source.capexItems.length > 0) {
        await tx.capexItem.createMany({
          data: source.capexItems.map((c) => ({
            calculationId: tmpl.id,
            order: c.order,
            name: c.name,
            amount: c.amount,
            comment: c.comment,
          })),
        });
      }

      if (source.opexItems.length > 0) {
        await tx.opexItem.createMany({
          data: source.opexItems.map((o) => ({
            calculationId: tmpl.id,
            order: o.order,
            name: o.name,
            monthlyAmount: o.monthlyAmount,
            comment: o.comment,
          })),
        });
      }

      if (source.rolloutConfig) {
        await tx.rolloutConfig.create({
          data: {
            calculationId: tmpl.id,
            model: source.rolloutConfig.model,
            rolloutMonths: source.rolloutConfig.rolloutMonths,
            targetShare: source.rolloutConfig.targetShare,
            operationsPerMonth: source.rolloutConfig.operationsPerMonth,
            growthEnabled: source.rolloutConfig.growthEnabled,
            growthType: source.rolloutConfig.growthType,
            growthRate: source.rolloutConfig.growthRate,
            growthCeiling: source.rolloutConfig.growthCeiling,
          },
        });
      }

      return tmpl;
    });

    return NextResponse.json({ data: template });
  } catch (error) {
    console.error("Failed to create template from calculation:", error);
    return NextResponse.json({ error: "Ошибка при создании шаблона" }, { status: 500 });
  }
}
