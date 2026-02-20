"use client";

import { Calculation } from "@/types";
import { sumProcessSteps, computeProcessStep } from "@/lib/calculations/process-savings";
import { sumErrorItems, computeErrorItem } from "@/lib/calculations/error-savings";
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
import { formatMoney } from "@/lib/format";

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

  const data = [
    {
      name: "Стоимость, ₽",
      "AS-IS процесс": Math.round(asisProcess.totalUnitCost),
      "AS-IS ошибки": Math.round(asisError.totalUnitErrorCost),
      "TO-BE процесс": Math.round(tobeProcess.totalUnitCost),
      "TO-BE ошибки": Math.round(tobeError.totalUnitErrorCost),
    },
    {
      name: "Время, ч",
      "AS-IS процесс": Math.round(asisProcess.totalUnitTime * 10) / 10,
      "AS-IS ошибки": Math.round(asisError.totalUnitErrorTime * 10) / 10,
      "TO-BE процесс": Math.round(tobeProcess.totalUnitTime * 10) / 10,
      "TO-BE ошибки": Math.round(tobeError.totalUnitErrorTime * 10) / 10,
    },
  ];

  return (
    <div className="h-56 bg-white rounded-lg border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}к` : String(v)} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={65} />
          <Tooltip
            formatter={(value: number | string | undefined, name: string | undefined) =>
              [`${formatMoney(Number(value ?? 0))}`, name ?? ""]
            }
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="AS-IS процесс" stackId="asis" fill="#93C5FD" />
          <Bar dataKey="AS-IS ошибки" stackId="asis" fill="#EF4444" />
          <Bar dataKey="TO-BE процесс" stackId="tobe" fill="#3B82F6" />
          <Bar dataKey="TO-BE ошибки" stackId="tobe" fill="#FCA5A5" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
