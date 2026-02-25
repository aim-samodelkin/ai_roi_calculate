"use client";

import { useEffect, useRef, useState } from "react";
import { OpexItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DecimalInput } from "@/components/ui/decimal-input";
import { formatMoney } from "@/lib/format";
import { AiGenerateDialog } from "@/components/ai/ai-generate-dialog";
import type { GenerateContext } from "@/lib/ai/prompts";
import { cn, generateId } from "@/lib/utils";
import { GripVertical } from "lucide-react";

const EMPTY_OPEX = (calculationId: string, order: number): OpexItem => ({
  id: generateId(),
  calculationId,
  order,
  name: "",
  monthlyAmount: 0,
  comment: "",
});

interface Props {
  items: OpexItem[];
  calculationId: string;
  onChange: (items: OpexItem[]) => void;
  aiContext?: GenerateContext;
  readOnly?: boolean;
}

export function OpexTable({ items, calculationId, onChange, aiContext, readOnly }: Props) {
  const tableRef = useRef<HTMLDivElement>(null);
  const dragSrcIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const canDrag = useRef(false);

  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.querySelectorAll("textarea").forEach((ta) => {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    });
  }, [items]);

  useEffect(() => {
    const reset = () => { canDrag.current = false; };
    document.addEventListener("mouseup", reset);
    return () => document.removeEventListener("mouseup", reset);
  }, []);

  const addRow = () => {
    onChange([...items, EMPTY_OPEX(calculationId, items.length)]);
  };

  const removeRow = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })));
  };

  const updateRow = (idx: number, field: keyof OpexItem, value: string | number) => {
    onChange(items.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
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

  const totalMonthly = items.reduce((sum, i) => sum + i.monthlyAmount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">OPEX — ежемесячные затраты</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Регулярные расходы на поддержку ИИ-решения: API, облако, техподдержка, сопровождение
          </p>
        </div>
        {!readOnly && aiContext && (
          <AiGenerateDialog
            tabType="opex"
            context={aiContext}
            hasExistingData={items.length > 0}
            onApply={(generated) => {
              const withCalcId = (generated as OpexItem[]).map((o) => ({
                ...o,
                calculationId,
              }));
              onChange(withCalcId);
            }}
          />
        )}
      </div>

      <div ref={tableRef} className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              {!readOnly && <th className="w-6"></th>}
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-8">#</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[200px]">Статья затрат</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-40">Стоимость в месяц, ₽</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Комментарий</th>
              {!readOnly && <th className="w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isDragOver = !readOnly && dragOverIdx === idx && dragSrcIdx.current !== idx;
              return (
              <tr
                key={item.id}
                draggable={!readOnly}
                onDragStart={!readOnly ? (e) => {
                  if (!canDrag.current) { e.preventDefault(); return; }
                  handleDragStart(idx);
                } : undefined}
                onDragOver={!readOnly ? (e) => handleDragOver(e, idx) : undefined}
                onDrop={!readOnly ? () => handleDrop(idx) : undefined}
                onDragEnd={!readOnly ? handleDragEnd : undefined}
                className={cn(
                  "border-b hover:bg-gray-50 transition-colors",
                  isDragOver && "bg-blue-50 border-blue-300"
                )}
              >
                {!readOnly && (
                  <td
                    className="pl-2 py-2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
                    onMouseDown={() => { canDrag.current = true; }}
                    onMouseUp={() => { canDrag.current = false; }}
                  >
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
                      placeholder="Напр.: подписка на AI API"
                      rows={1}
                      className="min-h-8 h-8 text-sm resize-none overflow-hidden py-1.5 leading-snug"
                    />
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {readOnly ? (
                    <span className="text-sm text-gray-700 font-medium">{formatMoney(item.monthlyAmount)}</span>
                  ) : (
                    <DecimalInput
                      value={item.monthlyAmount || 0}
                      onChange={(v) => updateRow(idx, "monthlyAmount", v)}
                      className="h-8 text-sm"
                      clamp
                      min={0}
                      thousands
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    <span className="text-sm text-gray-500">{item.comment}</span>
                  ) : (
                    <Textarea
                      value={item.comment ?? ""}
                      onChange={(e) => {
                        updateRow(idx, "comment", e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onFocus={(e) => {
                        e.target.style.height = "auto";
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      placeholder="Необязательно"
                      rows={1}
                      className="min-h-8 h-8 text-sm resize-none overflow-hidden py-1.5 leading-snug"
                    />
                  )}
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
          {items.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t font-medium">
                <td colSpan={readOnly ? 2 : 3} className="px-3 py-2.5 text-gray-700">Итого в месяц</td>
                <td className="px-3 py-2.5 text-right text-red-600 font-semibold">
                  {formatMoney(totalMonthly)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {!readOnly && (
        <Button variant="outline" size="sm" className="self-start" onClick={addRow}>
          + Добавить статью
        </Button>
      )}
    </div>
  );
}
