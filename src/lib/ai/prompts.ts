import type { ProcessStep, ErrorItem, CapexItem, OpexItem } from "@/types";

export type TabType =
  | "process_asis"
  | "process_tobe"
  | "errors_asis"
  | "errors_tobe"
  | "capex"
  | "opex";

export type PromptType = "generation" | "verification";

export type ContextSourceKey =
  | "asisSteps"
  | "tobeSteps"
  | "asisErrors"
  | "tobeErrors"
  | "capexItems"
  | "opexItems";

export interface GenerateContext {
  calculationName: string;
  asisSteps?: ProcessStep[];
  tobeSteps?: ProcessStep[];
  asisErrors?: ErrorItem[];
  tobeErrors?: ErrorItem[];
  capexItems?: CapexItem[];
  opexItems?: OpexItem[];
}

export const CONTEXT_SOURCE_LABELS: Record<ContextSourceKey, { label: string; unit: string }> = {
  asisSteps:  { label: "Процесс AS-IS",  unit: "эт." },
  tobeSteps:  { label: "Процесс TO-BE",  unit: "эт." },
  asisErrors: { label: "Риски AS-IS",    unit: "ош." },
  tobeErrors: { label: "Риски TO-BE",    unit: "ош." },
  capexItems: { label: "CAPEX",           unit: "ст." },
  opexItems:  { label: "OPEX",            unit: "ст." },
};

export const DEFAULT_CONTEXT_SOURCES: Record<TabType, ContextSourceKey[]> = {
  process_asis: [],
  process_tobe: ["asisSteps"],
  errors_asis:  ["asisSteps"],
  errors_tobe:  ["asisErrors", "tobeSteps"],
  capex:        ["asisSteps", "tobeSteps"],
  opex:         ["tobeSteps", "capexItems"],
};

export const OWN_TAB_SOURCE: Record<TabType, ContextSourceKey> = {
  process_asis: "asisSteps",
  process_tobe: "tobeSteps",
  errors_asis:  "asisErrors",
  errors_tobe:  "tobeErrors",
  capex:        "capexItems",
  opex:         "opexItems",
};

// ─── Placeholders available in prompts ──────────────────────────────────────

export const PROMPT_PLACEHOLDERS: { key: string; description: string; promptTypes: PromptType[] }[] = [
  { key: "{{calcName}}",      description: "Название расчёта",                                    promptTypes: ["generation", "verification"] },
  { key: "{{existingData}}",  description: "Уже заполненные данные на этой вкладке (если есть)", promptTypes: ["generation"] },
  { key: "{{contextBlock}}",  description: "Контекст из других вкладок (выбранных пользователем)", promptTypes: ["generation"] },
  { key: "{{jsonSchema}}",    description: "JSON-схема ожидаемого формата ответа",                promptTypes: ["generation", "verification"] },
  { key: "{{generatedJson}}", description: "JSON из шага генерации (для проверки)",               promptTypes: ["verification"] },
  { key: "{{asisContext}}",   description: "Этапы AS-IS для сравнения (только верификация TO-BE / ошибок)", promptTypes: ["verification"] },
];

// ─── JSON schemas ────────────────────────────────────────────────────────────

export const PROCESS_STEP_SCHEMA = `{
  "steps": [
    {
      "name": "string — название этапа",
      "employee": "string — роль или должность сотрудника",
      "hourlyRate": "number — стоимость часа работы в рублях (0 если неизвестна)",
      "timeHours": "number — трудозатраты в часах",
      "calendarDays": "number — длительность в календарных днях",
      "executionShare": "number — доля выполнения от 0 до 1 (1 = 100% случаев)",
      "extraCost": "number — доп. прямые затраты в рублях (0 если нет)"
    }
  ],
  "reasoning": "string — краткое пояснение логики: что учли, почему такие значения"
}`;

export const ERROR_ITEM_SCHEMA = `{
  "items": [
    {
      "name": "string — тип / описание ошибки",
      "processStep": "string — название этапа процесса, где возникает ошибка",
      "frequency": "number — доля случаев от 0 до 1 (например 0.1 = 10% случаев)",
      "fixCost": "number — стоимость исправления одной ошибки в рублях",
      "fixTimeHours": "number — время на исправление в часах"
    }
  ],
  "reasoning": "string — краткое пояснение"
}`;

