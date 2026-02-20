"use client";

import { ProcessStep, ProcessType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computeProcessStep, sumProcessSteps } from "@/lib/calculations/process-savings";
import { formatMoney, formatNumber } from "@/lib/format";

const EMPTY_STEP = (calculationId: string, type: ProcessType, order: number): ProcessStep => ({
  id: crypto.randomUUID(),
  calculationId,
  type,
  order,
  name: "",
  employee: "",
  hourlyRate: 0,
  timeHours: 0,
  calendarDays: 0,
  executionShare: 1,
});

interface Props {
  steps: ProcessStep[];
  type: ProcessType;
  asisSteps?: ProcessStep[];
  onChange: (steps: ProcessStep[]) => void;
}

export function ProcessTable({ steps, type, asisSteps, onChange }: Props) {
  const calculationId = steps[0]?.calculationId ?? "";

  const addRow = () => {
    onChange([...steps, EMPTY_STEP(calculationId, type, steps.length)]);
  };

  const removeRow = (idx: number) => {
    const next = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i }));
    onChange(next);
  };

  const updateRow = (idx: number, field: keyof ProcessStep, value: string | number) => {
    const next = steps.map((s, i) =>
      i === idx ? { ...s, [field]: value } : s
    );
    onChange(next);
  };

  const copyFromAsis = () => {
    if (!asisSteps) return;
    onChange(
      asisSteps.map((s) => ({
        ...s,
        id: crypto.randomUUID(),
        type: "TO_BE" as ProcessType,
      }))
    );
  };

  const totals = sumProcessSteps(steps.map(computeProcessStep));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {type === "AS_IS" ? "Процесс AS-IS — текущее состояние" : "Процесс TO-BE — целевое состояние с ИИ"}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {type === "AS_IS"
              ? "Опишите этапы текущего процесса с трудозатратами"
              : "Опишите, как изменится процесс после внедрения ИИ"}
          </p>
        </div>
        {type === "TO_BE" && asisSteps && asisSteps.length > 0 && (
          <Button variant="outline" size="sm" onClick={copyFromAsis}>
            Скопировать из AS-IS
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-8">#</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[160px]">Этап</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[130px]">Сотрудник</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-28">Цена часа, ₽</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-24">Время, ч</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-24">Дни</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-24">Стоимость шага, ₽</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-20">Доля</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-28">Удельная стоимость, ₽</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step, idx) => {
              const computed = computeProcessStep(step);
              return (
                <tr key={step.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400 text-center">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <Input
                      value={step.name}
                      onChange={(e) => updateRow(idx, "name", e.target.value)}
                      placeholder="Название этапа"
                      className="h-8 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={step.employee}
                      onChange={(e) => updateRow(idx, "employee", e.target.value)}
                      placeholder="Роль / должность"
                      className="h-8 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={step.hourlyRate || ""}
                      onChange={(e) => updateRow(idx, "hourlyRate", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm text-right"
                      min={0}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={step.timeHours || ""}
                      onChange={(e) => updateRow(idx, "timeHours", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm text-right"
                      min={0}
                      step={0.5}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={step.calendarDays || ""}
                      onChange={(e) => updateRow(idx, "calendarDays", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm text-right"
                      min={0}
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700 font-medium">
                    {formatMoney(computed.stepCost ?? 0)}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={step.executionShare}
                      onChange={(e) =>
                        updateRow(idx, "executionShare", Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)))
                      }
                      className="h-8 text-sm text-right"
                      min={0}
                      max={1}
                      step={0.1}
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700 font-medium">
                    {formatMoney(computed.unitCost ?? 0)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t font-medium">
              <td colSpan={5} className="px-3 py-2.5 text-gray-700">Итого</td>
              <td className="px-3 py-2.5 text-right text-gray-700">
                {formatNumber(totals.totalCalendarDays)} дн.
              </td>
              <td></td>
              <td></td>
              <td className="px-3 py-2.5 text-right text-blue-700 font-semibold">
                {formatMoney(totals.totalUnitCost)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addRow}>
          + Добавить этап
        </Button>
        <div className="text-sm text-gray-500">
          Удельное время: <span className="font-medium">{formatNumber(totals.totalUnitTime)} ч</span>
        </div>
      </div>
    </div>
  );
}
