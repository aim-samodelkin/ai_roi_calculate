"use client";

import { ErrorItem, ProcessType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computeErrorItem, sumErrorItems } from "@/lib/calculations/error-savings";
import { formatMoney, formatNumber } from "@/lib/format";

const EMPTY_ERROR = (calculationId: string, type: ProcessType, order: number): ErrorItem => ({
  id: crypto.randomUUID(),
  calculationId,
  type,
  order,
  name: "",
  processStep: "",
  frequency: 0,
  fixCost: 0,
  fixTimeHours: 0,
});

interface Props {
  items: ErrorItem[];
  type: ProcessType;
  asisItems?: ErrorItem[];
  onChange: (items: ErrorItem[]) => void;
}

export function ErrorTable({ items, type, asisItems, onChange }: Props) {
  const calculationId = items[0]?.calculationId ?? "";

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
        id: crypto.randomUUID(),
        type: "TO_BE" as ProcessType,
      }))
    );
  };

  const totals = sumErrorItems(items.map(computeErrorItem));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {type === "AS_IS" ? "Ошибки процесса AS-IS" : "Ошибки процесса TO-BE"}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {type === "AS_IS"
              ? "Типичные ошибки и сбои текущего процесса с затратами на исправление"
              : "Ошибки, которые останутся после внедрения ИИ (сниженная частота/стоимость)"}
          </p>
        </div>
        {type === "TO_BE" && asisItems && asisItems.length > 0 && (
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
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[180px]">Тип ошибки</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[140px]">Этап процесса</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-24">Частота (0–1)</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-32">Стоим. исправл., ₽</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-28">Время исправл., ч</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-32">Удельная стоим., ₽</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const computed = computeErrorItem(item);
              return (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400 text-center">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <Input
                      value={item.name}
                      onChange={(e) => updateRow(idx, "name", e.target.value)}
                      placeholder="Описание ошибки"
                      className="h-8 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={item.processStep}
                      onChange={(e) => updateRow(idx, "processStep", e.target.value)}
                      placeholder="На каком этапе"
                      className="h-8 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={item.frequency || ""}
                      onChange={(e) =>
                        updateRow(idx, "frequency", Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)))
                      }
                      className="h-8 text-sm text-right"
                      min={0}
                      max={1}
                      step={0.05}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={item.fixCost || ""}
                      onChange={(e) => updateRow(idx, "fixCost", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm text-right"
                      min={0}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={item.fixTimeHours || ""}
                      onChange={(e) => updateRow(idx, "fixTimeHours", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm text-right"
                      min={0}
                      step={0.5}
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700 font-medium">
                    {formatMoney(computed.unitErrorCost ?? 0)}
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
          {items.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t font-medium">
                <td colSpan={6} className="px-3 py-2.5 text-gray-700">Итого</td>
                <td className="px-3 py-2.5 text-right text-blue-700 font-semibold">
                  {formatMoney(totals.totalUnitErrorCost)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addRow}>
          + Добавить ошибку
        </Button>
        {items.length > 0 && (
          <div className="text-sm text-gray-500">
            Удельное время на ошибки: <span className="font-medium">{formatNumber(totals.totalUnitErrorTime)} ч</span>
          </div>
        )}
      </div>
    </div>
  );
}
