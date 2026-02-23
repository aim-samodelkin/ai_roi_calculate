import { Calculation, MonthlyData, RoiResult } from "@/types";
import { calcProcessSavings, calcProductivityMultipliers, sumProcessSteps } from "./process-savings";
import { calcErrorSavings, sumErrorItems, computeErrorItem } from "./error-savings";
import { getRolloutShare, getOperationsForMonth } from "./rollout";

/**
 * Computes the full ROI result for a calculation over the given horizon (months).
 * All heavy logic lives here; components just render the result.
 */
export function calcRoi(calculation: Calculation, horizonMonths: number = 24): RoiResult {
  const asisSteps = calculation.processSteps.filter((s) => s.type === "AS_IS");
  const tobeSteps = calculation.processSteps.filter((s) => s.type === "TO_BE");
  const asisErrors = calculation.errorItems.filter((e) => e.type === "AS_IS");
  const tobeErrors = calculation.errorItems.filter((e) => e.type === "TO_BE");

  const processSav = calcProcessSavings(asisSteps, tobeSteps);
  const errorSav = calcErrorSavings(asisErrors, tobeErrors);
  const multipliers = calcProductivityMultipliers(asisSteps, tobeSteps);

  const asisProcessTotals = sumProcessSteps(asisSteps);
  const tobeProcessTotals = sumProcessSteps(tobeSteps);
  const asisErrorTotals = sumErrorItems(asisErrors.map(computeErrorItem));
  const tobeErrorTotals = sumErrorItems(tobeErrors.map(computeErrorItem));

  const asisErrorCalendarDays = asisErrorTotals.totalUnitCalendarDays;
  const tobeErrorCalendarDays = tobeErrorTotals.totalUnitCalendarDays;
  const asisTotalCycleDays = asisProcessTotals.totalCalendarDays + asisErrorCalendarDays;
  const tobeTotalCycleDays = tobeProcessTotals.totalCalendarDays + tobeErrorCalendarDays;

  const totalSavingsPerOperation = processSav.costSavings + errorSav.costSavings;
  const timeSavingsPerOperation = processSav.timeSavings + errorSav.timeSavings;

  const totalCapex = calculation.capexItems.reduce((sum, item) => sum + item.amount, 0);
  const totalOpexPerMonth = calculation.opexItems.reduce(
    (sum, item) => sum + item.monthlyAmount,
    0
  );

  const rollout = calculation.rolloutConfig ?? {
    model: "LINEAR" as const,
    rolloutMonths: 6,
    targetShare: 1,
    operationsPerMonth: 100,
    growthEnabled: false,
    growthType: "COMPOUND" as const,
    growthRate: 0,
    growthCeiling: null,
  };

  let cumulativeBenefit = 0;
  let cumulativeGrossBenefit = 0;
  let cumulativeOpex = 0;
  let breakEvenMonth: number | null = null;

  const monthlyData: MonthlyData[] = [];

  for (let month = 1; month <= horizonMonths; month++) {
    const rolloutShare = getRolloutShare(
      month,
      rollout.model as import("@/types").RolloutModel,
      rollout.rolloutMonths,
      rollout.targetShare
    );

    const operationsThisMonth = getOperationsForMonth(
      month,
      rollout.operationsPerMonth,
      rollout.growthEnabled ?? false,
      (rollout.growthType ?? "COMPOUND") as import("@/types").GrowthType,
      rollout.growthRate ?? 0,
      rollout.growthCeiling ?? null
    );
    const operationsWithAI = operationsThisMonth * rolloutShare;
    const processSavings = operationsWithAI * processSav.costSavings;
    const errorSavings = operationsWithAI * errorSav.costSavings;
    const totalBenefit = processSavings + errorSavings;
    const opexCost = totalOpexPerMonth;
    const netBenefit = totalBenefit - opexCost;

    cumulativeBenefit += netBenefit;
    cumulativeGrossBenefit += totalBenefit;
    cumulativeOpex += opexCost;

    const cumulativeCosts = totalCapex + cumulativeOpex;
    const roi =
      cumulativeCosts > 0
        ? ((cumulativeBenefit - totalCapex) / cumulativeCosts) * 100
        : 0;

    if (breakEvenMonth === null && cumulativeGrossBenefit >= cumulativeCosts) {
      breakEvenMonth = month;
    }

    monthlyData.push({
      month,
      rolloutShare,
      operationsThisMonth,
      operationsWithAI,
      processSavings,
      errorSavings,
      totalBenefit,
      opexCost,
      netBenefit,
      cumulativeBenefit,
      cumulativeGrossBenefit,
      cumulativeCosts,
      roi,
    });
  }

  const data12 = monthlyData[11];
  const data24 = monthlyData[23] ?? monthlyData[monthlyData.length - 1];

  // Steady-state month: operations at full rollout (targetShare × base ops, no growth adjustment)
  const operationsAtFullRollout = rollout.operationsPerMonth * rollout.targetShare;
  const monthlyBenefitAtFullRollout = operationsAtFullRollout * totalSavingsPerOperation;

  return {
    monthlyData,
    breakEvenMonth,
    totalCapex,
    totalOpexPerMonth,
    processSavingsPerOperation: processSav.costSavings,
    errorSavingsPerOperation: errorSav.costSavings,
    totalSavingsPerOperation,
    timeSavingsPerOperation,
    roi12months: data12?.roi ?? 0,
    roi24months: data24?.roi ?? 0,
    annualSavings: data12
      ? monthlyData.slice(0, 12).reduce((sum, d) => sum + d.totalBenefit, 0)
      : 0,
    operationsAtFullRollout,
    monthlyBenefitAtFullRollout,
    timeMultiplier: multipliers.timeMultiplier,
    costMultiplier: multipliers.costMultiplier,
    calendarMultiplier: multipliers.calendarMultiplier,
    asisUnitTime: multipliers.asisUnitTime,
    tobeUnitTime: multipliers.tobeUnitTime,
    asisUnitCost: multipliers.asisUnitCost,
    tobeUnitCost: multipliers.tobeUnitCost,
    asisCalendarDays: multipliers.asisCalendarDays,
    tobeCalendarDays: multipliers.tobeCalendarDays,
    asisErrorCalendarDays,
    tobeErrorCalendarDays,
    asisTotalCycleDays,
    tobeTotalCycleDays,
  };
}
