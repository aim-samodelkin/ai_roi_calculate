"use client";

import { MonthlyData } from "@/types";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatMoney } from "@/lib/format";

interface Props {
  data: MonthlyData[];
}

export function MonthlySavingsChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    opexCostNeg: -d.opexCost,
  }));

  return (
    <div className="h-72 bg-white rounded-lg border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
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
            formatter={(value: number | string | undefined, name: string | undefined) => {
              const labels: Record<string, string> = {
                processSavings: "Экономия на процессе",
                errorSavings: "Экономия на ошибках",
                opexCostNeg: "Затраты OPEX",
                netBenefit: "Чистая выгода",
              };
              const key = name ?? "";
              return [`${formatMoney(Math.abs(Number(value ?? 0)))} ₽`, labels[key] ?? key];
            }}
            labelFormatter={(label) => `Месяц ${label}`}
          />
          <Legend
            formatter={(value) => {
              const labels: Record<string, string> = {
                processSavings: "Экономия на процессе",
                errorSavings: "Экономия на ошибках",
                opexCostNeg: "Затраты OPEX",
                netBenefit: "Чистая выгода",
              };
              return labels[value] ?? value;
            }}
          />
          <Bar dataKey="processSavings" stackId="a" fill="#3B82F6" />
          <Bar dataKey="errorSavings" stackId="a" fill="#10B981" />
          <Bar dataKey="opexCostNeg" stackId="a" fill="#EF4444" />
          <Line
            type="monotone"
            dataKey="netBenefit"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
