"use client";

import { OpexItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";

const EMPTY_OPEX = (calculationId: string, order: number): OpexItem => ({
  id: crypto.randomUUID(),
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
}

export function OpexTable({ items, calculationId, onChange }: Props) {
  const addRow = () => {
    onChange([...items, EMPTY_OPEX(calculationId, items.length)]);
  };

  const removeRow = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })));
  };

  const updateRow = (idx: number, field: keyof OpexItem, value: string | number) => {
    onChange(items.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const totalMonthly = items.reduce((sum, i) => sum + i.monthlyAmount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">OPEX — ежемесячные затраты</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Регулярные расходы на поддержку ИИ-решения: API, облако, техподдержка, сопровождение
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-8">#</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[200px]">Статья затрат</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-40">Стоимость в месяц, ₽</th>
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
                    placeholder="Напр.: подписка на AI API"
                    className="h-8 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    value={item.monthlyAmount || ""}
                    onChange={(e) => updateRow(idx, "monthlyAmount", parseFloat(e.target.value) || 0)}
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
                <td colSpan={2} className="px-3 py-2.5 text-gray-700">Итого в месяц</td>
                <td className="px-3 py-2.5 text-right text-red-600 font-semibold">
                  {formatMoney(totalMonthly)}
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
