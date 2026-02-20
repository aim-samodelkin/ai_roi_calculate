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
 * Format a number with up to 2 decimal places.
 */
export function formatNumber(value: number, decimals = 2): string {
  if (!isFinite(value)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
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
