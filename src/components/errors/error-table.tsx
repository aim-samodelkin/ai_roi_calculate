"use client";

import { useEffect, useRef, useState } from "react";
import { ErrorItem, ProcessType, TimeUnit } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DecimalInput } from "@/components/ui/decimal-input";
import { computeErrorItem, sumErrorItems } from "@/lib/calculations/error-savings";
import { formatMoney, formatNumber } from "@/lib/format";
import { GripVertical } from "lucide-react";
import { cn, generateId } from "@/lib/utils";
import { AiGenerateDialog } from "@/components/ai/ai-generate-dialog";
import type { GenerateContext } from "@/lib/ai/prompts";

const EMPTY_ERROR = (calculationId: string, type: ProcessType, order: number): ErrorItem => ({
  id: generateId(),
  calculationId,
  type,
  order,
  name: "",
  employee: "",
  hourlyRate: 0,
  timeHours: 0,
  timeUnit: "hours",
  calendarDays: 0,
  extraCost: 0,
  frequency: 1,
});

interface Props {
  items: ErrorItem[];
  type: ProcessType;
  asisItems?: ErrorItem[];
  onChange: (items: ErrorItem[]) => void;
  aiContext?: GenerateContext;
  readOnly?: boolean;
}

export function ErrorTable({ items, type, asisItems, onChange, aiContext, readOnly }: Props) {
  const calculationId = items[0]?.calculationId ?? "";
  const dragSrcIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.querySelectorAll("textarea").forEach((ta) => {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    });
  }, [items]);

  const addRow = () => {
    onChange([...items, EMPTY_ERROR(calculationId, type, items.length)]);
  };

  const removeRow = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })));
  };

  const updateRow = (idx: number, field: keyof ErrorItem, value: string | number) => {
    onChange(items.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const copyFromAsis = () => {
    if (!asisItems) return;
    onChange(
      asisItems.map((e) => ({
        ...e,
        id: generateId(),
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
    const next = [...items];
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

  const totals = sumErrorItems(items.map(computeErrorItem));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {type === "AS_IS" ? "Риски процесса AS-IS" : "Риски процесса TO-BE"}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {type === "AS_IS"
              ? "Типичные риски текущего процесса: кто исправляет, сколько времени и денег тратится"
              : "Риски, которые останутся после внедрения ИИ (сниженная вероятность / стоимость)"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && aiContext && (
            <AiGenerateDialog
              tabType={type === "AS_IS" ? "errors_asis" : "errors_tobe"}
              context={aiContext}
              hasExistingData={items.length > 0}
              onApply={(generated) => onChange(generated as ErrorItem[])}
            />
          )}
          {!readOnly && type === "TO_BE" && asisItems && asisItems.length > 0 && (
            <Button variant="outline" size="sm" onClick={copyFromAsis}>
              Скопировать из AS-IS
            </Button>
          )}
        </div>
      </div>

      <div ref={tableRef} className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              {!readOnly && <th className="w-6"></th>}
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-8">#</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[200px]">Тип риска</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[90px]">Сотрудник</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-24">Цена часа, ₽</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 min-w-[120px]">Время</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-24">Дни</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 min-w-[120px]">Доп. затраты, ₽</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-28">Стоим. риска, ₽</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-24">Вероят., %</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-28">Удельная стоим., ₽</th>
              {!readOnly && <th className="w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const computed = computeErrorItem(item);
              const isDragOver = !readOnly && dragOverIdx === idx && dragSrcIdx.current !== idx;
              return (
                <tr
                  key={item.id}
                  draggable={!readOnly}
                  onDragStart={!readOnly ? () => handleDragStart(idx) : undefined}
                  onDragOver={!readOnly ? (e) => handleDragOver(e, idx) : undefined}
                  onDrop={!readOnly ? () => handleDrop(idx) : undefined}
                  onDragEnd={!readOnly ? handleDragEnd : undefined}
                  className={cn(
                    "border-b hover:bg-gray-50 transition-colors",
                    isDragOver && "bg-blue-50 border-blue-300"
                  )}
                >
                  {!readOnly && (
                    <td className="pl-2 py-2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
                      <GripVertical size={14} />
                    </td>
                  )}
                  <td className="px-3 py-2 text-gray-400 text-center">{idx + 1}</td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span className="text-sm text-gray-900">{item.name}</span>
                    ) : (
                      <Textarea
                        value={item.name}
                        onChange={(e) => {
                          updateRow(idx, "name", e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onFocus={(e) => {
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        placeholder="Описание риска"
                        rows={1}
                        className="min-h-8 h-8 text-sm resize-none overflow-hidden py-1.5 leading-snug"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span className="text-sm text-gray-700">{item.employee}</span>
                    ) : (
                      <Textarea
                        value={item.employee}
                        onChange={(e) => {
                          updateRow(idx, "employee", e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onFocus={(e) => {
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        placeholder="Роль / должность"
                        rows={1}
                        className="min-h-8 h-8 text-sm resize-none overflow-hidden py-1.5 leading-snug"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {readOnly ? (
                      <span className="text-sm text-gray-700">{formatNumber(item.hourlyRate)}</span>
                    ) : (
                      <DecimalInput
                        value={item.hourlyRate || 0}
                        onChange={(v) => updateRow(idx, "hourlyRate", v)}
                        className="h-8 text-sm"
                        clamp
                        min={0}
                        thousands
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span className="text-sm text-gray-700 float-right">
                        {item.timeUnit === "minutes"
                          ? `${Math.round(item.timeHours * 60 * 100) / 100} мин`
                          : `${formatNumber(item.timeHours)} ч`}
                      </span>
                    ) : (
                      <div className="flex h-8">
                        <DecimalInput
                          value={
                            item.timeUnit === "minutes"
                              ? Math.round(item.timeHours * 60 * 100) / 100
                              : item.timeHours || 0
                          }
                          onChange={(v) => {
                            const hours = item.timeUnit === "minutes" ? v / 60 : v;
                            updateRow(idx, "timeHours", hours);
                          }}
                          className="h-8 text-sm rounded-r-none border-r-0 flex-1 min-w-[4ch]"
                          clamp
                          min={0}
                        />
                        <select
                          value={item.timeUnit ?? "hours"}
                          onChange={(e) => updateRow(idx, "timeUnit", e.target.value as TimeUnit)}
                          className="h-8 px-1 text-xs border border-input rounded-r-md bg-background text-gray-600 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                        >
                          <option value="hours">ч</option>
                          <option value="minutes">мин</option>
                        </select>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {readOnly ? (
                      <span className="text-sm text-gray-700">{formatNumber(item.calendarDays)}</span>
                    ) : (
                      <DecimalInput
                        value={item.calendarDays || 0}
                        onChange={(v) => updateRow(idx, "calendarDays", v)}
                        className="h-8 text-sm"
                        clamp
                        min={0}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {readOnly ? (
                      <span className="text-sm text-gray-700">{formatNumber(item.extraCost)}</span>
                    ) : (
                      <DecimalInput
                        value={item.extraCost || 0}
                        onChange={(v) => updateRow(idx, "extraCost", v)}
                        className="h-8 text-sm min-w-[6ch]"
                        clamp
                        min={0}
                        thousands
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700 font-medium">
                    {formatNumber(computed.riskCost ?? 0, 1, 1)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {readOnly ? (
                      <span className="text-sm text-gray-700">
                        {Math.round(item.frequency * 100 * 100) / 100}%
                      </span>
                    ) : (
                      <DecimalInput
                        value={Math.round(item.frequency * 100 * 100) / 100}
                        onChange={(v) => updateRow(idx, "frequency", Math.min(100, Math.max(0, v)) / 100)}
                        className="h-8 text-sm"
                        clamp
                        min={0}
                        max={100}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700 font-medium">
                    {formatNumber(computed.unitErrorCost ?? 0, 1, 1)}
                  </td>
                  {!readOnly && (
                    <td className="px-3 py-2">
                      <button
                        onClick={() => removeRow(idx)}
                        className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                      >
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t font-medium">
              <td colSpan={readOnly ? 4 : 5} className="px-3 py-2.5 text-gray-700">Итого</td>
              <td className="px-3 py-2.5 text-right text-gray-700">
                {formatNumber(totals.totalTimeHours)} ч
              </td>
              <td className="px-3 py-2.5 text-right text-gray-700"></td>
              <td></td>
              <td></td>
              <td></td>
              <td className="px-3 py-2.5 text-right text-blue-700 font-semibold">
                {formatMoney(totals.totalUnitErrorCost)}
              </td>
              {!readOnly && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-between">
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addRow}>
            + Добавить риск
          </Button>
        )}
        {items.length > 0 && (
          <div className="text-sm text-gray-500">
            Удельный срок: <span className="font-medium">{formatNumber(totals.totalUnitCalendarDays)} дн.</span>
          </div>
        )}
      </div>
    </div>
  );
}
