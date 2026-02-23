"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, AlertCircle, ChevronRight, Mic, Square } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
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
import type { TabType, GenerateContext, ContextSourceKey } from "@/lib/ai/prompts";
import {
  TAB_META,
  CONTEXT_SOURCE_LABELS,
  DEFAULT_CONTEXT_SOURCES,
  OWN_TAB_SOURCE,
} from "@/lib/ai/prompts";
import { formatNumber } from "@/lib/format";
import { generateId } from "@/lib/utils";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getContextSourceCount(key: ContextSourceKey, ctx: GenerateContext): number {
  switch (key) {
    case "asisSteps":  return ctx.asisSteps?.length  ?? 0;
    case "tobeSteps":  return ctx.tobeSteps?.length  ?? 0;
    case "asisErrors": return ctx.asisErrors?.length ?? 0;
    case "tobeErrors": return ctx.tobeErrors?.length ?? 0;
    case "capexItems": return ctx.capexItems?.length ?? 0;
    case "opexItems":  return ctx.opexItems?.length  ?? 0;
  }
}

function buildFilteredContext(
  context: GenerateContext,
  selectedSources: ContextSourceKey[],
  ownSource: ContextSourceKey
): GenerateContext {
  const include = (key: ContextSourceKey) => key === ownSource || selectedSources.includes(key);
  return {
    calculationName: context.calculationName,
    asisSteps:  include("asisSteps")  ? context.asisSteps  : undefined,
    tobeSteps:  include("tobeSteps")  ? context.tobeSteps  : undefined,
    asisErrors: include("asisErrors") ? context.asisErrors : undefined,
    tobeErrors: include("tobeErrors") ? context.tobeErrors : undefined,
    capexItems: include("capexItems") ? context.capexItems : undefined,
    opexItems:  include("opexItems")  ? context.opexItems  : undefined,
  };
}

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
            <th className="text-left px-2 py-1.5 font-medium text-gray-600">Риск</th>
            <th className="text-left px-2 py-1.5 font-medium text-gray-600">Сотрудник</th>
            <th className="text-right px-2 py-1.5 font-medium text-gray-600">Время, ч</th>
            <th className="text-right px-2 py-1.5 font-medium text-gray-600">Дни</th>
            <th className="text-right px-2 py-1.5 font-medium text-gray-600">Вероят., %</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
              <td className="px-2 py-1.5 font-medium">{e.name}</td>
              <td className="px-2 py-1.5 text-gray-600">{e.employee}</td>
              <td className="px-2 py-1.5 text-right">{formatNumber(e.timeHours)}</td>
              <td className="px-2 py-1.5 text-right">{formatNumber(e.calendarDays)}</td>
              <td className="px-2 py-1.5 text-right">{Math.round(e.frequency * 100)}</td>
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

// ─── Voice Record Button ──────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface VoiceRecordButtonProps {
  onTranscribed: (text: string) => void;
  disabled: boolean;
}

