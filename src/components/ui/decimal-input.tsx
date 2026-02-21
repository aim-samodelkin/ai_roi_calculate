"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Parses decimal string (supports both "." and ",") to number.
 */
function parseDecimal(value: string): number {
  const normalized = value.replace(",", ".");
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

/**
 * Converts a number to string using comma as decimal separator.
 */
function formatDecimal(value: number): string {
  return String(value).replace(".", ",");
}

/**
 * Formats a number with thousands separator (Russian locale: space as separator).
 * Returns empty string for zero.
 */
function formatThousands(value: number): string {
  if (value === 0) return "";
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 6, useGrouping: true });
}

/**
 * Checks if string is valid for decimal input (digits, optional decimal separator).
 * Strips spaces to handle pasted formatted values.
 */
function isValidDecimalInput(value: string): boolean {
  if (value === "" || value === "-") return true;
  return /^-?\d*[,.]?\d*$/.test(value);
}

interface DecimalInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** If set, clamps value on blur */
  clamp?: boolean;
  /** If set, shows thousands separator when not focused (e.g. 4 000 000) */
  thousands?: boolean;
}

/**
 * Numeric input that allows typing values like 0.1, 0,5 without losing intermediate state.
 * Uses type="text" + inputMode="decimal" to avoid native number input quirks with leading zeros.
 * When thousands=true, displays formatted value with thousands separators when not focused.
 */
const DecimalInput = React.forwardRef<HTMLInputElement, DecimalInputProps>(
  ({ value, onChange, min, max, clamp = false, thousands = false, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string | null>(null);
    const isEditing = displayValue !== null;

    const stringValue = (() => {
      if (value === 0 && !isEditing) return "";
      if (thousands && !isEditing) return formatThousands(value);
      return formatDecimal(value);
    })();
    const display = isEditing ? displayValue : stringValue;

    const handleFocus = () => {
      setDisplayValue(value === 0 ? "" : formatDecimal(value));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Strip spaces so pasted formatted values (e.g. "4 000 000") are handled gracefully
      const raw = e.target.value.replace(/[\s\u00A0]/g, "");
      if (isValidDecimalInput(raw)) {
        setDisplayValue(raw);
        if (raw !== "" && raw !== "-" && !raw.endsWith(".") && !raw.endsWith(",")) {
          const num = parseDecimal(raw);
          onChange(num);
        }
      }
    };

    const handleBlur = () => {
      const raw = displayValue ?? "";
      const num = raw === "" || raw === "-" ? 0 : parseDecimal(raw);
      let final = num;
      if (clamp) {
        if (min !== undefined) final = Math.max(min, final);
        if (max !== undefined) final = Math.min(max, final);
      }
      onChange(final);
      setDisplayValue(null);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={display}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn("text-right", className)}
        {...props}
      />
    );
  }
);

DecimalInput.displayName = "DecimalInput";

export { DecimalInput };
