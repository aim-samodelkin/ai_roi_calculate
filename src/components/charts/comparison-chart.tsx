"use client";

import { Calculation } from "@/types";
import { sumProcessSteps, computeProcessStep } from "@/lib/calculations/process-savings";
import { sumErrorItems, computeErrorItem } from "@/lib/calculations/error-savings";
import { calcRoi } from "@/lib/calculations/roi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatMoney, formatNumber } from "@/lib/format";

interface Props {
  calculation: Calculation;
}

export function ComparisonChart({ calculation }: Props) {
  const asisSteps = calculation.processSteps.filter((s) => s.type === "AS_IS");
  const tobeSteps = calculation.processSteps.filter((s) => s.type === "TO_BE");
  const asisErrors = calculation.errorItems.filter((e) => e.type === "AS_IS");
  const tobeErrors = calculation.errorItems.filter((e) => e.type === "TO_BE");

  const asisProcess = sumProcessSteps(asisSteps.map(computeProcessStep));
  const tobeProcess = sumProcessSteps(tobeSteps.map(computeProcessStep));
  const asisError = sumErrorItems(asisErrors.map(computeErrorItem));
  const tobeError = sumErrorItems(tobeErrors.map(computeErrorItem));

  const roi = calcRoi(calculation, 12);
  const hasCalendarData =
    asisProcess.totalCalendarDays > 0 ||
    tobeProcess.totalCalendarDays > 0 ||
    asisError.totalUnitCalendarDays > 0 ||
    tobeError.totalUnitCalendarDays > 0;

  const costData = [
    {
      name: "AS-IS",
      "Процесс": Math.round(asisProcess.totalUnitCost),
      "Риски": Math.round(asisError.totalUnitErrorCost),
    },
    {
      name: "TO-BE",
      "Процесс": Math.round(tobeProcess.totalUnitCost),
      "Риски": Math.round(tobeError.totalUnitErrorCost),
    },
  ];

  const timeData = [
    {
      name: "AS-IS",
      "Процесс": Math.round(asisProcess.totalUnitTime * 10) / 10,
      "Риски": Math.round(asisError.totalUnitErrorTime * 10) / 10,
    },
    {
      name: "TO-BE",
      "Процесс": Math.round(tobeProcess.totalUnitTime * 10) / 10,
      "Риски": Math.round(tobeError.totalUnitErrorTime * 10) / 10,
    },
  ];

  const calendarData = [
    {
      name: "AS-IS",
      "Процесс": Math.round(asisProcess.totalCalendarDays * 10) / 10,
      "Риски": Math.round(roi.asisErrorCalendarDays * 10) / 10,
    },
    {
      name: "TO-BE",
      "Процесс": Math.round(tobeProcess.totalCalendarDays * 10) / 10,
      "Риски": Math.round(roi.tobeErrorCalendarDays * 10) / 10,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="h-44 bg-white rounded-lg border p-4">
        <p className="text-xs font-medium text-gray-500 mb-2">Стоимость на операцию, ₽</p>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={costData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}к` : String(v)}
              width={45}
            />
            <Tooltip
              formatter={(value: number | string | undefined, name: string | undefined) => [
                `${formatMoney(Number(value ?? 0))} ₽`,
                name ?? "",
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Процесс" stackId="a" fill="#3B82F6" />
            <Bar dataKey="Риски" stackId="a" fill="#EF4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="h-44 bg-white rounded-lg border p-4">
        <p className="text-xs font-medium text-gray-500 mb-2">Время на операцию, ч</p>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={timeData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => formatNumber(v, 1)}
              width={45}
            />
            <Tooltip
              formatter={(value: number | string | undefined, name: string | undefined) => [
                `${formatNumber(Number(value ?? 0), 1)} ч`,
                name ?? "",
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Процесс" stackId="a" fill="#3B82F6" />
            <Bar dataKey="Риски" stackId="a" fill="#EF4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {hasCalendarData && (
        <div className="h-44 bg-white rounded-lg border p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Календарный срок, дн.</p>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={calendarData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => formatNumber(v, 1)}
                width={45}
              />
              <Tooltip
                formatter={(value: number | string | undefined, name: string | undefined) => [
                  `${formatNumber(Number(value ?? 0), 1)} дн.`,
                  name ?? "",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Процесс" stackId="a" fill="#3B82F6" />
              <Bar dataKey="Риски" stackId="a" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
