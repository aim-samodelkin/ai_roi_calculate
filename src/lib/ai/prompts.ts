import type { ProcessStep, ErrorItem, CapexItem, OpexItem } from "@/types";

export type TabType =
  | "process_asis"
  | "process_tobe"
  | "errors_asis"
  | "errors_tobe"
  | "capex"
  | "opex";

export interface GenerateContext {
  calculationName: string;
  asisSteps?: ProcessStep[];
  tobeSteps?: ProcessStep[];
  asisErrors?: ErrorItem[];
  tobeErrors?: ErrorItem[];
  capexItems?: CapexItem[];
  opexItems?: OpexItem[];
  existingData?: ProcessStep[] | ErrorItem[] | CapexItem[] | OpexItem[];
}

// ─── helpers ────────────────────────────────────────────────────────────────

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

// ─── JSON schema descriptions for each tab ──────────────────────────────────

const PROCESS_STEP_SCHEMA = `{
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

const ERROR_ITEM_SCHEMA = `{
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

const CAPEX_SCHEMA = `{
  "items": [
    {
      "name": "string — название статьи затрат",
      "amount": "number — сумма в рублях",
      "comment": "string — необязательное пояснение (или пустая строка)"
    }
  ],
  "reasoning": "string — краткое пояснение"
}`;

const OPEX_SCHEMA = `{
  "items": [
    {
      "name": "string — название статьи затрат",
      "monthlyAmount": "number — сумма в месяц в рублях",
      "comment": "string — необязательное пояснение (или пустая строка)"
    }
  ],
  "reasoning": "string — краткое пояснение"
}`;

// ─── Generation prompts ──────────────────────────────────────────────────────

export function buildGenerationMessages(
  tabType: TabType,
  userPrompt: string,
  ctx: GenerateContext
) {
  const calcName = ctx.calculationName || "без названия";

  switch (tabType) {
    case "process_asis": {
      const existing = (ctx.existingData as ProcessStep[] | undefined) ?? [];
      return [
        {
          role: "system" as const,
          content: `Ты эксперт по анализу и оптимизации бизнес-процессов. Твоя задача — на основе описания от пользователя сформировать структурированный список этапов текущего процесса (AS-IS).

Расчёт называется: «${calcName}»

${existing.length > 0 ? `Уже существующие этапы AS-IS (их можно скорректировать или дополнить):\n${stepsToText(existing)}\n` : ""}

Требования к каждому этапу:
- Название должно быть конкретным и понятным
- Роль сотрудника — реальная должность или роль
- timeHours: реалистичные трудозатраты в часах (может быть дробным)
- calendarDays: длительность в днях (обычно ≥ timeHours / 8)
- executionShare: 1.0 если этап происходит всегда, меньше если условно
- hourlyRate: оставь 0 (пользователь подставит свои ставки)
- extraCost: 0 если нет прямых затрат

Верни строго JSON согласно схеме:
${PROCESS_STEP_SCHEMA}`,
        },
        {
          role: "user" as const,
          content: userPrompt,
        },
      ];
    }

    case "process_tobe": {
      const asis = ctx.asisSteps ?? [];
      const existing = (ctx.existingData as ProcessStep[] | undefined) ?? [];
      return [
        {
          role: "system" as const,
          content: `Ты эксперт по внедрению ИИ в бизнес-процессы. Твоя задача — сформировать целевой процесс TO-BE (как процесс будет выглядеть после внедрения ИИ).

Расчёт называется: «${calcName}»

Текущий процесс AS-IS (${asis.length} этапов):
${stepsToText(asis)}

${existing.length > 0 ? `Уже существующие этапы TO-BE:\n${stepsToText(existing)}\n` : ""}

Правила формирования TO-BE:
- Сохрани все этапы AS-IS, которые ИИ не меняет (с теми же значениями)
- Для этапов, которые ИИ ускоряет: снизь timeHours и calendarDays
- Для этапов, которые ИИ выполняет полностью: поставь employee = "ИИ-система", сильно снизь timeHours
- Этапы, которые ИИ устраняет полностью: не включай в TO-BE (или сильно снизь долю executionShare)
- Не будь чрезмерно оптимистичен: ИИ редко даёт >5x ускорение на этап
- hourlyRate оставь 0

Если пользователь просит предположить TO-BE самостоятельно — предложи реалистичную автоматизацию для данного типа процесса.

Верни строго JSON согласно схеме:
${PROCESS_STEP_SCHEMA}`,
        },
        {
          role: "user" as const,
          content: userPrompt,
        },
      ];
    }

    case "errors_asis": {
      const asis = ctx.asisSteps ?? [];
      const existing = (ctx.existingData as ErrorItem[] | undefined) ?? [];
      return [
        {
          role: "system" as const,
          content: `Ты эксперт по анализу качества бизнес-процессов. Твоя задача — выявить типичные ошибки и сбои в текущем процессе (AS-IS).

Расчёт называется: «${calcName}»

Этапы процесса AS-IS (${asis.length} этапов):
${stepsToText(asis)}

${existing.length > 0 ? `Уже существующие ошибки AS-IS:\n${errorsToText(existing)}\n` : ""}

Требования:
- Укажи реальные ошибки, типичные для таких процессов
- processStep должен совпадать с названием реального этапа из AS-IS (или быть близким)
- frequency: доля случаев от 0 до 1 (0.05–0.30 типично)
- fixCost: затраты на исправление одной ошибки в рублях
- fixTimeHours: время на исправление в часах
- Не дублируй уже существующие ошибки

Верни строго JSON согласно схеме:
${ERROR_ITEM_SCHEMA}`,
        },
        {
          role: "user" as const,
          content: userPrompt,
        },
      ];
    }

    case "errors_tobe": {
      const asisErrors = ctx.asisErrors ?? [];
      const tobe = ctx.tobeSteps ?? [];
      const existing = (ctx.existingData as ErrorItem[] | undefined) ?? [];
      return [
        {
          role: "system" as const,
          content: `Ты эксперт по оценке влияния ИИ на качество процессов. Твоя задача — показать, как ИИ изменит картину ошибок TO-BE.

Расчёт называется: «${calcName}»

Ошибки AS-IS (исходная картина):
${errorsToText(asisErrors)}

Целевой процесс TO-BE (${tobe.length} этапов):
${stepsToText(tobe)}

${existing.length > 0 ? `Уже существующие ошибки TO-BE:\n${errorsToText(existing)}\n` : ""}

Правила:
- Для каждой ошибки AS-IS реши: исчезает ли она, снижается ли частота или стоимость исправления
- ИИ редко устраняет ошибки полностью — как правило снижает частоту на 30–80%
- Новые типы ошибок, специфичные для ИИ-системы: добавь (ошибки ИИ, сбои интеграции)
- fixCost и fixTimeHours должны быть > 0 для оставшихся ошибок

Верни строго JSON согласно схеме:
${ERROR_ITEM_SCHEMA}`,
        },
        {
          role: "user" as const,
          content: userPrompt,
        },
      ];
    }

    case "capex": {
      const asis = ctx.asisSteps ?? [];
      const tobe = ctx.tobeSteps ?? [];
      const existing = (ctx.existingData as CapexItem[] | undefined) ?? [];
      return [
        {
          role: "system" as const,
          content: `Ты эксперт по экономике внедрения ИИ-решений. Твоя задача — сформировать список единовременных затрат (CAPEX) на внедрение ИИ.

Расчёт называется: «${calcName}»

Процесс AS-IS (${asis.length} этапов): ${asis.map((s) => s.name).join(", ") || "нет данных"}
Процесс TO-BE (${tobe.length} этапов): ${tobe.map((s) => s.name).join(", ") || "нет данных"}

${existing.length > 0 ? `Уже существующие CAPEX:\n${capexToText(existing)}\n` : ""}

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
${CAPEX_SCHEMA}`,
        },
        {
          role: "user" as const,
          content: userPrompt,
        },
      ];
    }

    case "opex": {
      const tobe = ctx.tobeSteps ?? [];
      const capex = ctx.capexItems ?? [];
      const existing = (ctx.existingData as OpexItem[] | undefined) ?? [];
      return [
        {
          role: "system" as const,
          content: `Ты эксперт по экономике ИИ-решений. Твоя задача — сформировать список ежемесячных операционных затрат (OPEX) на поддержку ИИ.

Расчёт называется: «${calcName}»

Процесс TO-BE (${tobe.length} этапов): ${tobe.map((s) => s.name).join(", ") || "нет данных"}

Единовременные затраты (CAPEX) для контекста:
${capexToText(capex)}

${existing.length > 0 ? `Уже существующие OPEX:\n${opexToText(existing)}\n` : ""}

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
${OPEX_SCHEMA}`,
        },
        {
          role: "user" as const,
          content: userPrompt,
        },
      ];
    }
  }
}

// ─── Verification prompts ────────────────────────────────────────────────────

export function buildVerificationMessages(
  tabType: TabType,
  generatedJson: string,
  ctx: GenerateContext
) {
  const calcName = ctx.calculationName || "без названия";

  const intro = `Ты строгий аналитик, проверяющий данные для ROI-калькулятора. Расчёт: «${calcName}».
Ниже — JSON, сгенерированный на предыдущем шаге. Проверь его и верни исправленную версию в том же формате.`;

  switch (tabType) {
    case "process_asis":
      return [
        {
          role: "system" as const,
          content: `${intro}

Критерии проверки для этапов процесса AS-IS:
1. Логический порядок: этапы идут в реальной последовательности
2. Полнота: нет ли явно пропущенных шагов
3. Реалистичность timeHours: типичный этап — от 0.1 до 8 часов (может быть больше для длительных задач)
4. calendarDays ≥ timeHours / 8 (минимум)
5. executionShare от 0 до 1; если этап необязательный — доля < 1
6. Нет дублирующих этапов

Если всё верно — верни данные без изменений. Если есть проблемы — исправь и поясни в reasoning.

Верни строго JSON в том же формате:
${PROCESS_STEP_SCHEMA}`,
        },
        {
          role: "user" as const,
          content: `Проверь и исправь при необходимости:\n${generatedJson}`,
        },
      ];

    case "process_tobe": {
      const asis = ctx.asisSteps ?? [];
      return [
        {
          role: "system" as const,
          content: `${intro}

Этапы AS-IS для сравнения:
${stepsToText(asis)}

Критерии проверки для TO-BE:
1. Улучшения реалистичны: ИИ даёт 2–10x ускорение на автоматизируемых этапах (не 100x)
2. Этапы, не затронутые ИИ, должны иметь те же значения что в AS-IS
3. Ни один этап не должен иметь timeHours = 0 (если этап есть, значит время тратится)
4. executionShare корректен
5. Общее количество этапов TO-BE ≤ AS-IS + 3 (ИИ редко добавляет много новых шагов)

Исправь нереалистичные оценки. Верни JSON:
${PROCESS_STEP_SCHEMA}`,
        },
        {
          role: "user" as const,
          content: `Проверь и исправь при необходимости:\n${generatedJson}`,
        },
      ];
    }

    case "errors_asis":
      return [
        {
          role: "system" as const,
          content: `${intro}

Критерии проверки для ошибок AS-IS:
1. frequency реалистична: 0.01–0.5 (ошибки с частотой > 50% — исключение)
2. fixCost > 0 (исправление всегда стоит денег)
3. fixTimeHours > 0
4. processStep указывает на реальный этап процесса
5. Нет дублирующих ошибок
6. Не более 10–15 ошибок (качество важнее количества)

Исправь и верни JSON:
${ERROR_ITEM_SCHEMA}`,
        },
        {
          role: "user" as const,
          content: `Проверь и исправь:\n${generatedJson}`,
        },
      ];

    case "errors_tobe": {
      const asisErrors = ctx.asisErrors ?? [];
      return [
        {
          role: "system" as const,
          content: `${intro}

Ошибки AS-IS (исходная картина для сравнения):
${errorsToText(asisErrors)}

Критерии проверки для ошибок TO-BE:
1. frequency TO-BE ≤ frequency AS-IS (ИИ не увеличивает частоту ошибок для тех же типов)
2. Ни одна ошибка не должна иметь frequency = 0 (если ошибка в TO-BE, она ненулевая)
3. fixCost и fixTimeHours > 0
4. Новые ошибки ИИ (сбои, галлюцинации) логичны для данного контекста
5. Снижение не должно быть > 90% для всех ошибок сразу

Исправь и верни JSON:
${ERROR_ITEM_SCHEMA}`,
        },
        {
          role: "user" as const,
          content: `Проверь и исправь:\n${generatedJson}`,
        },
      ];
    }

    case "capex":
      return [
        {
          role: "system" as const,
          content: `${intro}

Критерии проверки для CAPEX:
1. Есть статья на разработку / интеграцию (обычно самая крупная)
2. Есть статья на обучение персонала
3. Суммы реалистичны для российского рынка: разработка — от 300 000 ₽, обучение — от 30 000 ₽
4. Не более 8–10 статей
5. amount > 0 для каждой статьи

Верни JSON:
${CAPEX_SCHEMA}`,
        },
        {
          role: "user" as const,
          content: `Проверь и исправь:\n${generatedJson}`,
        },
      ];

    case "opex":
      return [
        {
          role: "system" as const,
          content: `${intro}

Критерии проверки для OPEX:
1. Есть статья на AI API / модели (если решение их использует)
2. Суммы реалистичны: минимальный OPEX для ИИ-решения — от 5 000 ₽/мес
3. monthlyAmount > 0 для каждой статьи
4. Не более 6–8 статей

Верни JSON:
${OPEX_SCHEMA}`,
        },
        {
          role: "user" as const,
          content: `Проверь и исправь:\n${generatedJson}`,
        },
      ];
  }
}

// ─── UI meta (labels, placeholders) ─────────────────────────────────────────

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
    contextHint: (ctx) =>
      ctx.asisSteps && ctx.asisSteps.length > 0
        ? `Уже заполнено ${ctx.asisSteps.length} этап(ов) — ИИ дополнит или скорректирует список`
        : "Вкладка пустая — ИИ создаст этапы с нуля",
  },
  process_tobe: {
    title: "Как ИИ изменит процесс (TO-BE)",
    placeholder:
      "Опишите, что должен делать ИИ: какие шаги автоматизировать, что ускорить, что убрать. Или напишите «предположи сам» — и ИИ предложит реалистичный вариант на основе AS-IS.",
    contextHint: (ctx) => {
      const parts: string[] = [];
      if (ctx.asisSteps && ctx.asisSteps.length > 0)
        parts.push(`AS-IS: ${ctx.asisSteps.length} этапов`);
      if (ctx.tobeSteps && ctx.tobeSteps.length > 0)
        parts.push(`TO-BE уже заполнен: ${ctx.tobeSteps.length} этапов`);
      return parts.length > 0 ? `Контекст: ${parts.join(", ")}` : "Контекст будет взят из AS-IS";
    },
  },
  errors_asis: {
    title: "Ошибки текущего процесса (AS-IS)",
    placeholder:
      "Опишите типичные ошибки, сбои и проблемы процесса. Например: «Менеджеры часто вносят данные с опечатками, случается потеря заявок, согласование затягивается из-за отсутствия руководителя...»",
    contextHint: (ctx) => {
      const parts: string[] = [];
      if (ctx.asisSteps && ctx.asisSteps.length > 0)
        parts.push(`${ctx.asisSteps.length} этапов AS-IS`);
      if (ctx.asisErrors && ctx.asisErrors.length > 0)
        parts.push(`${ctx.asisErrors.length} ошибок уже добавлено`);
      return parts.length > 0 ? `Учтёт: ${parts.join(", ")}` : "Опишите процесс для лучшего результата";
    },
  },
  errors_tobe: {
    title: "Остаточные ошибки после внедрения ИИ (TO-BE)",
    placeholder:
      "Опишите, какие ошибки останутся после внедрения ИИ и как они изменятся. Или напишите «предположи сам» — ИИ реалистично снизит частоту ошибок AS-IS и добавит новые риски от ИИ.",
    contextHint: (ctx) => {
      const parts: string[] = [];
      if (ctx.asisErrors && ctx.asisErrors.length > 0)
        parts.push(`AS-IS ошибок: ${ctx.asisErrors.length}`);
      if (ctx.tobeSteps && ctx.tobeSteps.length > 0)
        parts.push(`TO-BE процесс: ${ctx.tobeSteps.length} этапов`);
      return parts.length > 0 ? `Контекст: ${parts.join(", ")}` : "";
    },
  },
  capex: {
    title: "Единовременные затраты на внедрение ИИ (CAPEX)",
    placeholder:
      "Опишите планируемое решение: что разрабатывается, какой масштаб, есть ли готовые компоненты. Например: «Интеграция ChatGPT API в CRM систему Битрикс24, команда 3 разработчика».",
    contextHint: (ctx) => {
      const parts: string[] = [];
      if (ctx.asisSteps && ctx.asisSteps.length > 0)
        parts.push(`процесс AS-IS: ${ctx.asisSteps.length} эт.`);
      if (ctx.tobeSteps && ctx.tobeSteps.length > 0)
        parts.push(`TO-BE: ${ctx.tobeSteps.length} эт.`);
      if (ctx.capexItems && ctx.capexItems.length > 0)
        parts.push(`CAPEX уже: ${ctx.capexItems.length} статей`);
      return parts.length > 0 ? `Контекст: ${parts.join(", ")}` : "";
    },
  },
  opex: {
    title: "Ежемесячные затраты на поддержку ИИ (OPEX)",
    placeholder:
      "Опишите инфраструктуру решения: какие API используются, где хостится, нужна ли поддержка. Например: «Используем OpenAI API, хостинг на AWS, нужна ежемесячная поддержка от вендора».",
    contextHint: (ctx) => {
      const parts: string[] = [];
      if (ctx.capexItems && ctx.capexItems.length > 0)
        parts.push(`CAPEX: ${ctx.capexItems.length} статей`);
      if (ctx.opexItems && ctx.opexItems.length > 0)
        parts.push(`OPEX уже: ${ctx.opexItems.length} статей`);
      return parts.length > 0 ? `Контекст: ${parts.join(", ")}` : "";
    },
  },
};
