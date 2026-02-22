import { GrowthType, RolloutModel } from "@/types";

/**
 * Returns the rollout share (0..targetShare) for a given month using the specified model.
 * month is 1-based (month 1 = first month of operation).
 */
export function getRolloutShare(
  month: number,
  model: RolloutModel,
  rolloutMonths: number,
  targetShare: number
): number {
  if (model === "INSTANT") {
    return targetShare;
  }

  if (model === "LINEAR") {
    if (month >= rolloutMonths) return targetShare;
    return targetShare * (month / rolloutMonths);
  }

  if (model === "S_CURVE") {
    if (month >= rolloutMonths) return targetShare;
    // Logistic / S-curve approximation: midpoint at rolloutMonths/2
    const midpoint = rolloutMonths / 2;
    const steepness = 6 / rolloutMonths; // controls steepness
    const logistic = 1 / (1 + Math.exp(-steepness * (month - midpoint)));
    // Scale so that at month=rolloutMonths we approximate targetShare
    const scaleAt = 1 / (1 + Math.exp(-steepness * (rolloutMonths - midpoint)));
    return targetShare * (logistic / scaleAt);
  }

  return 0;
}

/**
 * Returns the total number of operations for a given month, accounting for optional growth.
 * month is 1-based (month 1 = baseOps, no growth applied yet).
 */
export function getOperationsForMonth(
  month: number,
  baseOps: number,
  growthEnabled: boolean,
  growthType: GrowthType,
  growthRate: number,
  growthCeiling: number | null
): number {
  if (!growthEnabled || growthRate === 0) return baseOps;

  let ops: number;
  if (growthType === "COMPOUND") {
    // Compound: each month grows by growthRate fraction relative to previous month
    ops = baseOps * Math.pow(1 + growthRate, month - 1);
  } else {
    // Linear absolute: fixed number of operations added each month
    ops = baseOps + growthRate * (month - 1);
  }

  if (growthCeiling != null && growthCeiling > 0) {
    ops = Math.min(ops, growthCeiling);
  }
  return Math.round(ops);
}

/**
 * Generates an array of rollout data for months 1..horizonMonths,
 * including rollout share and (optionally) absolute operations per month.
 */
export function generateRolloutCurve(
  model: RolloutModel,
  rolloutMonths: number,
  targetShare: number,
  horizonMonths: number,
  growthEnabled: boolean = false,
  growthType: GrowthType = "COMPOUND",
  growthRate: number = 0,
  growthCeiling: number | null = null,
  baseOps: number = 0
): Array<{ month: number; share: number; operations: number }> {
  return Array.from({ length: horizonMonths }, (_, i) => {
    const month = i + 1;
    const share = getRolloutShare(month, model, rolloutMonths, targetShare);
    const ops = getOperationsForMonth(month, baseOps, growthEnabled, growthType, growthRate, growthCeiling);
    return { month, share, operations: ops };
  });
}
