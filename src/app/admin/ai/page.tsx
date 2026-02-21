"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RotateCcw, Save, Search, ChevronDown } from "lucide-react";
import type { TabType, PromptType } from "@/lib/ai/prompts";
import { PROMPT_PLACEHOLDERS, DEFAULT_PROMPTS } from "@/lib/ai/prompts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiModel {
  id: string;
  name: string;
  contextLength?: number;
}

interface AiConfigData {
  generationModel: string;
  verificationModel: string;
  prompts: Record<string, Record<string, string>>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TAB_LABELS: Record<TabType, string> = {
  process_asis: "Процесс AS-IS",
  process_tobe: "Процесс TO-BE",
  errors_asis:  "Ошибки AS-IS",
  errors_tobe:  "Ошибки TO-BE",
  capex:        "CAPEX",
  opex:         "OPEX",
};

const TAB_TYPES: TabType[] = [
  "process_asis",
  "process_tobe",
  "errors_asis",
  "errors_tobe",
  "capex",
  "opex",
];

// ─── Searchable model select ──────────────────────────────────────────────────

function ModelCombobox({
  label,
  value,
  models,
  onChange,
}: {
  label: string;
  value: string;
  models: AiModel[];
  onChange: (v: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = models.filter(
    (m) =>
      m.id.toLowerCase().includes(query.toLowerCase()) ||
      m.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div ref={ref} className="relative">
        <div
          className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 cursor-pointer hover:border-gray-400 transition-colors"
          onClick={() => setOpen((o) => !o)}
        >
          <Sparkles size={14} className="text-purple-500 shrink-0" />
          <span className="flex-1 text-sm truncate">{value || "Выберите модель"}</span>
          <ChevronDown size={14} className="text-gray-400 shrink-0" />
        </div>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
            <div className="p-2 border-b">
              <div className="flex items-center gap-2 rounded border px-2 py-1.5">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input
                  autoFocus
                  className="flex-1 text-sm outline-none bg-transparent"
                  placeholder="Поиск модели..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <ul className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-400">Модели не найдены</li>
              )}
              {filtered.map((m) => (
                <li
                  key={m.id}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors ${
                    m.id === value ? "bg-purple-50 text-purple-700 font-medium" : ""
                  }`}
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <div className="font-mono text-xs">{m.id}</div>
                  {m.name !== m.id && (
                    <div className="text-gray-500 text-xs mt-0.5">{m.name}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 font-mono">{value}</p>
    </div>
  );
}

// ─── Prompt editor for one agent ──────────────────────────────────────────────

function PromptEditor({
  tabType,
  promptType,
  value,
  onSave,
  onReset,
  insertRef,
}: {
  tabType: TabType;
  promptType: PromptType;
  value: string;
  onSave: (v: string) => Promise<void>;
  onReset: () => Promise<void>;
  insertRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isDirty = text !== value;
  const defaultText = DEFAULT_PROMPTS[tabType][promptType];
  const isDefault = text === defaultText;

  // Sync when parent value changes (e.g. after reset)
  useEffect(() => {
    setText(value);
  }, [value]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(text);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    if (!confirm("Сбросить промпт к исходному значению?")) return;
    await onReset();
  };

  const title = promptType === "generation" ? "Генерирующий агент" : "Проверяющий агент";
  const relevantPlaceholders = PROMPT_PLACEHOLDERS.filter((p) =>
    p.promptTypes.includes(promptType)
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {!isDefault && (
            <Badge variant="secondary" className="text-xs">изменён</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 text-gray-500 h-7 px-2"
            >
              <RotateCcw size={12} />
              Сбросить
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="gap-1.5 h-7 px-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40"
          >
            <Save size={12} />
            {saving ? "Сохранение..." : saved ? "Сохранено" : "Сохранить"}
          </Button>
        </div>
      </div>

      <Textarea
        ref={promptType === "generation" ? (insertRef as React.RefObject<HTMLTextAreaElement>) : undefined}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="resize-y font-mono text-xs leading-relaxed"
        placeholder="Текст системного промпта..."
      />

      <div className="flex flex-wrap gap-1.5">
        {relevantPlaceholders.map((p) => (
          <button
            key={p.key}
            type="button"
            title={p.description}
            className="rounded border px-1.5 py-0.5 font-mono text-xs text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors"
            onClick={() => {
              const pos = (promptType === "generation"
                ? insertRef.current
                : document.activeElement) as HTMLTextAreaElement | null;
              if (pos && pos.tagName === "TEXTAREA") {
                const start = pos.selectionStart ?? text.length;
                const end = pos.selectionEnd ?? text.length;
                const next = text.slice(0, start) + p.key + text.slice(end);
                setText(next);
                setTimeout(() => {
                  pos.selectionStart = start + p.key.length;
                  pos.selectionEnd = start + p.key.length;
                  pos.focus();
                }, 0);
              } else {
                setText((prev) => prev + p.key);
              }
            }}
          >
            {p.key}
          </button>
        ))}
        <span className="text-xs text-gray-400 self-center ml-1">— клик вставляет в курсор</span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminAiPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [config, setConfig] = useState<AiConfigData | null>(null);
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(true);

  const [genModel, setGenModel] = useState("");
  const [verModel, setVerModel] = useState("");
  const [modelsSaving, setModelsSaving] = useState(false);
  const [modelsSaved, setModelsSaved] = useState(false);

  // One ref per tab for generation textarea (for placeholder insertion)
  const genTextareaRefs = useRef<Record<TabType, React.RefObject<HTMLTextAreaElement | null>>>({
    process_asis: { current: null },
    process_tobe: { current: null },
    errors_asis:  { current: null },
    errors_tobe:  { current: null },
    capex:        { current: null },
    opex:         { current: null },
  });

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ADMIN") { router.replace("/"); return; }
  }, [user, authLoading, router]);

  // Load config
  useEffect(() => {
    if (authLoading || !user || user.role !== "ADMIN") return;
    fetch("/api/ai/config")
      .then((r) => r.json())
      .then((j) => {
        const data = j.data as AiConfigData;
        setConfig(data);
        setGenModel(data.generationModel);
        setVerModel(data.verificationModel);
      })
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  // Load models list
  useEffect(() => {
    if (authLoading || !user || user.role !== "ADMIN") return;
    fetch("/api/ai/models")
      .then((r) => r.json())
      .then((j) => setModels(j.data ?? []))
      .finally(() => setModelsLoading(false));
  }, [user, authLoading]);

  const handleSaveModels = async () => {
    setModelsSaving(true);
    await fetch("/api/ai/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generationModel: genModel, verificationModel: verModel }),
    });
    setModelsSaving(false);
    setModelsSaved(true);
    setTimeout(() => setModelsSaved(false), 2000);
  };

  const handleSavePrompt = async (tabType: TabType, promptType: PromptType, text: string) => {
    await fetch("/api/ai/prompts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabType, promptType, systemPrompt: text }),
    });
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        prompts: {
          ...prev.prompts,
          [tabType]: { ...prev.prompts[tabType], [promptType]: text },
        },
      };
    });
  };

  const handleResetPrompt = async (tabType: TabType, promptType: PromptType) => {
    await fetch("/api/ai/prompts/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabType, promptType }),
    });
    // Reload config to get defaults
    const j = await fetch("/api/ai/config").then((r) => r.json());
    setConfig(j.data as AiConfigData);
  };

  if (authLoading || loading) {
    return <div className="flex justify-center py-20 text-gray-400">Загрузка...</div>;
  }

  if (!config) return null;

  const modelsChanged =
    genModel !== config.generationModel || verModel !== config.verificationModel;

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles size={22} className="text-purple-500" />
          Настройки ИИ-генерации
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Управляйте моделями OpenRouter и системными промптами для каждой вкладки калькулятора
        </p>
      </div>

      {/* Models block */}
      <div className="rounded-xl border bg-white p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Модели OpenRouter</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {modelsLoading
              ? "Загрузка списка моделей..."
              : `Доступно ${models.length} моделей`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ModelCombobox
            label="Генерирующий агент (шаг 1)"
            value={genModel}
            models={models}
            onChange={setGenModel}
          />
          <ModelCombobox
            label="Верифицирующий агент (шаг 2)"
            value={verModel}
            models={models}
            onChange={setVerModel}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSaveModels}
            disabled={!modelsChanged || modelsSaving}
            className="gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40"
          >
            <Save size={14} />
            {modelsSaving ? "Сохранение..." : modelsSaved ? "Сохранено" : "Сохранить модели"}
          </Button>
        </div>
      </div>

      {/* Prompts block */}
      <div className="rounded-xl border bg-white p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Системные промпты</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Промпты для генерирующего и проверяющего агентов по каждой вкладке.
            Используйте плейсхолдеры для подстановки динамических данных.
          </p>
        </div>

        <Tabs defaultValue="process_asis">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {TAB_TYPES.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs px-3 py-1.5">
                {TAB_LABELS[t]}
              </TabsTrigger>
            ))}
          </TabsList>

          {TAB_TYPES.map((tabType) => {
            const tabPrompts = config.prompts[tabType] ?? {};
            return (
              <TabsContent key={tabType} value={tabType} className="flex flex-col gap-8 mt-6">
                {(["generation", "verification"] as PromptType[]).map((promptType) => (
                  <PromptEditor
                    key={promptType}
                    tabType={tabType}
                    promptType={promptType}
                    value={tabPrompts[promptType] ?? ""}
                    onSave={(text) => handleSavePrompt(tabType, promptType, text)}
                    onReset={() => handleResetPrompt(tabType, promptType)}
                    insertRef={
                      promptType === "generation"
                        ? genTextareaRefs.current[tabType]
                        : { current: null }
                    }
                  />
                ))}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* Placeholder reference */}
      <div className="rounded-xl border bg-gray-50 p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700">Справочник плейсхолдеров</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {PROMPT_PLACEHOLDERS.map((p) => (
            <div key={p.key} className="flex items-start gap-2">
              <code className="text-xs bg-white border rounded px-1.5 py-0.5 font-mono text-purple-700 shrink-0">
                {p.key}
              </code>
              <span className="text-xs text-gray-600">{p.description}</span>
              <span className="text-xs text-gray-400 shrink-0">
                [{p.promptTypes.join(", ")}]
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
