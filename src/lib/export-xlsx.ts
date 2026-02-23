import * as XLSX from "xlsx";
import type { Calculation, ProcessStep, ErrorItem, CapexItem, OpexItem } from "@/types";
import { computeProcessStep, sumProcessSteps } from "@/lib/calculations/process-savings";
import { computeErrorItem, sumErrorItems } from "@/lib/calculations/error-savings";

function processStepsSheet(steps: ProcessStep[]): XLSX.WorkSheet {
  const header = [
    "#",
    "Этап",
    "Сотрудник",
    "Цена часа, ₽",
    "Время, ч",
    "Срок, дн",
    "Доп. затраты, ₽",
    "Стоимость этапа, ₽",
    "Доля, %",
    "Удельное время, ч",
    "Удельная стоимость, ₽",
  ];

  const computed = steps.map(computeProcessStep);
  const rows = computed.map((s, i) => [
    i + 1,
    s.name,
    s.employee,
    s.hourlyRate,
    s.timeHours,
    s.calendarDays,
    s.extraCost,
    s.stepCost ?? 0,
    Math.round(s.executionShare * 100 * 100) / 100,
    s.unitTime ?? 0,
    s.unitCost ?? 0,
  ]);

  const totals = sumProcessSteps(computed);
  const totalsRow = [
    "Итого",
    "",
    "",
    "",
    totals.totalTimeHours,
    totals.totalCalendarDays,
    "",
    "",
    "",
    totals.totalUnitTime,
    totals.totalUnitCost,
  ];

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows, totalsRow]);
  ws["!cols"] = [
    { wch: 4 },
    { wch: 40 },
    { wch: 20 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 18 },
    { wch: 20 },
    { wch: 10 },
    { wch: 18 },
    { wch: 22 },
  ];
  return ws;
}

function errorItemsSheet(items: ErrorItem[]): XLSX.WorkSheet {
  const header = [
    "#",
    "Тип риска",
    "Сотрудник",
    "Цена часа, ₽",
    "Время, ч",
    "Срок, дн",
    "Доп. затраты, ₽",
    "Стоимость риска, ₽",
    "Вероятность, %",
    "Удельная стоимость, ₽",
    "Удельное время, ч",
  ];

  const computed = items.map(computeErrorItem);
  const rows = computed.map((e, i) => [
    i + 1,
    e.name,
    e.employee,
    e.hourlyRate,
    e.timeHours,
    e.calendarDays,
    e.extraCost,
    e.riskCost ?? 0,
    Math.round(e.frequency * 100 * 100) / 100,
    e.unitErrorCost ?? 0,
    e.unitErrorTime ?? 0,
  ]);

  const totals = sumErrorItems(computed);
  const totalsRow = [
    "Итого",
    "",
    "",
    "",
    totals.totalTimeHours,
    totals.totalCalendarDays,
    "",
    "",
    "",
    totals.totalUnitErrorCost,
    totals.totalUnitErrorTime,
  ];

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows, totalsRow]);
  ws["!cols"] = [
    { wch: 4 },
    { wch: 40 },
    { wch: 20 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
    { wch: 22 },
    { wch: 18 },
  ];
  return ws;
}

function capexSheet(items: CapexItem[]): XLSX.WorkSheet {
  const header = ["#", "Статья затрат", "Сумма, ₽", "Комментарий"];
  const rows = items.map((item, i) => [i + 1, item.name, item.amount, item.comment ?? ""]);
  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const totalsRow = ["Итого CAPEX", "", total, ""];

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows, totalsRow]);
  ws["!cols"] = [{ wch: 4 }, { wch: 40 }, { wch: 18 }, { wch: 40 }];
  return ws;
}

function opexSheet(items: OpexItem[]): XLSX.WorkSheet {
  const header = ["#", "Статья затрат", "Стоимость в месяц, ₽", "Комментарий"];
  const rows = items.map((item, i) => [i + 1, item.name, item.monthlyAmount, item.comment ?? ""]);
  const total = items.reduce((sum, i) => sum + i.monthlyAmount, 0);
  const totalsRow = ["Итого в месяц", "", total, ""];

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows, totalsRow]);
  ws["!cols"] = [{ wch: 4 }, { wch: 40 }, { wch: 22 }, { wch: 40 }];
  return ws;
}

function rolloutSheet(data: Calculation): XLSX.WorkSheet {
  const cfg = data.rolloutConfig;
  if (!cfg) {
    return XLSX.utils.aoa_to_sheet([["Параметр", "Значение"], ["Данные отсутствуют", ""]]);
  }

  const modelLabel: Record<string, string> = {
    LINEAR: "Линейная",
    S_CURVE: "S-кривая",
    INSTANT: "Моментальная",
  };
  const growthTypeLabel: Record<string, string> = {
    COMPOUND: "Процентный рост",
    LINEAR_ABS: "Линейный прирост",
  };

  const rows: (string | number | boolean)[][] = [
    ["Параметр", "Значение"],
    ["Модель раскатки", modelLabel[cfg.model] ?? cfg.model],
    ["Операций в месяц", cfg.operationsPerMonth],
    ["Целевая доля операций, %", Math.round(cfg.targetShare * 100)],
  ];

  if (cfg.model !== "INSTANT") {
    rows.push(["Срок полной раскатки, мес.", cfg.rolloutMonths]);
  }

  rows.push(["Рост объёма операций", cfg.growthEnabled ? "Да" : "Нет"]);

  if (cfg.growthEnabled) {
    rows.push(["Тип роста", growthTypeLabel[cfg.growthType] ?? cfg.growthType]);
    rows.push([
      cfg.growthType === "COMPOUND" ? "Рост в месяц, %" : "Прирост операций в месяц",
      cfg.growthRate,
    ]);
    rows.push(["Потолок операций", cfg.growthCeiling ?? "Без ограничений"]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 32 }, { wch: 24 }];
  return ws;
}

export function exportCalculationToXlsx(data: Calculation): void {
  const wb = XLSX.utils.book_new();

  const asisSteps = data.processSteps.filter((s) => s.type === "AS_IS");
  const tobeSteps = data.processSteps.filter((s) => s.type === "TO_BE");
  const asisErrors = data.errorItems.filter((e) => e.type === "AS_IS");
  const tobeErrors = data.errorItems.filter((e) => e.type === "TO_BE");

  XLSX.utils.book_append_sheet(wb, processStepsSheet(asisSteps), "Процесс AS-IS");
  XLSX.utils.book_append_sheet(wb, processStepsSheet(tobeSteps), "Процесс TO-BE");
  XLSX.utils.book_append_sheet(wb, errorItemsSheet(asisErrors), "Риски AS-IS");
  XLSX.utils.book_append_sheet(wb, errorItemsSheet(tobeErrors), "Риски TO-BE");
  XLSX.utils.book_append_sheet(wb, rolloutSheet(data), "Раскатка");
  XLSX.utils.book_append_sheet(wb, capexSheet(data.capexItems), "CAPEX");
  XLSX.utils.book_append_sheet(wb, opexSheet(data.opexItems), "OPEX");

  const safeName = data.name.replace(/[\/\\?*\[\]]/g, "_").slice(0, 50);
  XLSX.writeFile(wb, `ROI_${safeName}.xlsx`);
}