export const CAPEX_SCHEMA = `{
  "items": [
    {
      "name": "string — название статьи затрат",
      "amount": "number — сумма в рублях",
      "comment": "string — необязательное пояснение (или пустая строка)"
    }
  ],
  "reasoning": "string — краткое пояснение"
}`;

export const OPEX_SCHEMA = `{
  "items": [
    {
      "name": "string — название статьи затрат",
      "monthlyAmount": "number — сумма в месяц в рублях",
      "comment": "string — необязательное пояснение (или пустая строка)"
    }
  ],
  "reasoning": "string — краткое пояснение"
}`;

const SCHEMAS: Record<TabType, string> = {
  process_asis: PROCESS_STEP_SCHEMA,
  process_tobe: PROCESS_STEP_SCHEMA,
  errors_asis:  ERROR_ITEM_SCHEMA,
  errors_tobe:  ERROR_ITEM_SCHEMA,
  capex:        CAPEX_SCHEMA,
  opex:         OPEX_SCHEMA,
};

// ─── Default prompts with placeholders ──────────────────────────────────────

export const DEFAULT_PROMPTS: Record<TabType, Record<PromptType, string>> = {
  process_asis: {
    generation: `Ты эксперт по анализу и оптимизации бизнес-процессов. Твоя задача — на основе описания от пользователя сформировать структурированный список этапов текущего процесса (AS-IS).

Расчёт называется: «{{calcName}}»
{{existingData}}{{contextBlock}}

Требования к каждому этапу:
- Название должно быть конкретным и понятным
- Роль сотрудника — реальная должность или роль
- timeHours: реалистичные трудозатраты в часах (может быть дробным)
- calendarDays: длительность в днях (обычно ≥ timeHours / 8)
- executionShare: 1.0 если этап происходит всегда, меньше если условно
- hourlyRate: оставь 0 (пользователь подставит свои ставки)
- extraCost: 0 если нет прямых затрат

Верни строго JSON согласно схеме:
{{jsonSchema}}`,

    verification: `Ты строгий аналитик, проверяющий данные для ROI-калькулятора. Расчёт: «{{calcName}}».
Ниже — JSON, сгенерированный на предыдущем шаге. Проверь его и верни исправленную версию в том же формате.

Критерии проверки для этапов процесса AS-IS:
1. Логический порядок: этапы идут в реальной последовательности
2. Полнота: нет ли явно пропущенных шагов
3. Реалистичность timeHours: типичный этап — от 0.1 до 8 часов (может быть больше для длительных задач)
4. calendarDays ≥ timeHours / 8 (минимум)
5. executionShare от 0 до 1; если этап необязательный — доля < 1
6. Нет дублирующих этапов

Если всё верно — верни данные без изменений. Если есть проблемы — исправь и поясни в reasoning.

Верни строго JSON в том же формате:
{{jsonSchema}}`,
  },

  process_tobe: {
    generation: `Ты эксперт по внедрению ИИ в бизнес-процессы. Твоя задача — сформировать целевой процесс TO-BE (как процесс будет выглядеть после внедрения ИИ).

Расчёт называется: «{{calcName}}»
{{existingData}}{{contextBlock}}

Правила формирования TO-BE:
- Сохрани все этапы AS-IS, которые ИИ не меняет (с теми же значениями)
- Для этапов, которые ИИ ускоряет: снизь timeHours и calendarDays
- Для этапов, которые ИИ выполняет полностью: поставь employee = "ИИ-система", сильно снизь timeHours
- Этапы, которые ИИ устраняет полностью: не включай в TO-BE (или сильно снизь долю executionShare)
- Не будь чрезмерно оптимистичен: ИИ редко даёт >5x ускорение на этап
- hourlyRate оставь 0

Если пользователь просит предположить TO-BE самостоятельно — предложи реалистичную автоматизацию для данного типа процесса.

Верни строго JSON согласно схеме:
{{jsonSchema}}`,

    verification: `Ты строгий аналитик, проверяющий данные для ROI-калькулятора. Расчёт: «{{calcName}}».
Ниже — JSON, сгенерированный на предыдущем шаге. Проверь его и верни исправленную версию в том же формате.
{{asisContext}}
Критерии проверки для TO-BE:
1. Улучшения реалистичны: ИИ даёт 2–10x ускорение на автоматизируемых этапах (не 100x)
2. Этапы, не затронутые ИИ, должны иметь те же значения что в AS-IS
3. Ни один этап не должен иметь timeHours = 0 (если этап есть, значит время тратится)
4. executionShare корректен
5. Общее количество этапов TO-BE ≤ AS-IS + 3 (ИИ редко добавляет много новых шагов)

Исправь нереалистичные оценки. Верни JSON:
{{jsonSchema}}`,
  },

  errors_asis: {
    generation: `Ты эксперт по анализу качества бизнес-процессов. Твоя задача — выявить типичные ошибки и сбои в текущем процессе (AS-IS).

Расчёт называется: «{{calcName}}»
{{existingData}}{{contextBlock}}

Требования:
- Укажи реальные ошибки, типичные для таких процессов
- processStep должен совпадать с названием реального этапа из AS-IS (или быть близким к нему)
- frequency: доля случаев от 0 до 1 (0.05–0.30 типично)
- fixCost: затраты на исправление одной ошибки в рублях
- fixTimeHours: время на исправление в часах
- Не дублируй уже существующие ошибки

Верни строго JSON согласно схеме:
{{jsonSchema}}`,

    verification: `Ты строгий аналитик, проверяющий данные для ROI-калькулятора. Расчёт: «{{calcName}}».
Ниже — JSON, сгенерированный на предыдущем шаге. Проверь его и верни исправленную версию в том же формате.

Критерии проверки для ошибок AS-IS:
1. frequency реалистична: 0.01–0.5 (ошибки с частотой > 50% — исключение)
2. fixCost > 0 (исправление всегда стоит денег)
3. fixTimeHours > 0
4. processStep указывает на реальный этап процесса
5. Нет дублирующих ошибок
6. Не более 10–15 ошибок (качество важнее количества)

Исправь и верни JSON:
{{jsonSchema}}`,
  },

  errors_tobe: {
    generation: `Ты эксперт по оценке влияния ИИ на качество процессов. Твоя задача — показать, как ИИ изменит картину ошибок TO-BE.

Расчёт называется: «{{calcName}}»
{{existingData}}{{contextBlock}}

Правила:
- Для каждой ошибки AS-IS реши: исчезает ли она, снижается ли частота или стоимость исправления
- ИИ редко устраняет ошибки полностью — как правило снижает частоту на 30–80%
- Новые типы ошибок, специфичные для ИИ-системы: добавь (ошибки ИИ, сбои интеграции)
- fixCost и fixTimeHours должны быть > 0 для оставшихся ошибок

Верни строго JSON согласно схеме:
{{jsonSchema}}`,

    verification: `Ты строгий аналитик, проверяющий данные для ROI-калькулятора. Расчёт: «{{calcName}}».
Ниже — JSON, сгенерированный на предыдущем шаге. Проверь его и верни исправленную версию в том же формате.
{{asisContext}}
Критерии проверки для ошибок TO-BE:
1. frequency TO-BE ≤ frequency AS-IS (ИИ не увеличивает частоту ошибок для тех же типов)
2. Ни одна ошибка не должна иметь frequency = 0 (если ошибка в TO-BE, она ненулевая)
3. fixCost и fixTimeHours > 0
4. Новые ошибки ИИ (сбои, галлюцинации) логичны для данного контекста
5. Снижение не должно быть > 90% для всех ошибок сразу

Исправь и верни JSON:
{{jsonSchema}}`,
  },

  capex: {
    generation: `Ты эксперт по экономике внедрения ИИ-решений. Твоя задача — сформировать список единовременных затрат (CAPEX) на внедрение ИИ.

Расчёт называется: «{{calcName}}»
{{existingData}}{{contextBlock}}

Типичные статьи CAPEX для ИИ-проектов:
- Разработка / интеграция ИИ-модуля
- Лицензии и программное обеспечение
- Обучение персонала
- Тестирование и приёмка
- Инфраструктура / оборудование (если нужно)
- Управление проектом

Суммы должны быть реалистичными для российского рынка (рубли).
Не дублируй уже существующие статьи.

Верни строго JSON согласно схеме:
{{jsonSchema}}`,

    verification: `Ты строгий аналитик, проверяющий данные для ROI-калькулятора. Расчёт: «{{calcName}}».
Ниже — JSON, сгенерированный на предыдущем шаге. Проверь его и верни исправленную версию в том же формате.

Критерии проверки для CAPEX:
1. Есть статья на разработку / интеграцию (обычно самая крупная)
2. Есть статья на обучение персонала
3. Суммы реалистичны для российского рынка: разработка — от 300 000 ₽, обучение — от 30 000 ₽
4. Не более 8–10 статей
5. amount > 0 для каждой статьи

Верни JSON:
{{jsonSchema}}`,
  },

  opex: {
    generation: `Ты эксперт по экономике ИИ-решений. Твоя задача — сформировать список ежемесячных операционных затрат (OPEX) на поддержку ИИ.

Расчёт называется: «{{calcName}}»
{{existingData}}{{contextBlock}}

Типичные статьи OPEX для ИИ-проектов:
- Подписка на AI API (OpenAI, Anthropic и т.д.)
- Облачная инфраструктура / хостинг
- Техническая поддержка и сопровождение
- Мониторинг и DevOps
- Лицензии на ПО (ежемесячные)
- Контроль качества ИИ-выводов

Суммы — реалистичные ежемесячные расходы в рублях.
Не дублируй уже существующие статьи.

Верни строго JSON согласно схеме:
{{jsonSchema}}`,

    verification: `Ты строгий аналитик, проверяющий данные для ROI-калькулятора. Расчёт: «{{calcName}}».
Ниже — JSON, сгенерированный на предыдущем шаге. Проверь его и верни исправленную версию в том же формате.

Критерии проверки для OPEX:
1. Есть статья на AI API / модели (если решение их использует)
2. Суммы реалистичны: минимальный OPEX для ИИ-решения — от 5 000 ₽/мес
3. monthlyAmount > 0 для каждой статьи
4. Не более 6–8 статей

Верни JSON:
{{jsonSchema}}`,
  },
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function stepsToText(steps: ProcessStep[]): string {
  if (!steps.length) return "нет данных";
  return steps
    .map(
      (s, i) =>
        `${i + 1}. ${s.name} (сотрудник: ${s.employee || "—"}, время: ${s.timeHours} ч, доля: ${s.executionShare})`
    )
    .join("\n");
}

function errorsToText(items: ErrorItem[]): string {
  if (!items.length) return "нет данных";
  return items
    .map(
      (e, i) =>
        `${i + 1}. ${e.name} (этап: ${e.processStep}, частота: ${e.frequency}, стоимость исправления: ${e.fixCost} ₽)`
    )
    .join("\n");
}

function capexToText(items: CapexItem[]): string {
  if (!items.length) return "нет данных";
  return items.map((c, i) => `${i + 1}. ${c.name}: ${c.amount} ₽`).join("\n");
}

function opexToText(items: OpexItem[]): string {
  if (!items.length) return "нет данных";
  return items.map((o, i) => `${i + 1}. ${o.name}: ${o.monthlyAmount} ₽/мес`).join("\n");
}

function buildContextBlock(ctx: GenerateContext, excludeKey: ContextSourceKey): string {
  const parts: string[] = [];

  if (excludeKey !== "asisSteps" && ctx.asisSteps?.length)
    parts.push(`Этапы процесса AS-IS (${ctx.asisSteps.length}):\n${stepsToText(ctx.asisSteps)}`);
  if (excludeKey !== "tobeSteps" && ctx.tobeSteps?.length)
    parts.push(`Этапы процесса TO-BE (${ctx.tobeSteps.length}):\n${stepsToText(ctx.tobeSteps)}`);
  if (excludeKey !== "asisErrors" && ctx.asisErrors?.length)
    parts.push(`Риски AS-IS (${ctx.asisErrors.length}):\n${errorsToText(ctx.asisErrors)}`);
  if (excludeKey !== "tobeErrors" && ctx.tobeErrors?.length)
    parts.push(`Риски TO-BE (${ctx.tobeErrors.length}):\n${errorsToText(ctx.tobeErrors)}`);
  if (excludeKey !== "capexItems" && ctx.capexItems?.length)
    parts.push(`Статьи CAPEX (${ctx.capexItems.length}):\n${capexToText(ctx.capexItems)}`);
  if (excludeKey !== "opexItems" && ctx.opexItems?.length)
    parts.push(`Статьи OPEX (${ctx.opexItems.length}):\n${opexToText(ctx.opexItems)}`);

  if (!parts.length) return "";
  return `\nДополнительный контекст из других вкладок:\n${parts.join("\n\n")}`;
}

// ─── Placeholder substitution ────────────────────────────────────────────────

interface SubstituteOptions {
  tabType: TabType;
  promptType: PromptType;
  template: string;
  calcName: string;
  ctx: GenerateContext;
  generatedJson?: string;
}

function substitutePrompt(opts: SubstituteOptions): string {
  const { tabType, promptType, template, calcName, ctx, generatedJson } = opts;
  const ownSource = OWN_TAB_SOURCE[tabType];
  const schema = SCHEMAS[tabType];

  // {{existingData}} — only for generation prompts
  let existingData = "";
  if (promptType === "generation") {
    const existing: string[] = [];
    if (ownSource === "asisSteps" && ctx.asisSteps?.length)
      existing.push(`Уже существующие этапы AS-IS (их можно скорректировать или дополнить):\n${stepsToText(ctx.asisSteps)}`);
    if (ownSource === "tobeSteps" && ctx.tobeSteps?.length)
      existing.push(`Уже существующие этапы TO-BE:\n${stepsToText(ctx.tobeSteps)}`);
    if (ownSource === "asisErrors" && ctx.asisErrors?.length)
      existing.push(`Уже существующие риски AS-IS:\n${errorsToText(ctx.asisErrors)}`);
    if (ownSource === "tobeErrors" && ctx.tobeErrors?.length)
      existing.push(`Уже существующие риски TO-BE:\n${errorsToText(ctx.tobeErrors)}`);
    if (ownSource === "capexItems" && ctx.capexItems?.length)
      existing.push(`Уже существующие CAPEX:\n${capexToText(ctx.capexItems)}`);
    if (ownSource === "opexItems" && ctx.opexItems?.length)
      existing.push(`Уже существующие OPEX:\n${opexToText(ctx.opexItems)}`);
    if (existing.length) existingData = "\n" + existing.join("\n") + "\n";
  }

  // {{contextBlock}} — context from other tabs (generation only)
  const contextBlock = promptType === "generation"
    ? buildContextBlock(ctx, ownSource)
    : "";

  // {{asisContext}} — for verification prompts of TO-BE and errors_tobe
  let asisContext = "";
  if (promptType === "verification") {
    if ((tabType === "process_tobe") && ctx.asisSteps?.length)
      asisContext = `\nЭтапы AS-IS для сравнения:\n${stepsToText(ctx.asisSteps)}\n`;
    if ((tabType === "errors_tobe") && ctx.asisErrors?.length)
      asisContext = `\nРиски AS-IS (исходная картина для сравнения):\n${errorsToText(ctx.asisErrors)}\n`;
  }

  return template
    .replace(/\{\{calcName\}\}/g, calcName)
    .replace(/\{\{existingData\}\}/g, existingData)
    .replace(/\{\{contextBlock\}\}/g, contextBlock)
    .replace(/\{\{jsonSchema\}\}/g, schema)
    .replace(/\{\{generatedJson\}\}/g, generatedJson ?? "")
    .replace(/\{\{asisContext\}\}/g, asisContext);
}

// ─── Public build functions ──────────────────────────────────────────────────

export function buildGenerationMessages(
  tabType: TabType,
  userPrompt: string,
  ctx: GenerateContext,
  customPrompt?: string
) {
  const calcName = ctx.calculationName || "без названия";
  const template = customPrompt ?? DEFAULT_PROMPTS[tabType].generation;

  const systemContent = substitutePrompt({
    tabType,
    promptType: "generation",
    template,
    calcName,
    ctx,
  });

  return [
    { role: "system" as const, content: systemContent },
    { role: "user" as const, content: userPrompt },
  ];
}

export function buildVerificationMessages(
  tabType: TabType,
  generatedJson: string,
  ctx: GenerateContext,
  customPrompt?: string
) {
  const calcName = ctx.calculationName || "без названия";
  const template = customPrompt ?? DEFAULT_PROMPTS[tabType].verification;

  const systemContent = substitutePrompt({
    tabType,
    promptType: "verification",
    template,
    calcName,
    ctx,
    generatedJson,
  });

  return [
    { role: "system" as const, content: systemContent },
    { role: "user" as const, content: `Проверь и исправь при необходимости:\n${generatedJson}` },
  ];
}

// ─── UI meta (labels, placeholders) ──────────────────────────────────────────

export const TAB_META: Record<
  TabType,
  {
    title: string;
    placeholder: string;
    contextHint: (ctx: GenerateContext) => string;
  }
> = {
  process_asis: {
    title: "Описание текущего процесса (AS-IS)",
    placeholder:
      "Опишите процесс своими словами: что делается, кто участвует, какие шаги, сколько времени занимает. Например: «Менеджер получает заявку по email, проверяет её вручную, вносит данные в 1С, отправляет на согласование руководителю...»",
    contextHint: (ctx) => {
      const count = ctx.asisSteps?.length ?? 0;
      return count > 0
        ? `Уже заполнено ${count} этап(ов) — ИИ дополнит или скорректирует список`
        : "Вкладка пустая — ИИ создаст этапы с нуля";
    },
  },
  process_tobe: {
    title: "Как ИИ изменит процесс (TO-BE)",
    placeholder:
      "Опишите, что должен делать ИИ: какие шаги автоматизировать, что ускорить, что убрать. Или напишите «предположи сам» — и ИИ предложит реалистичный вариант на основе AS-IS.",
    contextHint: (ctx) => {
      const count = ctx.tobeSteps?.length ?? 0;
      return count > 0 ? `Уже заполнено ${count} этап(ов) — ИИ дополнит или скорректирует список` : "";
    },
  },
  errors_asis: {
    title: "Риски текущего процесса (AS-IS)",
    placeholder:
      "Опишите типичные риски, сбои и проблемы процесса. Например: «Менеджеры часто вносят данные с опечатками, случается потеря заявок, согласование затягивается из-за отсутствия руководителя...»",
    contextHint: (ctx) => {
      const count = ctx.asisErrors?.length ?? 0;
      return count > 0 ? `Уже добавлено ${count} рисков — ИИ дополнит список` : "";
    },
  },
  errors_tobe: {
    title: "Остаточные риски после внедрения ИИ (TO-BE)",
    placeholder:
      "Опишите, какие риски останутся после внедрения ИИ и как они изменятся. Или напишите «предположи сам» — ИИ реалистично снизит частоту рисков AS-IS и добавит новые риски от ИИ.",
    contextHint: (ctx) => {
      const count = ctx.tobeErrors?.length ?? 0;
      return count > 0 ? `Уже добавлено ${count} рисков — ИИ дополнит список` : "";
    },
  },
  capex: {
    title: "Единовременные затраты на внедрение ИИ (CAPEX)",
    placeholder:
      "Опишите планируемое решение: что разрабатывается, какой масштаб, есть ли готовые компоненты. Например: «Интеграция ChatGPT API в CRM систему Битрикс24, команда 3 разработчика».",
    contextHint: (ctx) => {
      const count = ctx.capexItems?.length ?? 0;
      return count > 0 ? `Уже добавлено ${count} статей — ИИ дополнит список` : "";
    },
  },
  opex: {
    title: "Ежемесячные затраты на поддержку ИИ (OPEX)",
    placeholder:
      "Опишите инфраструктуру решения: какие API используются, где хостится, нужна ли поддержка. Например: «Используем OpenAI API, хостинг на AWS, нужна ежемесячная поддержка от вендора».",
    contextHint: (ctx) => {
      const count = ctx.opexItems?.length ?? 0;
      return count > 0 ? `Уже добавлено ${count} статей — ИИ дополнит список` : "";
    },
  },
};
