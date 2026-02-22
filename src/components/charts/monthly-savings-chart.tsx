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
import { formatMoney, formatNumber } from "@/lib/format";

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
        <ComposedChart data={chartData} margin={{ top: 10, right: 55, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            label={{ value: "Месяц", position: "insideBottom", offset: -3, fontSize: 11 }}
          />
          <YAxis
            yAxisId="money"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`}
            width={55}
          />
          <YAxis
            yAxisId="ops"
            orientation="right"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickFormatter={(v) => formatNumber(v, 0)}
            width={50}
            label={{
              value: "операций",
              angle: 90,
              position: "insideRight",
              offset: 10,
              fontSize: 10,
              fill: "#9ca3af",
            }}
          />
          <Tooltip
            formatter={(value: number | string | undefined, name: string | undefined) => {
              const labels: Record<string, string> = {
                processSavings: "Экономия на процессе",
                errorSavings: "Экономия на ошибках",
                opexCostNeg: "Затраты OPEX",
                netBenefit: "Чистая выгода",
                operationsWithAI: "Операций с ИИ",
              };
              const key = name ?? "";
              if (key === "operationsWithAI") {
                return [`${formatNumber(Number(value ?? 0), 0)} опер.`, labels[key] ?? key];
              }
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
                operationsWithAI: "Операций с ИИ",
              };
              return labels[value] ?? value;
            }}
          />
          <Bar yAxisId="money" dataKey="processSavings" stackId="a" fill="#3B82F6" />
          <Bar yAxisId="money" dataKey="errorSavings" stackId="a" fill="#10B981" />
          <Bar yAxisId="money" dataKey="opexCostNeg" stackId="a" fill="#EF4444" />
          <Line
            yAxisId="money"
            type="monotone"
            dataKey="netBenefit"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="ops"
            type="monotone"
            dataKey="operationsWithAI"
            stroke="#9ca3af"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
