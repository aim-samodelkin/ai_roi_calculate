"use client";

import { useState } from "react";
import { Calculation } from "@/types";
import { calcRoi } from "@/lib/calculations/roi";
import { formatMoney, formatNumber, formatMultiplier, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoiChart } from "./roi-chart";
import { MonthlySavingsChart } from "./monthly-savings-chart";
import { RolloutChart } from "./rollout-chart";
import { ComparisonChart } from "./comparison-chart";

interface Props {
  calculation: Calculation;
}

export function ResultsPanel({ calculation }: Props) {
  const [horizon, setHorizon] = useState<"12" | "24" | "36">("24");

  const result = calcRoi(calculation, parseInt(horizon));

  const hasData =
    calculation.processSteps.length > 0 ||
    calculation.errorItems.length > 0 ||
    calculation.capexItems.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Нет данных для расчёта</h3>
        <p className="text-gray-500 max-w-sm">
          Заполните шаги 1–7, чтобы увидеть расчёт ROI и графики окупаемости
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Результаты расчёта ROI</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Экономический эффект от внедрения ИИ-решения
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Горизонт:</span>
          <Select value={horizon} onValueChange={(v) => setHorizon(v as typeof horizon)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12 месяцев</SelectItem>
              <SelectItem value="24">24 месяца</SelectItem>
              <SelectItem value="36">36 месяцев</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="ROI за 12 месяцев"
          value={formatPercent(result.roi12months)}
          color={result.roi12months >= 0 ? "green" : "red"}
          sub="Возврат инвестиций"
        />
        <KpiCard
          label="Точка окупаемости"
          value={result.breakEvenMonth ? `${result.breakEvenMonth} мес.` : "Нет"}
          color={result.breakEvenMonth ? "green" : "gray"}
          sub="Месяц окупаемости CAPEX"
        />
        <KpiCard
          label="Экономия за год"
          value={`${formatMoney(result.annualSavings)} ₽`}
          color="blue"
          sub="Совокупная выгода за 12 мес."
        />
        <KpiCard
          label="Экономия за операцию"
          value={`${formatMoney(result.totalSavingsPerOperation)} ₽`}
          color="blue"
          sub={`+${formatNumber(result.timeSavingsPerOperation)} ч времени`}
        />
      </div>

      {/* Productivity multipliers */}
      {(result.timeMultiplier !== null || result.costMultiplier !== null || result.calendarMultiplier !== null) && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">Эффект автоматизации</h3>
          <div className={`grid gap-4 ${result.calendarMultiplier !== null ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>
            {result.timeMultiplier !== null && (
              <MultiplierCard
                label="Рост производительности"
                value={formatMultiplier(result.timeMultiplier)}
                color="green"
                description="по человеко-часам на операцию"
                before={`${formatNumber(result.asisUnitTime)} ч`}
                after={`${formatNumber(result.tobeUnitTime)} ч`}
              />
            )}
            {result.costMultiplier !== null && (
              <MultiplierCard
                label="Снижение стоимости"
                value={formatMultiplier(result.costMultiplier)}
                color="green"
                description="удельная стоимость операции"
                before={`${formatMoney(result.asisUnitCost)} ₽`}
                after={`${formatMoney(result.tobeUnitCost)} ₽`}
              />
            )}
            {result.calendarMultiplier !== null && (
              <MultiplierCard
                label="Ускорение процесса"
                value={formatMultiplier(result.calendarMultiplier)}
                color="blue"
                description="в календарных днях"
                before={`${formatNumber(result.asisCalendarDays, 1)} дн.`}
                after={`${formatNumber(result.tobeCalendarDays, 1)} дн.`}
              />
            )}
          </div>
        </div>
      )}

      {/* Per-operation breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Экономия на процессе (за 1 операцию)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatMoney(result.processSavingsPerOperation)} ₽
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Разница удельных стоимостей AS-IS и TO-BE
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Экономия на ошибках (за 1 операцию)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatMoney(result.errorSavingsPerOperation)} ₽
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Снижение удельных затрат на ошибки
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="flex flex-col gap-8">
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Динамика окупаемости</h3>
          <RoiChart data={result.monthlyData} breakEvenMonth={result.breakEvenMonth} />
        </div>

        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Помесячная экономия</h3>
          <MonthlySavingsChart data={result.monthlyData} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Кривая раскатки</h3>
            <RolloutChart
              rolloutConfig={calculation.rolloutConfig ?? {
                id: "",
                calculationId: calculation.id,
                model: "LINEAR",
                rolloutMonths: 6,
                targetShare: 1,
                operationsPerMonth: 100,
              }}
              horizonMonths={parseInt(horizon)}
            />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Сравнение AS-IS vs TO-BE</h3>
            <ComparisonChart calculation={calculation} />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: "green" | "red" | "blue" | "gray";
}) {
  const colors = {
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
    gray: "text-gray-500",
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-5">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

function MultiplierCard({
  label,
  value,
  color,
  description,
  before,
  after,
}: {
  label: string;
  value: string;
  color: "green" | "blue";
  description: string;
  before: string;
  after: string;
}) {
  const colors = {
    green: "text-green-600",
    blue: "text-blue-600",
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-5">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className={`text-3xl font-bold ${colors[color]}`}>в {value}</p>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
        <div className="flex items-center gap-1.5 mt-3 text-xs">
          <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">{before}</span>
          <span className="text-gray-400">→</span>
          <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium">{after}</span>
        </div>
      </CardContent>
    </Card>
  );
}
