"use client";

import { useState } from "react";
import { Calculation } from "@/types";
import { calcRoi } from "@/lib/calculations/roi";
import { formatMoney, formatNumber, formatMultiplier, formatPercent } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoiChart } from "./roi-chart";
import { MonthlySavingsChart } from "./monthly-savings-chart";
import { RolloutChart } from "./rollout-chart";
import { ComparisonChart } from "./comparison-chart";
import { Download, Loader2 } from "lucide-react";

interface Props {
  calculation: Calculation;
}

const ROLLOUT_MODEL_LABELS: Record<string, string> = {
  INSTANT: "Мгновенная",
  LINEAR: "Линейная",
  S_CURVE: "S-кривая",
};

export function ResultsPanel({ calculation }: Props) {
  const [horizon, setHorizon] = useState<"12" | "24" | "36">("24");
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const response = await fetch(
        `/api/export/pdf/${calculation.id}?horizon=${horizon}`
      );
      if (!response.ok) throw new Error("PDF generation failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename\*=UTF-8''(.+)/);
      a.download = filenameMatch
        ? decodeURIComponent(filenameMatch[1])
        : `ROI_${calculation.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Не удалось сгенерировать PDF. Попробуйте ещё раз.");
    } finally {
      setDownloading(false);
    }
  }

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

  const rollout = calculation.rolloutConfig;
  const rolloutLabel = rollout ? ROLLOUT_MODEL_LABELS[rollout.model] ?? rollout.model : "Линейная";
  const rolloutDetail =
    rollout?.model === "INSTANT"
      ? `→ ${Math.round((rollout?.targetShare ?? 1) * 100)}%`
      : `${rollout?.rolloutMonths ?? 6} мес. → ${Math.round((rollout?.targetShare ?? 1) * 100)}%`;

  const growthLabel =
    rollout?.growthEnabled
      ? rollout.growthType === "COMPOUND"
        ? `+${formatNumber(rollout.growthRate * 100, 1)}%/мес.`
        : `+${formatNumber(rollout.growthRate, 0)}/мес.`
      : "Без роста";

  return (
    <div className="flex flex-col gap-6">
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="gap-1.5"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? "Генерация..." : "Скачать PDF"}
          </Button>
        </div>
      </div>

      {/* Calculation Basis */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
          Исходные данные расчёта
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <BasisItem
            label="Объём операций"
            value={`${formatNumber(rollout?.operationsPerMonth ?? 100, 0)} / мес.`}
          />
          <BasisItem label="Рост объёма" value={growthLabel} />
          <BasisItem
            label="Раскатка ИИ"
            value={`${rolloutLabel}, ${rolloutDetail}`}
          />
          {result.totalCapex > 0 && (
            <BasisItem label="Инвестиции (CAPEX)" value={`${formatMoney(result.totalCapex)} ₽`} />
          )}
          {result.totalOpexPerMonth > 0 && (
            <BasisItem
              label="Затраты (OPEX)"
              value={`${formatMoney(result.totalOpexPerMonth)} ₽/мес.`}
            />
          )}
        </div>
      </div>

      {/* KPI Groups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Group 1: Per operation */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
            На операцию
          </p>
          <Card className="border-0 shadow-sm flex-1">
            <CardContent className="pt-4 pb-4 flex flex-col gap-3">
              <KpiRow
                label="Экономия на операцию"
                value={`${formatMoney(result.totalSavingsPerOperation)} ₽`}
                valueClass="text-blue-600 font-bold text-base"
                main
              />
              <div className="border-t border-gray-100 pt-2 flex flex-col gap-2">
                <KpiRow
                  label="из них: процесс"
                  value={`${formatMoney(result.processSavingsPerOperation)} ₽`}
                  valueClass="text-gray-700 font-medium text-sm"
                />
                <KpiRow
                  label="из них: риски"
                  value={`${formatMoney(result.errorSavingsPerOperation)} ₽`}
                  valueClass="text-gray-700 font-medium text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Group 2: At scale */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
            В масштабе
          </p>
          <Card className="border-0 shadow-sm flex-1">
            <CardContent className="pt-4 pb-4 flex flex-col gap-3">
              <KpiRow
                label="Операций с ИИ / мес. (при полной раскатке)"
                value={formatNumber(result.operationsAtFullRollout, 0)}
                valueClass="text-blue-600 font-bold text-base"
                main
              />
              <div className="border-t border-gray-100 pt-2 flex flex-col gap-2">
                <KpiRow
                  label="Выгода/мес. при полной раскатке"
                  value={`${formatMoney(result.monthlyBenefitAtFullRollout)} ₽`}
                  valueClass="text-gray-700 font-medium text-sm"
                />
                <KpiRow
                  label="Экономия за 1-й год (с учётом раскатки)"
                  value={`${formatMoney(result.annualSavings)} ₽`}
                  valueClass="text-gray-700 font-medium text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Group 3: Summary */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
            Итог
          </p>
          <Card className="border-0 shadow-sm flex-1">
            <CardContent className="pt-4 pb-4 flex flex-col gap-3">
              <KpiRow
                label="ROI за 12 месяцев"
                value={formatPercent(result.roi12months)}
                valueClass={`font-bold text-base ${result.roi12months >= 0 ? "text-green-600" : "text-red-600"}`}
                main
              />
              <div className="border-t border-gray-100 pt-2 flex flex-col gap-2">
                <KpiRow
                  label="Точка окупаемости"
                  value={result.breakEvenMonth ? `${result.breakEvenMonth} мес.` : "Не достигается"}
                  valueClass={`font-medium text-sm ${result.breakEvenMonth ? "text-green-600" : "text-gray-400"}`}
                />
                {result.totalCapex > 0 && (
                  <KpiRow
                    label="Инвестиции (CAPEX)"
                    value={`${formatMoney(result.totalCapex)} ₽`}
                    valueClass="text-gray-700 font-medium text-sm"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Productivity multipliers */}
      {(result.timeMultiplier !== null || result.costMultiplier !== null || result.calendarMultiplier !== null) && (
        <div className={`grid gap-3 ${result.calendarMultiplier !== null ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>
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
      )}

      {/* Charts */}
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Динамика окупаемости</h3>
          <RoiChart data={result.monthlyData} breakEvenMonth={result.breakEvenMonth} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Помесячная экономия</h3>
          <MonthlySavingsChart data={result.monthlyData} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Кривая раскатки</h3>
            <RolloutChart
              rolloutConfig={calculation.rolloutConfig ?? {
                id: "",
                calculationId: calculation.id,
                model: "LINEAR",
                rolloutMonths: 6,
                targetShare: 1,
                operationsPerMonth: 100,
                growthEnabled: false,
                growthType: "COMPOUND",
                growthRate: 0,
                growthCeiling: null,
              }}
              horizonMonths={parseInt(horizon)}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Сравнение AS-IS vs TO-BE</h3>
            <ComparisonChart calculation={calculation} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BasisItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-400 leading-tight">{label}</span>
      <span className="text-sm font-semibold text-gray-700">{value}</span>
    </div>
  );
}

function KpiRow({
  label,
  value,
  valueClass,
  main,
}: {
  label: string;
  value: string;
  valueClass: string;
  main?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={`text-gray-500 leading-tight ${main ? "text-xs" : "text-xs"}`}>{label}</span>
      <span className={`shrink-0 ${valueClass}`}>{value}</span>
    </div>
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
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${colors[color]}`}>в {value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        <div className="flex items-center gap-1.5 mt-2 text-xs">
          <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">{before}</span>
          <span className="text-gray-400">→</span>
          <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium">{after}</span>
        </div>
      </CardContent>
    </Card>
  );
}
