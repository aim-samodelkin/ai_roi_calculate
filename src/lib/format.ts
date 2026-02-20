/**
 * Format a number as Russian rubles with no decimal if whole number.
 */
export function formatMoney(value: number): string {
  if (!isFinite(value)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

/**
 * Format a number with up to `decimals` decimal places.
 * Pass `minDecimals` to always show a fixed number of decimal digits.
 */
export function formatNumber(value: number, decimals = 2, minDecimals = 0): string {
  if (!isFinite(value)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a percentage.
 */
export function formatPercent(value: number, decimals = 1): string {
  if (!isFinite(value)) return "—";
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a multiplier (ratio) with one decimal place and × suffix.
 */
export function formatMultiplier(value: number): string {
  if (!isFinite(value) || value <= 0) return "—";
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value) + "×";
}
