import { ProcessStep } from "@/types";

/**
 * Computes derived fields for a process step (client-side only, not stored in DB).
 * stepCost = hourlyRate × timeHours
 * unitTime = timeHours × executionShare
 * unitCost = stepCost × executionShare
 */
export function computeProcessStep(step: ProcessStep): ProcessStep {
  const stepCost = step.hourlyRate * step.timeHours;
  const unitTime = step.timeHours * step.executionShare;
  const unitCost = stepCost * step.executionShare;
  return { ...step, stepCost, unitTime, unitCost };
}

/**
 * Sums up unit cost and unit time across all steps of a given process type.
 */
export function sumProcessSteps(steps: ProcessStep[]): {
  totalUnitCost: number;
  totalUnitTime: number;
  totalCalendarDays: number;
} {
  return steps.reduce(
    (acc, step) => {
      const computed = computeProcessStep(step);
      return {
        totalUnitCost: acc.totalUnitCost + (computed.unitCost ?? 0),
        totalUnitTime: acc.totalUnitTime + (computed.unitTime ?? 0),
        totalCalendarDays: acc.totalCalendarDays + step.calendarDays,
      };
    },
    { totalUnitCost: 0, totalUnitTime: 0, totalCalendarDays: 0 }
  );
}

/**
 * Calculates process cost savings per operation (AS-IS minus TO-BE).
 */
export function calcProcessSavings(
  asisSteps: ProcessStep[],
  tobeSteps: ProcessStep[]
): { costSavings: number; timeSavings: number } {
  const asis = sumProcessSteps(asisSteps);
  const tobe = sumProcessSteps(tobeSteps);
  return {
    costSavings: asis.totalUnitCost - tobe.totalUnitCost,
    timeSavings: asis.totalUnitTime - tobe.totalUnitTime,
  };
}
