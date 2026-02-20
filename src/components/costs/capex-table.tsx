"use client";

import { CapexItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";

const EMPTY_CAPEX = (calculationId: string, order: number): CapexItem => ({
  id: crypto.randomUUID(),
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
}

export function CapexTable({ items, calculationId, onChange }: Props) {
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
      <div>
        <h2 className="text-lg font-semibold text-gray-900">CAPEX — единовременные затраты</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Разовые инвестиции в ИИ-решение: разработка, лицензии, оборудование, обучение
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-8">#</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[200px]">Статья затрат</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-36">Сумма, ₽</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Комментарий</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-400 text-center">{idx + 1}</td>
                <td className="px-3 py-2">
                  <Input
                    value={item.name}
                    onChange={(e) => updateRow(idx, "name", e.target.value)}
                    placeholder="Напр.: разработка ИИ-модуля"
                    className="h-8 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    value={item.amount || ""}
                    onChange={(e) => updateRow(idx, "amount", parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm text-right"
                    min={0}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={item.comment ?? ""}
                    onChange={(e) => updateRow(idx, "comment", e.target.value)}
                    placeholder="Необязательно"
                    className="h-8 text-sm"
                  />
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

      <Button variant="outline" size="sm" className="self-start" onClick={addRow}>
        + Добавить статью
      </Button>
    </div>
  );
}
