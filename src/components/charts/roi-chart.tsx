"use client";

import { MonthlyData } from "@/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { formatMoney } from "@/lib/format";

interface Props {
  data: MonthlyData[];
  breakEvenMonth: number | null;
}

export function RoiChart({ data, breakEvenMonth }: Props) {
  return (
    <div className="h-72 bg-white rounded-lg border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="colorBenefit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            label={{ value: "Месяц", position: "insideBottom", offset: -3, fontSize: 11 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`}
            width={55}
          />
          <Tooltip
            formatter={(value: number | string | undefined, name: string | undefined) => [
              `${formatMoney(Number(value ?? 0))} ₽`,
              name === "cumulativeGrossBenefit" ? "Накопленная выгода" : "Накопленные затраты",
            ]}
            labelFormatter={(label) => `Месяц ${label}`}
          />
          <Legend
            formatter={(value) =>
              value === "cumulativeGrossBenefit" ? "Накопленная выгода" : "Накопленные затраты"
            }
          />
          {breakEvenMonth && (
            <ReferenceLine
              x={breakEvenMonth}
              stroke="#6366f1"
              strokeDasharray="4 2"
              label={{ value: `Окупаемость: мес. ${breakEvenMonth}`, position: "top", fontSize: 10, fill: "#6366f1" }}
            />
          )}
          <Area
            type="monotone"
            dataKey="cumulativeGrossBenefit"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#colorBenefit)"
          />
          <Area
            type="monotone"
            dataKey="cumulativeCosts"
            stroke="#EF4444"
            strokeWidth={2}
            fill="url(#colorCosts)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
