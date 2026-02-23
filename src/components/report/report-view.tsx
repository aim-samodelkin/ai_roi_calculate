"use client";

import { useEffect, useState } from "react";
import { Calculation } from "@/types";
import { calcRoi } from "@/lib/calculations/roi";
import {
  formatMoney,
  formatNumber,
  formatMultiplier,
  formatPercent,
} from "@/lib/format";
import { RoiChart } from "@/components/charts/roi-chart";
import { MonthlySavingsChart } from "@/components/charts/monthly-savings-chart";
import { RolloutChart } from "@/components/charts/rollout-chart";
import { ComparisonChart } from "@/components/charts/comparison-chart";

interface Props {
  calculation: Calculation;
  horizonMonths: number;
}

const ROLLOUT_MODEL_LABELS: Record<string, string> = {
  INSTANT: "Мгновенная",
  LINEAR: "Линейная",
  S_CURVE: "S-кривая",
};

export function ReportView({ calculation, horizonMonths }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const result = calcRoi(calculation, horizonMonths);
  const rollout = calculation.rolloutConfig;
  const rolloutLabel = rollout
    ? (ROLLOUT_MODEL_LABELS[rollout.model] ?? rollout.model)
    : "Линейная";
  const rolloutDetail =
    rollout?.model === "INSTANT"
      ? `→ ${Math.round((rollout?.targetShare ?? 1) * 100)}%`
      : `${rollout?.rolloutMonths ?? 6} мес. → ${Math.round((rollout?.targetShare ?? 1) * 100)}%`;

  const growthLabel = rollout?.growthEnabled
    ? rollout.growthType === "COMPOUND"
      ? `+${formatNumber(rollout.growthRate * 100, 1)}%/мес.`
      : `+${formatNumber(rollout.growthRate, 0)}/мес.`
    : "Без роста";

  const defaultRollout = rollout ?? {
    id: "",
    calculationId: calculation.id,
    model: "LINEAR" as const,
    rolloutMonths: 6,
    targetShare: 1,
    operationsPerMonth: 100,
    growthEnabled: false,
    growthType: "COMPOUND" as const,
    growthRate: 0,
    growthCeiling: null,
  };

  const formattedDate = new Date(calculation.updatedAt).toLocaleDateString(
    "ru-RU",
    { day: "numeric", month: "long", year: "numeric" }
  );

  const hasMultipliers =
    result.timeMultiplier !== null ||
    result.costMultiplier !== null ||
    result.calendarMultiplier !== null;

  return (
    <div
      data-pdf-ready={ready ? "true" : undefined}
      style={{ fontFamily: "Inter, system-ui, sans-serif", padding: "0 24px 24px" }}
    >
      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>
          {calculation.name}
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
          Расчёт ROI · Горизонт {horizonMonths} месяцев · {formattedDate}
        </p>
      </div>

      {/* Basis */}
      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 20,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 8,
          }}
        >
          Исходные данные расчёта
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px" }}>
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
            <BasisItem
              label="Инвестиции (CAPEX)"
              value={`${formatMoney(result.totalCapex)} ₽`}
            />
          )}
          {result.totalOpexPerMonth > 0 && (
            <BasisItem
              label="Затраты (OPEX)"
              value={`${formatMoney(result.totalOpexPerMonth)} ₽/мес.`}
            />
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Per operation */}
        <KpiCard title="На операцию">
          <KpiRow
            label="Экономия на операцию"
            value={`${formatMoney(result.totalSavingsPerOperation)} ₽`}
            valueColor="#2563eb"
            bold
            large
          />
          <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 8, marginTop: 4 }}>
            <KpiRow
              label="из них: процесс"
              value={`${formatMoney(result.processSavingsPerOperation)} ₽`}
            />
            <KpiRow
              label="из них: риски"
              value={`${formatMoney(result.errorSavingsPerOperation)} ₽`}
            />
          </div>
        </KpiCard>

        {/* At scale */}
        <KpiCard title="В масштабе">
          <KpiRow
            label="Операций с ИИ / мес. (полная раскатка)"
            value={formatNumber(result.operationsAtFullRollout, 0)}
            valueColor="#2563eb"
            bold
            large
          />
          <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 8, marginTop: 4 }}>
            <KpiRow
              label="Выгода/мес. при полной раскатке"
              value={`${formatMoney(result.monthlyBenefitAtFullRollout)} ₽`}
            />
            <KpiRow
              label="Экономия за 1-й год"
              value={`${formatMoney(result.annualSavings)} ₽`}
            />
          </div>
        </KpiCard>

        {/* Summary */}
        <KpiCard title="Итог">
          <KpiRow
            label="ROI за 12 месяцев"
            value={formatPercent(result.roi12months)}
            valueColor={result.roi12months >= 0 ? "#16a34a" : "#dc2626"}
            bold
            large
          />
          <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 8, marginTop: 4 }}>
            <KpiRow
              label="Точка окупаемости"
              value={
                result.breakEvenMonth
                  ? `${result.breakEvenMonth} мес.`
                  : "Не достигается"
              }
              valueColor={result.breakEvenMonth ? "#16a34a" : "#9ca3af"}
            />
            {result.totalCapex > 0 && (
              <KpiRow
                label="Инвестиции (CAPEX)"
                value={`${formatMoney(result.totalCapex)} ₽`}
              />
            )}
          </div>
        </KpiCard>
      </div>

      {/* Multipliers */}
      {hasMultipliers && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: result.calendarMultiplier !== null ? "1fr 1fr 1fr" : "1fr 1fr",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {result.timeMultiplier !== null && (
            <MultiplierCard
              label="Рост производительности"
              value={formatMultiplier(result.timeMultiplier)}
              color="#16a34a"
              description="по человеко-часам на операцию"
              before={`${formatNumber(result.asisUnitTime)} ч`}
              after={`${formatNumber(result.tobeUnitTime)} ч`}
            />
          )}
          {result.costMultiplier !== null && (
            <MultiplierCard
              label="Снижение стоимости"
              value={formatMultiplier(result.costMultiplier)}
              color="#16a34a"
              description="удельная стоимость операции"
              before={`${formatMoney(result.asisUnitCost)} ₽`}
              after={`${formatMoney(result.tobeUnitCost)} ₽`}
            />
          )}
          {result.calendarMultiplier !== null && (
            <MultiplierCard
              label="Ускорение процесса"
              value={formatMultiplier(result.calendarMultiplier)}
              color="#2563eb"
              description="в календарных днях"
              before={`${formatNumber(result.asisCalendarDays, 1)} дн.`}
              after={`${formatNumber(result.tobeCalendarDays, 1)} дн.`}
            />
          )}
        </div>
      )}

      {/* Timeline Analysis */}
      {(result.asisCalendarDays > 0 || result.tobeCalendarDays > 0 || result.asisErrorCalendarDays > 0 || result.tobeErrorCalendarDays > 0) && (
        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 10,
            }}
          >
            Анализ сроков
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: (result.asisErrorCalendarDays > 0 || result.tobeErrorCalendarDays > 0) ? "1fr 1fr 1fr" : "1fr 1fr",
              gap: 12,
            }}
          >
            <TimelineCardPdf
              label="Длительность процесса"
              description="Сумма календарных сроков этапов"
              asis={result.asisCalendarDays}
              tobe={result.tobeCalendarDays}
            />
            {(result.asisErrorCalendarDays > 0 || result.tobeErrorCalendarDays > 0) && (
              <TimelineCardPdf
                label="Задержки из-за рисков"
                description="Ожидаемые задержки (срок × вероятность)"
                asis={result.asisErrorCalendarDays}
                tobe={result.tobeErrorCalendarDays}
              />
            )}
            <TimelineCardPdf
              label="Общий цикл операции"
              description="Процесс + ожидаемые задержки рисков"
              asis={result.asisTotalCycleDays}
              tobe={result.tobeTotalCycleDays}
              highlight
            />
          </div>
        </div>
      )}

      {/* Divider before charts */}
      <div
        style={{
          borderTop: "2px solid #e5e7eb",
          marginBottom: 24,
        }}
      />

      {/* Chart 1: ROI dynamics */}
      <ChartSection title="Динамика окупаемости">
        <RoiChart data={result.monthlyData} breakEvenMonth={result.breakEvenMonth} />
      </ChartSection>

      {/* Chart 2: Monthly savings */}
      <ChartSection title="Помесячная экономия">
        <MonthlySavingsChart data={result.monthlyData} />
      </ChartSection>

      {/* Chart 3: Rollout curve */}
      <ChartSection title="Кривая раскатки">
        <RolloutChart rolloutConfig={defaultRollout} horizonMonths={horizonMonths} />
      </ChartSection>

      {/* Chart 4: AS-IS vs TO-BE */}
      <ChartSection title="Сравнение AS-IS vs TO-BE">
        <ComparisonChart calculation={calculation} />
      </ChartSection>
    </div>
  );
}

function BasisItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 11, color: "#9ca3af" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{value}</span>
    </div>
  );
}

function KpiCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "12px 14px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "#9ca3af",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 10,
        }}
      >
        {title}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function KpiRow({
  label,
  value,
  valueColor = "#374151",
  bold = false,
  large = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
  large?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.3 }}>{label}</span>
      <span
        style={{
          fontSize: large ? 15 : 12,
          fontWeight: bold ? 700 : 500,
          color: valueColor,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
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
  color: string;
  description: string;
  before: string;
  after: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "12px 14px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color, margin: "2px 0" }}>
        в {value}
      </p>
      <p style={{ fontSize: 10, color: "#9ca3af", marginBottom: 6 }}>{description}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
        <span
          style={{
            padding: "2px 6px",
            borderRadius: 4,
            background: "#fef2f2",
            color: "#dc2626",
            fontWeight: 600,
          }}
        >
          {before}
        </span>
        <span style={{ color: "#9ca3af" }}>→</span>
        <span
          style={{
            padding: "2px 6px",
            borderRadius: 4,
            background: "#f0fdf4",
            color: "#16a34a",
            fontWeight: 600,
          }}
        >
          {after}
        </span>
      </div>
    </div>
  );
}

function TimelineCardPdf({
  label,
  description,
  asis,
  tobe,
  highlight = false,
}: {
  label: string;
  description: string;
  asis: number;
  tobe: number;
  highlight?: boolean;
}) {
  const maxVal = Math.max(asis, tobe, 0.01);
  const asisWidth = Math.round((asis / maxVal) * 100);
  const tobeWidth = Math.round((tobe / maxVal) * 100);
  const saving = asis - tobe;
  const savingPct = asis > 0 ? (saving / asis) * 100 : 0;
  const improved = saving > 0;
  const unchanged = Math.abs(saving) < 0.001;

  return (
    <div
      style={{
        background: "#fff",
        border: highlight ? "1px solid #bfdbfe" : "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "12px 14px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 10, color: "#9ca3af", marginBottom: 10 }}>{description}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: "#9ca3af", width: 36, flexShrink: 0 }}>AS-IS</span>
          <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 4, height: 6 }}>
            <div style={{ width: `${asisWidth}%`, background: "#f87171", borderRadius: 4, height: 6 }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#dc2626", width: 48, textAlign: "right", flexShrink: 0 }}>
            {formatNumber(asis, 1)} дн.
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: "#9ca3af", width: 36, flexShrink: 0 }}>TO-BE</span>
          <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 4, height: 6 }}>
            <div style={{ width: `${tobeWidth}%`, background: "#4ade80", borderRadius: 4, height: 6 }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#16a34a", width: 48, textAlign: "right", flexShrink: 0 }}>
            {formatNumber(tobe, 1)} дн.
          </span>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 6, marginTop: 8 }}>
        {unchanged ? (
          <span style={{ fontSize: 10, color: "#9ca3af" }}>Без изменений</span>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 600, color: improved ? "#16a34a" : "#dc2626" }}>
            {improved ? "−" : "+"}{formatNumber(Math.abs(saving), 1)} дн.{" "}
            ({improved ? "−" : "+"}{formatNumber(Math.abs(savingPct), 1)}%)
          </span>
        )}
      </div>
    </div>
  );
}

function ChartSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24, breakInside: "avoid" }}>
      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#374151",
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}
