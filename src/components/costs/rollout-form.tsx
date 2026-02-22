"use client";

import { RolloutConfig, RolloutModel, GrowthType } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DecimalInput } from "@/components/ui/decimal-input";
import { generateRolloutCurve } from "@/lib/calculations/rollout";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

const GROWTH_TYPES: { value: GrowthType; label: string; description: string }[] = [
  {
    value: "COMPOUND",
    label: "Процентный рост",
    description: "Каждый месяц растёт на % от предыдущего",
  },
  {
    value: "LINEAR_ABS",
    label: "Линейный прирост",
    description: "Фиксированная прибавка в операциях/мес.",
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

  const growthEnabled = config.growthEnabled ?? false;
  const growthType = config.growthType ?? "COMPOUND";
  const growthRate = config.growthRate ?? 0;
  const growthCeiling = config.growthCeiling ?? null;

  const horizonMonths = config.model === "INSTANT" ? 6 : (config.rolloutMonths || 1) + 3;
  const curveData = generateRolloutCurve(
    config.model,
    config.rolloutMonths,
    config.targetShare,
    horizonMonths,
    growthEnabled,
    growthType,
    growthType === "COMPOUND" ? growthRate / 100 : growthRate,
    growthCeiling,
    config.operationsPerMonth || 0
  ).map((d) => ({
    ...d,
    sharePercent: Math.round(d.share * 100),
    operationsWithAI: Math.round(d.operations * d.share),
  }));

  const showSecondLine = growthEnabled && (config.operationsPerMonth || 0) > 0;
  const maxOpsInChart = showSecondLine
    ? Math.max(...curveData.map((d) => d.operationsWithAI))
    : 0;

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
          <DecimalInput
            id="operations"
            value={config.operationsPerMonth || 0}
            onChange={(v) => update({ operationsPerMonth: Math.round(v) })}
            clamp
            min={0}
            thousands
            placeholder="100"
          />
          <p className="text-xs text-gray-400">Сколько раз в месяц выполняется процесс</p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="targetShare">Целевая доля операций</Label>
          <div className="relative">
            <DecimalInput
              id="targetShare"
              value={Math.round(config.targetShare * 100)}
              onChange={(v) =>
                update({ targetShare: Math.min(1, Math.max(0, (v || 0) / 100)) })
              }
              min={0}
              max={100}
              clamp
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
              %
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Максимальная доля операций с ИИ (0–100%)
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

      {/* Growth dynamics toggle */}
      <div className="border rounded-lg p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900 text-sm">Рост объёма операций</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Учитывать увеличение количества операций со временем
            </div>
          </div>
          <Switch
            checked={growthEnabled}
            onCheckedChange={(checked: boolean) => update({ growthEnabled: checked })}
          />
        </div>

        {growthEnabled && (
          <div className="flex flex-col gap-5">
            {/* Growth type selector */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Тип роста
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {GROWTH_TYPES.map((gt) => (
                  <button
                    key={gt.value}
                    onClick={() => update({ growthType: gt.value })}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      growthType === gt.value
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-gray-900 text-sm mb-0.5">{gt.label}</div>
                    <div className="text-xs text-gray-500">{gt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Growth rate and ceiling */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="growthRate">
                  {growthType === "COMPOUND" ? "Рост в месяц, %" : "Прирост операций в месяц"}
                </Label>
                {growthType === "COMPOUND" ? (
                  <div className="relative">
                    <DecimalInput
                      id="growthRate"
                      value={growthRate}
                      onChange={(v) => update({ growthRate: Math.max(0, v || 0) })}
                      min={0}
                      max={100}
                      clamp
                      className="pr-8"
                      placeholder="5"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                      %
                    </span>
                  </div>
                ) : (
                  <DecimalInput
                    id="growthRate"
                    value={growthRate}
                    onChange={(v) => update({ growthRate: Math.round(Math.max(0, v || 0)) })}
                    min={0}
                    thousands
                    placeholder="50"
                  />
                )}
                <p className="text-xs text-gray-400">
                  {growthType === "COMPOUND"
                    ? "На сколько % растёт объём относительно предыдущего месяца"
                    : "Сколько операций добавляется каждый месяц"}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="growthCeiling">Потолок операций в месяц</Label>
                <DecimalInput
                  id="growthCeiling"
                  value={growthCeiling ?? 0}
                  onChange={(v) =>
                    update({ growthCeiling: v && v > 0 ? Math.round(v) : null })
                  }
                  min={0}
                  thousands
                  placeholder="Без ограничений"
                />
                <p className="text-xs text-gray-400">
                  Максимальный объём (0 = без ограничений)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mini-chart preview */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-3 block">
          Кривая раскатки (предпросмотр)
        </Label>
        <div className="h-56 bg-gray-50 rounded-lg p-4 border">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curveData} margin={{ top: 5, right: showSecondLine ? 50 : 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                label={{ value: "Месяцы", position: "insideBottom", offset: -2, fontSize: 11 }}
              />
              <YAxis
                yAxisId="share"
                tick={{ fontSize: 11 }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              {showSecondLine && (
                <YAxis
                  yAxisId="ops"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  domain={[0, Math.ceil(maxOpsInChart * 1.1) || 10]}
                  tickFormatter={(v) => v.toLocaleString("ru-RU")}
                  width={55}
                />
              )}
              <Tooltip
                formatter={(value, name) => {
                  if (name === "sharePercent") return [`${value}%`, "Доля операций с ИИ"];
                  if (name === "operationsWithAI")
                    return [Number(value).toLocaleString("ru-RU"), "Операций с ИИ"];
                  return [value, name];
                }}
              />
              {showSecondLine && <Legend />}
              <Line
                yAxisId="share"
                type="monotone"
                dataKey="sharePercent"
                name="Доля операций с ИИ"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
              />
              {showSecondLine && (
                <Line
                  yAxisId="ops"
                  type="monotone"
                  dataKey="operationsWithAI"
                  name="Операций с ИИ"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 3"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {showSecondLine && (
          <p className="text-xs text-gray-400 mt-2">
            Синяя линия — доля охвата (%), зелёная пунктирная — абсолютное число операций с ИИ
          </p>
        )}
      </div>
    </div>
  );
}
