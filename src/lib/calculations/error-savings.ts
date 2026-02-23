import { ErrorItem } from "@/types";

/**
 * Computes derived fields for an error item (client-side only).
 * riskCost = hourlyRate × timeHours + extraCost
 * unitErrorCost = riskCost × frequency
 * unitErrorTime = timeHours × frequency
 * unitCalendarDays = calendarDays × frequency (expected calendar delay per operation)
 */
export function computeErrorItem(item: ErrorItem): ErrorItem {
  const riskCost = item.hourlyRate * item.timeHours + (item.extraCost ?? 0);
  const unitErrorCost = riskCost * item.frequency;
  const unitErrorTime = item.timeHours * item.frequency;
  const unitCalendarDays = (item.calendarDays ?? 0) * item.frequency;
  return { ...item, riskCost, unitErrorCost, unitErrorTime, unitCalendarDays };
}

/**
 * Sums unit error costs, times, and other totals across all error items.
 */
export function sumErrorItems(items: ErrorItem[]): {
  totalUnitErrorCost: number;
  totalUnitErrorTime: number;
  totalTimeHours: number;
  totalCalendarDays: number;
  totalUnitCalendarDays: number;
} {
  return items.reduce(
    (acc, item) => {
      const computed = computeErrorItem(item);
      return {
        totalUnitErrorCost: acc.totalUnitErrorCost + (computed.unitErrorCost ?? 0),
        totalUnitErrorTime: acc.totalUnitErrorTime + (computed.unitErrorTime ?? 0),
        totalTimeHours: acc.totalTimeHours + (item.timeHours ?? 0),
        totalCalendarDays: acc.totalCalendarDays + (item.calendarDays ?? 0),
        totalUnitCalendarDays: acc.totalUnitCalendarDays + (computed.unitCalendarDays ?? 0),
      };
    },
    { totalUnitErrorCost: 0, totalUnitErrorTime: 0, totalTimeHours: 0, totalCalendarDays: 0, totalUnitCalendarDays: 0 }
  );
}

/**
 * Calculates error cost savings per operation (AS-IS minus TO-BE).
 */
export function calcErrorSavings(
  asisErrors: ErrorItem[],
  tobeErrors: ErrorItem[]
): { costSavings: number; timeSavings: number } {
  const asis = sumErrorItems(asisErrors);
  const tobe = sumErrorItems(tobeErrors);
  return {
    costSavings: asis.totalUnitErrorCost - tobe.totalUnitErrorCost,
    timeSavings: asis.totalUnitErrorTime - tobe.totalUnitErrorTime,
  };
}
