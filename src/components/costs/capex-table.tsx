"use client";

import { useEffect, useRef } from "react";
import { CapexItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DecimalInput } from "@/components/ui/decimal-input";
import { formatMoney } from "@/lib/format";
import { AiGenerateDialog } from "@/components/ai/ai-generate-dialog";
import type { GenerateContext } from "@/lib/ai/prompts";
import { generateId } from "@/lib/utils";

const EMPTY_CAPEX = (calculationId: string, order: number): CapexItem => ({
  id: generateId(),
  calculationId,
  order,
  name: "",
  amount: 0,
  comment: "",
});

interface Props {
  items: CapexItem[];
  calculationId: string;
  onChange: (items: CapexItem[]) => void;
  aiContext?: GenerateContext;
  readOnly?: boolean;
}

export function CapexTable({ items, calculationId, onChange, aiContext, readOnly }: Props) {
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.querySelectorAll("textarea").forEach((ta) => {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    });
  }, [items]);

  const addRow = () => {
    onChange([...items, EMPTY_CAPEX(calculationId, items.length)]);
  };

  const removeRow = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })));
  };

  const updateRow = (idx: number, field: keyof CapexItem, value: string | number) => {
    onChange(items.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const total = items.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">CAPEX — единовременные затраты</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Разовые инвестиции в ИИ-решение: разработка, лицензии, оборудование, обучение
          </p>
        </div>
        {!readOnly && aiContext && (
          <AiGenerateDialog
            tabType="capex"
            context={aiContext}
            hasExistingData={items.length > 0}
            onApply={(generated) => {
              const withCalcId = (generated as CapexItem[]).map((c) => ({
                ...c,
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
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-8">#</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[200px]">Статья затрат</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-36">Сумма, ₽</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Комментарий</th>
              {!readOnly && <th className="w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
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
                      placeholder="Напр.: разработка ИИ-модуля"
                      rows={1}
                      className="min-h-8 h-8 text-sm resize-none overflow-hidden py-1.5 leading-snug"
                    />
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {readOnly ? (
                    <span className="text-sm text-gray-700 font-medium">{formatMoney(item.amount)}</span>
                  ) : (
                    <DecimalInput
                      value={item.amount || 0}
                      onChange={(v) => updateRow(idx, "amount", v)}
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
            ))}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t font-medium">
                <td colSpan={2} className="px-3 py-2.5 text-gray-700">Итого CAPEX</td>
                <td className="px-3 py-2.5 text-right text-red-600 font-semibold">
                  {formatMoney(total)}
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
