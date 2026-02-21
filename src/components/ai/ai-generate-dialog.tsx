"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ProcessStep, ErrorItem, CapexItem, OpexItem } from "@/types";
import type { TabType, GenerateContext } from "@/lib/ai/prompts";
import { TAB_META } from "@/lib/ai/prompts";
import { formatNumber } from "@/lib/format";

type GeneratedItems = ProcessStep[] | ErrorItem[] | CapexItem[] | OpexItem[];

interface ApiResponse {
  items: GeneratedItems;
  reasoning: string;
  error?: string;
}

interface Props {
  tabType: TabType;
  context: GenerateContext;
  hasExistingData: boolean;
  onApply: (items: GeneratedItems) => void;
}

type Stage = "input" | "generating" | "preview";

// ─── Preview renderers ────────────────────────────────────────────────────────

function ProcessPreview({ items }: { items: ProcessStep[] }) {
  return (
    <div className="overflow-x-auto rounded border text-xs">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left px-2 py-1.5 font-medium text-gray-600">#</th>
            <th className="text-left px-2 py-1.5 font-medium text-gray-600">Этап</th>
            <th className="text-left px-2 py-1.5 font-medium text-gray-600">Сотрудник</th>
            <th className="text-right px-2 py-1.5 font-medium text-gray-600">Время, ч</th>
            <th className="text-right px-2 py-1.5 font-medium text-gray-600">Дни</th>
            <th className="text-right px-2 py-1.5 font-medium text-gray-600">Доля, %</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
              <td className="px-2 py-1.5 font-medium">{s.name}</td>
              <td className="px-2 py-1.5 text-gray-600">{s.employee}</td>
              <td className="px-2 py-1.5 text-right">{formatNumber(s.timeHours)}</td>
              <td className="px-2 py-1.5 text-right">{formatNumber(s.calendarDays)}</td>
              <td className="px-2 py-1.5 text-right">{Math.round(s.executionShare * 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ErrorPreview({ items }: { items: ErrorItem[] }) {
  return (
    <div className="overflow-x-auto rounded border text-xs">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left px-2 py-1.5 font-medium text-gray-600">#</th>
            <th className="text-left px-2 py-1.5 font-medium text-gray-600">Ошибка</th>
            <th className="text-left px-2 py-1.5 font-medium text-gray-600">Этап</th>
            <th className="text-right px-2 py-1.5 font-medium text-gray-600">Частота, %</th>
            <th className="text-right px-2 py-1.5 font-medium text-gray-600">Стоим. исправл., ₽</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
              <td className="px-2 py-1.5 font-medium">{e.name}</td>
              <td className="px-2 py-1.5 text-gray-600">{e.processStep}</td>
              <td className="px-2 py-1.5 text-right">{Math.round(e.frequency * 100)}</td>
              <td className="px-2 py-1.5 text-right">{formatNumber(e.fixCost, 0, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CapexPreview({ items }: { items: CapexItem[] }) {
  return (
    <div className="overflow-x-auto rounded border text-xs">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left px-2 py-1.5 font-medium text-gray-600">#</th>
            <th className="text-left px-2 py-1.5 font-medium text-gray-600">Статья</th>
            <th className="text-right px-2 py-1.5 font-medium text-gray-600">Сумма, ₽</th>
            <th className="text-left px-2 py-1.5 font-medium text-gray-600">Комментарий</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
              <td className="px-2 py-1.5 font-medium">{c.name}</td>
              <td className="px-2 py-1.5 text-right">{formatNumber(c.amount, 0, 0)}</td>
              <td className="px-2 py-1.5 text-gray-500">{c.comment ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OpexPreview({ items }: { items: OpexItem[] }) {
  return (
    <div className="overflow-x-auto rounded border text-xs">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left px-2 py-1.5 font-medium text-gray-600">#</th>
            <th className="text-left px-2 py-1.5 font-medium text-gray-600">Статья</th>
            <th className="text-right px-2 py-1.5 font-medium text-gray-600">₽/мес</th>
            <th className="text-left px-2 py-1.5 font-medium text-gray-600">Комментарий</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
              <td className="px-2 py-1.5 font-medium">{o.name}</td>
              <td className="px-2 py-1.5 text-right">{formatNumber(o.monthlyAmount, 0, 0)}</td>
              <td className="px-2 py-1.5 text-gray-500">{o.comment ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderPreview(tabType: TabType, items: GeneratedItems) {
  if (tabType === "process_asis" || tabType === "process_tobe") {
    return <ProcessPreview items={items as ProcessStep[]} />;
  }
  if (tabType === "errors_asis" || tabType === "errors_tobe") {
    return <ErrorPreview items={items as ErrorItem[]} />;
  }
  if (tabType === "capex") {
    return <CapexPreview items={items as CapexItem[]} />;
  }
  return <OpexPreview items={items as OpexItem[]} />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AiGenerateDialog({ tabType, context, hasExistingData, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("input");
  const [prompt, setPrompt] = useState("");
  const [generatedItems, setGeneratedItems] = useState<GeneratedItems | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState("");

  const meta = TAB_META[tabType];

  const handleOpen = () => {
    setOpen(true);
    setStage("input");
    setError(null);
    setGeneratedItems(null);
    setReasoning("");
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStage("generating");
    setError(null);
    setProgressLabel("Генерация данных…");

    // Simulate progress label change
    const timer = setTimeout(() => setProgressLabel("Проверка и верификация результата…"), 5000);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabType, userPrompt: prompt, context }),
      });

      clearTimeout(timer);

      const data = (await res.json()) as ApiResponse;

      if (!res.ok || data.error) {
        setError(data.error ?? "Произошла ошибка при генерации");
        setStage("input");
        return;
      }

      setGeneratedItems(data.items);
      setReasoning(data.reasoning);
      setStage("preview");
    } catch (err) {
      clearTimeout(timer);
      setError(err instanceof Error ? err.message : "Сетевая ошибка");
      setStage("input");
    }
  };

  const handleApply = () => {
    if (!generatedItems) return;

    // Assign client-side IDs and calculationId
    const calcId =
      (context.asisSteps?.[0]?.calculationId ??
        context.tobeSteps?.[0]?.calculationId ??
        context.asisErrors?.[0]?.calculationId ??
        context.tobeErrors?.[0]?.calculationId ??
        context.capexItems?.[0]?.calculationId ??
        context.opexItems?.[0]?.calculationId) ??
      "";

    const withIds = (generatedItems as unknown as Record<string, unknown>[]).map((item, i) => ({
      ...item,
      id: crypto.randomUUID(),
      calculationId: calcId,
      order: i,
    })) as unknown as GeneratedItems;

    onApply(withIds);
    setOpen(false);
  };

  const handleRegenerate = () => {
    setStage("input");
    setGeneratedItems(null);
    setReasoning("");
    setError(null);
  };

  const contextHint = meta.contextHint(context);

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} className="gap-1.5">
        <Sparkles size={14} className="text-purple-500" />
        Заполнить с ИИ
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles size={18} className="text-purple-500" />
              {meta.title}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {/* ── Stage: input ── */}
            {stage === "input" && (
              <div className="flex flex-col gap-4 py-2">
                {contextHint && (
                  <div className="flex items-start gap-2 text-sm text-blue-700 bg-blue-50 rounded-md px-3 py-2">
                    <ChevronRight size={14} className="mt-0.5 shrink-0" />
                    <span>{contextHint}</span>
                  </div>
                )}

                {hasExistingData && (
                  <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>Текущие данные на вкладке будут заменены результатом генерации.</span>
                  </div>
                )}

                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={meta.placeholder}
                  rows={6}
                  className="resize-none text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleGenerate();
                    }
                  }}
                />

                <p className="text-xs text-gray-400">Ctrl/Cmd+Enter — быстрый запуск</p>

                {error && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Stage: generating ── */}
            {stage === "generating" && (
              <div className="flex flex-col items-center justify-center gap-4 py-12">
                <Loader2 size={36} className="animate-spin text-purple-500" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">{progressLabel}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Двухшаговая цепочка: генерация → верификация
                  </p>
                </div>
              </div>
            )}

            {/* ── Stage: preview ── */}
            {stage === "preview" && generatedItems && (
              <div className="flex flex-col gap-4 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    Результат: {generatedItems.length} {itemLabel(tabType, generatedItems.length)}
                  </p>
                </div>

                {renderPreview(tabType, generatedItems)}

                {reasoning && (
                  <div className="text-xs text-gray-500 bg-gray-50 rounded-md px-3 py-2 border">
                    <span className="font-medium text-gray-600">Пояснение ИИ: </span>
                    {reasoning}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4 mt-2 flex-wrap gap-2">
            {stage === "input" && (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Отмена
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="gap-1.5 bg-purple-600 hover:bg-purple-700"
                >
                  <Sparkles size={14} />
                  Сгенерировать
                </Button>
              </>
            )}

            {stage === "generating" && (
              <Button variant="outline" onClick={handleClose}>
                Отмена
              </Button>
            )}

            {stage === "preview" && (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Отмена
                </Button>
                <Button variant="outline" onClick={handleRegenerate} className="gap-1.5">
                  <Sparkles size={14} />
                  Перегенерировать
                </Button>
                <Button onClick={handleApply} className="gap-1.5">
                  Применить
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function itemLabel(tabType: TabType, count: number): string {
  if (tabType === "process_asis" || tabType === "process_tobe") {
    if (count % 10 === 1 && count % 100 !== 11) return "этап";
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20))
      return "этапа";
    return "этапов";
  }
  if (tabType === "errors_asis" || tabType === "errors_tobe") {
    if (count % 10 === 1 && count % 100 !== 11) return "ошибка";
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20))
      return "ошибки";
    return "ошибок";
  }
  if (count % 10 === 1 && count % 100 !== 11) return "статья";
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20))
    return "статьи";
  return "статей";
}