function VoiceRecordButton({ onTranscribed, disabled }: VoiceRecordButtonProps) {
  const { isSupported, status, elapsedSeconds, error, startRecording, stopRecording, cancelRecording } =
    useVoiceRecorder(onTranscribed);

  // MediaRecorder exists but getUserMedia is blocked on HTTP (non-secure context)
  const isHttpBlocked =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !navigator.mediaDevices?.getUserMedia;

  if (!isSupported && !isHttpBlocked) return null;

  if (isHttpBlocked || !isSupported) {
    return (
      <div title="Голосовой ввод доступен только по HTTPS. Сайт работает по HTTP.">
        <button
          type="button"
          disabled
          className="flex items-center gap-1.5 text-xs text-gray-300 cursor-not-allowed px-2 py-1 rounded-md"
        >
          <Mic size={13} />
          <span>Надиктовать</span>
        </button>
      </div>
    );
  }

  if (status === "transcribing") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-purple-600">
        <Loader2 size={13} className="animate-spin" />
        <span>Обработка…</span>
      </div>
    );
  }

  if (status === "recording") {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          {formatElapsed(elapsedSeconds)}
        </span>
        <button
          type="button"
          onClick={cancelRecording}
          className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
        >
          отмена
        </button>
        <button
          type="button"
          onClick={stopRecording}
          title="Остановить запись"
          className="flex items-center justify-center h-7 w-7 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shadow-sm"
        >
          <Square size={10} fill="white" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled}
        title="Надиктовать голосом"
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded-md hover:bg-purple-50"
      >
        <Mic size={13} />
        <span>Надиктовать</span>
      </button>
      {error && (
        <p className="text-xs text-red-500 max-w-[200px] text-right">{error}</p>
      )}
    </div>
  );
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
  const [selectedSources, setSelectedSources] = useState<ContextSourceKey[]>(
    DEFAULT_CONTEXT_SOURCES[tabType]
  );
  const [activeModels, setActiveModels] = useState<{
    generationModel: string;
    verificationModel: string;
  } | null>(null);

  const meta = TAB_META[tabType];

  useEffect(() => {
    if (!open) return;
    fetch("/api/ai/active-models")
      .then((r) => r.json())
      .then((data) => {
        if (data.generationModel && data.verificationModel) {
          setActiveModels({
            generationModel: data.generationModel,
            verificationModel: data.verificationModel,
          });
        }
      })
      .catch(() => setActiveModels(null));
  }, [open]);
  const ownSource = OWN_TAB_SOURCE[tabType];

  // Sources available to toggle: all except the own tab's source, only those with data
  const availableSources = (Object.keys(CONTEXT_SOURCE_LABELS) as ContextSourceKey[])
    .filter((key) => key !== ownSource && getContextSourceCount(key, context) > 0)
    .map((key) => ({
      key,
      label: CONTEXT_SOURCE_LABELS[key].label,
      unit: CONTEXT_SOURCE_LABELS[key].unit,
      count: getContextSourceCount(key, context),
    }));

  const handleOpen = () => {
    setOpen(true);
    setStage("input");
    setError(null);
    setGeneratedItems(null);
    setReasoning("");
    setSelectedSources(DEFAULT_CONTEXT_SOURCES[tabType]);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const toggleSource = (key: ContextSourceKey, checked: boolean) => {
    setSelectedSources((prev) =>
      checked ? [...prev, key] : prev.filter((k) => k !== key)
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStage("generating");
    setError(null);
    setProgressLabel("Генерация данных…");

    const timer = setTimeout(() => setProgressLabel("Проверка и верификация результата…"), 5000);

    try {
      const filteredContext = buildFilteredContext(context, selectedSources, ownSource);

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabType, userPrompt: prompt, context: filteredContext }),
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
      id: generateId(),
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
                {/* Context source checkboxes */}
                {availableSources.length > 0 && (
                  <div className="rounded-md border px-3 py-2.5">
                    <p className="text-xs font-medium text-gray-500 mb-2">
                      Учитывать контекст из вкладок:
                    </p>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      {availableSources.map(({ key, label, unit, count }) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 text-sm cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded accent-purple-600 cursor-pointer"
                            checked={selectedSources.includes(key)}
                            onChange={(e) => toggleSource(key, e.target.checked)}
                          />
                          <span className="text-gray-700">{label}</span>
                          <span className="text-gray-400 text-xs">
                            ({count} {unit})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

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

                <div className="flex flex-col gap-1">
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
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">Ctrl/Cmd+Enter — быстрый запуск</p>
                    <VoiceRecordButton
                      onTranscribed={(text) =>
                        setPrompt((prev) => (prev.trim() ? prev.trimEnd() + "\n" + text : text))
                      }
                      disabled={stage !== "input"}
                    />
                  </div>
                </div>

                {activeModels && (
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    <p className="font-medium text-gray-700 mb-1">Модели для генерации:</p>
                    <p>
                      <span className="text-gray-500">1. Генерация:</span>{" "}
                      <code className="rounded bg-gray-200 px-1">{activeModels.generationModel}</code>
                    </p>
                    <p className="mt-0.5">
                      <span className="text-gray-500">2. Верификация:</span>{" "}
                      <code className="rounded bg-gray-200 px-1">{activeModels.verificationModel}</code>
                    </p>
                  </div>
                )}

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
                  {activeModels && (
                    <p className="text-xs text-gray-500 mt-2">
                      {activeModels.generationModel} → {activeModels.verificationModel}
                    </p>
                  )}
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
    if (count % 10 === 1 && count % 100 !== 11) return "риск";
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20))
      return "риска";
    return "рисков";
  }
  if (count % 10 === 1 && count % 100 !== 11) return "статья";
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20))
    return "статьи";
  return "статей";
}
