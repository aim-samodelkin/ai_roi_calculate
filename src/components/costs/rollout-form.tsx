"use client";

import { RolloutConfig, RolloutModel } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const MODELS: { value: RolloutModel; label: string; description: string }[] = [
  {
    value: "INSTANT",
    label: "Моментальная",
    description: "100% операций переходят на ИИ с первого месяца",
  },
  {
    value: "LINEAR",
    label: "Линейная",
    description: "Равномерный рост от 0% до целевой доли",
  },
  {
    value: "S_CURVE",
    label: "S-кривая",
    description: "Медленный старт, затем быстрый рост и плато",
  },
];

interface Props {
  config: RolloutConfig;
  onChange: (config: RolloutConfig) => void;
}

export function RolloutForm({ config, onChange }: Props) {
  const update = (patch: Partial<RolloutConfig>) => {
    onChange({ ...config, ...patch });
  };

  const horizonMonths = 24;
  const curveData = generateRolloutCurve(
    config.model,
    config.rolloutMonths,
    config.targetShare,
    horizonMonths
  ).map((d) => ({ ...d, sharePercent: Math.round(d.share * 100) }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Динамика раскатки ИИ-решения</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Укажите, как быстро ИИ-решение будет внедряться в операции
        </p>
      </div>

      {/* Model selection */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-3 block">Модель раскатки</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {MODELS.map((model) => (
            <button
              key={model.value}
              onClick={() => update({ model: model.value })}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                config.model === model.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900 mb-1">{model.label}</div>
              <div className="text-sm text-gray-500">{model.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="operations">Операций в месяц</Label>
          <Input
            id="operations"
            type="number"
            value={config.operationsPerMonth || ""}
            onChange={(e) => update({ operationsPerMonth: parseInt(e.target.value) || 0 })}
            min={0}
            placeholder="100"
          />
          <p className="text-xs text-gray-400">Сколько раз в месяц выполняется процесс</p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="targetShare">Целевая доля операций</Label>
          <Input
            id="targetShare"
            type="number"
            value={config.targetShare}
            onChange={(e) =>
              update({ targetShare: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)) })
            }
            min={0}
            max={1}
            step={0.05}
          />
          <p className="text-xs text-gray-400">
            Максимальная доля операций с ИИ (0–1, например 0.8 = 80%)
          </p>
        </div>

        {config.model !== "INSTANT" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="rolloutMonths">Срок раскатки, месяцев</Label>
            <Input
              id="rolloutMonths"
              type="number"
              value={config.rolloutMonths || ""}
              onChange={(e) => update({ rolloutMonths: parseInt(e.target.value) || 1 })}
              min={1}
              max={60}
            />
            <p className="text-xs text-gray-400">За сколько месяцев достичь целевой доли</p>
          </div>
        )}
      </div>

      {/* Mini-chart preview */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-3 block">
          Кривая раскатки (предпросмотр)
        </Label>
        <div className="h-48 bg-gray-50 rounded-lg p-4 border">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curveData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                label={{ value: "Месяцы", position: "insideBottom", offset: -2, fontSize: 11 }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip formatter={(v) => [`${v}%`, "Доля операций с ИИ"]} />
              <Line
                type="monotone"
                dataKey="sharePercent"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
