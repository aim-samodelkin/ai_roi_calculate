"use client";

import { RolloutConfig } from "@/types";
import { generateRolloutCurve } from "@/lib/calculations/rollout";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  rolloutConfig: RolloutConfig;
  horizonMonths: number;
}

export function RolloutChart({ rolloutConfig, horizonMonths }: Props) {
  const data = generateRolloutCurve(
    rolloutConfig.model,
    rolloutConfig.rolloutMonths,
    rolloutConfig.targetShare,
    horizonMonths
  ).map((d) => ({ ...d, sharePercent: Math.round(d.share * 100 * 10) / 10 }));

  return (
    <div className="h-56 bg-white rounded-lg border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            label={{ value: "Месяц", position: "insideBottom", offset: -3, fontSize: 11 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip formatter={(v: number | string | undefined) => [`${v ?? 0}%`, "Доля операций с ИИ"]} labelFormatter={(l) => `Месяц ${l}`} />
          <Line
            type="monotone"
            dataKey="sharePercent"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            name="Доля операций с ИИ"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
