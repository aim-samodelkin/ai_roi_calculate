"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Position } from "@/types";
import { Button } from "@/components/ui/button";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Input } from "@/components/ui/input";
import { generateId } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";

interface LocalPosition extends Position {
  _dirty?: boolean;
}

function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function PositionsSettings() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<LocalPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch("/api/positions")
      .then((r) => r.json())
      .then((j) => setPositions(j.data ?? []))
      .finally(() => setLoading(false));
  }, [user]);

  const savePositions = useCallback(
    debounce(async (pts: LocalPosition[]) => {
      setSaving(true);
      try {
        await fetch("/api/positions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positions: pts.map((p, i) => ({
              name: p.name,
              hourlyRate: p.hourlyRate,
              order: i,
            })),
          }),
        });
      } finally {
        setSaving(false);
      }
    }, 500),
    []
  );

  const update = (next: LocalPosition[]) => {
    setPositions(next);
    savePositions(next);
  };

  const addRow = () => {
    update([
      ...positions,
      { id: generateId(), userId: user?.id ?? "", name: "", hourlyRate: 0, order: positions.length },
    ]);
  };

  const removeRow = (idx: number) => {
    update(positions.filter((_, i) => i !== idx).map((p, i) => ({ ...p, order: i })));
  };

  const updateRow = (idx: number, field: keyof LocalPosition, value: string | number) => {
    update(positions.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  if (!user) {
    return (
      <div className="text-center py-12 text-gray-500">
        Войдите в аккаунт, чтобы управлять справочником должностей.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Настройки аккаунта</h1>
        <p className="text-gray-500 mt-1">Справочник должностей используется в расчётах для быстрого подбора сотрудника и ставки</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Должности</h2>
          {saving && <span className="text-xs text-gray-400">Сохранение…</span>}
        </div>

        {loading ? (
          <div className="text-gray-400 py-6 text-center">Загрузка…</div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-8">#</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600">Название должности</th>
                  <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-40">Цена часа, ₽</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {positions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                      Справочник пуст — добавьте должности
                    </td>
                  </tr>
                ) : (
                  positions.map((pos, idx) => (
                    <tr key={pos.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400 text-center">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <Input
                          value={pos.name}
                          onChange={(e) => updateRow(idx, "name", e.target.value)}
                          placeholder="Напр.: Аналитик"
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <DecimalInput
                          value={pos.hourlyRate || 0}
                          onChange={(v) => updateRow(idx, "hourlyRate", v)}
                          className="h-8 text-sm"
                          clamp
                          min={0}
                          thousands
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <Button variant="outline" size="sm" className="self-start" onClick={addRow}>
          + Добавить должность
        </Button>
      </div>
    </div>
  );
}
