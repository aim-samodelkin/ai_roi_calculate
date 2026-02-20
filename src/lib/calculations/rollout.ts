import { RolloutModel } from "@/types";

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
 * Generates an array of rollout shares for months 1..horizonMonths.
 */
export function generateRolloutCurve(
  model: RolloutModel,
  rolloutMonths: number,
  targetShare: number,
  horizonMonths: number
): Array<{ month: number; share: number }> {
  return Array.from({ length: horizonMonths }, (_, i) => {
    const month = i + 1;
    return { month, share: getRolloutShare(month, model, rolloutMonths, targetShare) };
  });
}
