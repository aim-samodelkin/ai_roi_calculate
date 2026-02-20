"use client";

import { useRef, useState } from "react";
import { ProcessStep, ProcessType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { computeProcessStep, sumProcessSteps } from "@/lib/calculations/process-savings";
import { formatNumber } from "@/lib/format";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const dragSrcIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

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

  const handleDragStart = (idx: number) => {
    dragSrcIdx.current = idx;
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragSrcIdx.current === null || dragSrcIdx.current === idx) {
      setDragOverIdx(null);
      return;
    }
    const next = [...steps];
    const [moved] = next.splice(dragSrcIdx.current, 1);
    next.splice(idx, 0, moved);
    onChange(next.map((s, i) => ({ ...s, order: i })));
    dragSrcIdx.current = null;
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    dragSrcIdx.current = null;
    setDragOverIdx(null);
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
              <th className="w-6"></th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-8">#</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[160px]">Этап</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[130px]">Сотрудник</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-28">Цена часа, ₽</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-24">Время, ч</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-24">Дни</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-24">Стоимость шага, ₽</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-24">Доля, %</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-28">Удельная стоимость, ₽</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step, idx) => {
              const computed = computeProcessStep(step);
              const isDragOver = dragOverIdx === idx && dragSrcIdx.current !== idx;
              return (
                <tr
                  key={step.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "border-b hover:bg-gray-50 transition-colors",
                    isDragOver && "bg-blue-50 border-blue-300"
                  )}
                >
                  <td className="pl-2 py-2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
                    <GripVertical size={14} />
                  </td>
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
                    <DecimalInput
                      value={step.hourlyRate || 0}
                      onChange={(v) => updateRow(idx, "hourlyRate", v)}
                      className="h-8 text-sm"
                      clamp
                      min={0}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <DecimalInput
                      value={step.timeHours || 0}
                      onChange={(v) => updateRow(idx, "timeHours", v)}
                      className="h-8 text-sm"
                      clamp
                      min={0}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <DecimalInput
                      value={step.calendarDays || 0}
                      onChange={(v) => updateRow(idx, "calendarDays", v)}
                      className="h-8 text-sm"
                      clamp
                      min={0}
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700 font-medium">
                    {formatNumber(computed.stepCost ?? 0, 1, 1)}
                  </td>
                  <td className="px-3 py-2">
                    <DecimalInput
                      value={Math.round(step.executionShare * 100 * 100) / 100}
                      onChange={(v) => updateRow(idx, "executionShare", Math.min(100, Math.max(0, v)) / 100)}
                      className="h-8 text-sm"
                      clamp
                      min={0}
                      max={100}
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700 font-medium">
                    {formatNumber(computed.unitCost ?? 0, 1, 1)}
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
                {formatNumber(totals.totalTimeHours)} ч
              </td>
              <td className="px-3 py-2.5 text-right text-gray-700">
                {formatNumber(totals.totalCalendarDays)} дн.
              </td>
              <td></td>
              <td></td>
              <td className="px-3 py-2.5 text-right text-blue-700 font-semibold">
                {formatNumber(totals.totalUnitCost, 1, 1)}
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
