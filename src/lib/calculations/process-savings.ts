import { ProcessStep } from "@/types";

/**
 * Computes derived fields for a process step (client-side only, not stored in DB).
 * stepCost = hourlyRate × timeHours + extraCost
 * unitTime = timeHours × executionShare
 * unitCost = stepCost × executionShare
 */
export function computeProcessStep(step: ProcessStep): ProcessStep {
  const stepCost = step.hourlyRate * step.timeHours + (step.extraCost ?? 0);
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
  totalTimeHours: number;
} {
  return steps.reduce(
    (acc, step) => {
      const computed = computeProcessStep(step);
      return {
        totalUnitCost: acc.totalUnitCost + (computed.unitCost ?? 0),
        totalUnitTime: acc.totalUnitTime + (computed.unitTime ?? 0),
        totalCalendarDays: acc.totalCalendarDays + step.calendarDays,
        totalTimeHours: acc.totalTimeHours + (step.timeHours ?? 0),
      };
    },
    { totalUnitCost: 0, totalUnitTime: 0, totalCalendarDays: 0, totalTimeHours: 0 }
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

/**
 * Calculates productivity multipliers comparing AS-IS vs TO-BE.
 * timeMultiplier: how many times man-hours are reduced (AS-IS / TO-BE).
 * costMultiplier: how many times cost is reduced (AS-IS / TO-BE).
 * calendarMultiplier: how many times calendar duration is reduced (only if both sides have data).
 */
export function calcProductivityMultipliers(
  asisSteps: ProcessStep[],
  tobeSteps: ProcessStep[]
): {
  timeMultiplier: number | null;
  costMultiplier: number | null;
  calendarMultiplier: number | null;
  asisUnitTime: number;
  tobeUnitTime: number;
  asisUnitCost: number;
  tobeUnitCost: number;
  asisCalendarDays: number;
  tobeCalendarDays: number;
} {
  const asis = sumProcessSteps(asisSteps);
  const tobe = sumProcessSteps(tobeSteps);
  return {
    timeMultiplier: tobe.totalUnitTime > 0 ? asis.totalUnitTime / tobe.totalUnitTime : null,
    costMultiplier: tobe.totalUnitCost > 0 ? asis.totalUnitCost / tobe.totalUnitCost : null,
    calendarMultiplier:
      asis.totalCalendarDays > 0 && tobe.totalCalendarDays > 0
        ? asis.totalCalendarDays / tobe.totalCalendarDays
        : null,
    asisUnitTime: asis.totalUnitTime,
    tobeUnitTime: tobe.totalUnitTime,
    asisUnitCost: asis.totalUnitCost,
    tobeUnitCost: tobe.totalUnitCost,
    asisCalendarDays: asis.totalCalendarDays,
    tobeCalendarDays: tobe.totalCalendarDays,
  };
}
