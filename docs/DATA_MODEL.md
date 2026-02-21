# Модель данных: AI ROI Calculator

## ER-диаграмма (текстовая)

```
Calculation (1) ──── (*) ProcessStep
Calculation (1) ──── (*) ErrorItem
Calculation (1) ──── (*) CapexItem
Calculation (1) ──── (*) OpexItem
Calculation (1) ──── (1) RolloutConfig

Template (1) ──── (*) TemplateProcessStep
Template (1) ──── (*) TemplateErrorItem
Template (1) ──── (*) TemplateCapexItem
Template (1) ──── (*) TemplateOpexItem
Template (1) ──── (1) TemplateRolloutConfig
```

---

## Таблицы

### Calculation

Основная сущность — один расчёт ROI.

| Поле | Тип | Описание |
|------|-----|----------|
| id | String (UUID) | Уникальный идентификатор |
| name | String | Название расчёта |
| createdAt | DateTime | Дата создания |
| updatedAt | DateTime | Дата последнего изменения |
| templateId | String? | ID шаблона, если создан из шаблона |

---

### ProcessStep

Этап процесса (используется для AS-IS и TO-BE).

| Поле | Тип | Описание |
|------|-----|----------|
| id | String (UUID) | PK |
| calculationId | String | FK → Calculation |
| type | Enum: `AS_IS`, `TO_BE` | Тип процесса |
| order | Int | Порядковый номер |
| name | String | Название этапа |
| employee | String | Сотрудник / роль |
| hourlyRate | Float | Цена часа (₽) |
| timeHours | Float | Время в часах |
| calendarDays | Float | Календарный срок в днях |
| executionShare | Float | Доля в выполнении (0–1) |
| extraCost | Float | Доп. затраты на этап (подрядчик, сервис, ₽) |

**Вычисляемые поля (на клиенте):**
- `stepCost` = hourlyRate × timeHours + extraCost
- `unitTime` = timeHours × executionShare
- `unitCost` = stepCost × executionShare

---

### ErrorItem

Ошибка процесса (AS-IS и TO-BE).

| Поле | Тип | Описание |
|------|-----|----------|
| id | String (UUID) | PK |
| calculationId | String | FK → Calculation |
| type | Enum: `AS_IS`, `TO_BE` | Тип |
| order | Int | Порядковый номер |
| name | String | Тип ошибки |
| processStep | String | На каком этапе |
| frequency | Float | Частота (доля случаев, 0–1) |
| fixCost | Float | Стоимость исправления (₽) |
| fixTimeHours | Float | Время на исправление (часы) |

**Вычисляемые поля (на клиенте):**
- `unitErrorCost` = frequency × fixCost
- `unitErrorTime` = frequency × fixTimeHours

---

### RolloutConfig

Параметры раскатки ИИ-решения.

| Поле | Тип | Описание |
|------|-----|----------|
| id | String (UUID) | PK |
| calculationId | String (unique) | FK → Calculation |
| model | Enum: `LINEAR`, `S_CURVE`, `INSTANT` | Модель раскатки |
| rolloutMonths | Int | Срок полной раскатки (месяцев) |
| targetShare | Float | Целевая доля операций (0–1) |
| operationsPerMonth | Int | Объём операций в месяц |

---

### CapexItem

Статья единовременных затрат.

| Поле | Тип | Описание |
|------|-----|----------|
| id | String (UUID) | PK |
| calculationId | String | FK → Calculation |
| order | Int | Порядковый номер |
| name | String | Название статьи |
| amount | Float | Сумма (₽) |
| comment | String? | Комментарий |

---

### OpexItem

Статья ежемесячных затрат.

| Поле | Тип | Описание |
|------|-----|----------|
| id | String (UUID) | PK |
| calculationId | String | FK → Calculation |
| order | Int | Порядковый номер |
| name | String | Название статьи |
| monthlyAmount | Float | Сумма в месяц (₽) |
| comment | String? | Комментарий |

---

### Template

Шаблон для библиотеки.

| Поле | Тип | Описание |
|------|-----|----------|
| id | String (UUID) | PK |
| name | String | Название шаблона |
| description | String | Описание |
| industry | String | Отрасль / категория |
| isPublished | Boolean | Опубликован ли |
| createdAt | DateTime | Дата создания |
| updatedAt | DateTime | Дата изменения |

---

### TemplateProcessStep

Этап процесса в шаблоне (без стоимостных полей).

| Поле | Тип | Описание |
|------|-----|----------|
| id | String (UUID) | PK |
| templateId | String | FK → Template |
| type | Enum: `AS_IS`, `TO_BE` | Тип |
| order | Int | Порядковый номер |
| name | String | Название этапа |
| employee | String | Сотрудник / роль |
| timeHours | Float? | Время в часах (опционально) |
| calendarDays | Float? | Календарный срок (опционально) |
| executionShare | Float? | Доля в выполнении (опционально) |

*Примечание: hourlyRate отсутствует — пользователь подставляет свою часовую ставку. timeHours и calendarDays сохраняются в шаблоне как ориентировочные значения.*

---

### TemplateErrorItem

| Поле | Тип | Описание |
|------|-----|----------|
| id | String (UUID) | PK |
| templateId | String | FK → Template |
| type | Enum: `AS_IS`, `TO_BE` | Тип |
| order | Int | Порядковый номер |
| name | String | Тип ошибки |
| processStep | String | Этап |
| frequency | Float? | Частота (опционально) |

*Примечание: fixCost и fixTimeHours отсутствуют.*

---

### TemplateCapexItem

| Поле | Тип | Описание |
|------|-----|----------|
| id | String (UUID) | PK |
| templateId | String | FK → Template |
| order | Int | Порядковый номер |
| name | String | Название статьи |
| comment | String? | Комментарий |

*Примечание: amount отсутствует.*

---

### TemplateOpexItem

| Поле | Тип | Описание |
|------|-----|----------|
| id | String (UUID) | PK |
| templateId | String | FK → Template |
| order | Int | Порядковый номер |
| name | String | Название статьи |
| comment | String? | Комментарий |

*Примечание: monthlyAmount отсутствует.*

---

### TemplateRolloutConfig

| Поле | Тип | Описание |
|------|-----|----------|
| id | String (UUID) | PK |
| templateId | String (unique) | FK → Template |
| model | Enum: `LINEAR`, `S_CURVE`, `INSTANT` | Модель раскатки |
| rolloutMonths | Int? | Срок раскатки |
| targetShare | Float? | Целевая доля |

---

## Prisma Schema (превью)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Calculation {
  id        String   @id @default(uuid())
  name      String   @default("Новый расчёт")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  templateId String?

  processSteps  ProcessStep[]
  errorItems    ErrorItem[]
  capexItems    CapexItem[]
  opexItems     OpexItem[]
  rolloutConfig RolloutConfig?
}

model ProcessStep {
  id             String @id @default(uuid())
  calculationId  String
  type           String // AS_IS | TO_BE
  order          Int
  name           String @default("")
  employee       String @default("")
  hourlyRate     Float  @default(0)
  timeHours      Float  @default(0)
  calendarDays   Float  @default(0)
  executionShare Float  @default(1)
  extraCost      Float  @default(0)

  calculation Calculation @relation(fields: [calculationId], references: [id], onDelete: Cascade)
}

model ErrorItem {
  id            String @id @default(uuid())
  calculationId String
  type          String // AS_IS | TO_BE
  order         Int
  name          String @default("")
  processStep   String @default("")
  frequency     Float  @default(0)
  fixCost       Float  @default(0)
  fixTimeHours  Float  @default(0)

  calculation Calculation @relation(fields: [calculationId], references: [id], onDelete: Cascade)
}

model RolloutConfig {
  id                 String @id @default(uuid())
  calculationId      String @unique
  model              String @default("LINEAR") // LINEAR | S_CURVE | INSTANT
  rolloutMonths      Int    @default(6)
  targetShare        Float  @default(1)
  operationsPerMonth Int    @default(100)

  calculation Calculation @relation(fields: [calculationId], references: [id], onDelete: Cascade)
}

model CapexItem {
  id            String  @id @default(uuid())
  calculationId String
  order         Int
  name          String  @default("")
  amount        Float   @default(0)
  comment       String?

  calculation Calculation @relation(fields: [calculationId], references: [id], onDelete: Cascade)
}

model OpexItem {
  id            String  @id @default(uuid())
  calculationId String
  order         Int
  name          String  @default("")
  monthlyAmount Float   @default(0)
  comment       String?

  calculation Calculation @relation(fields: [calculationId], references: [id], onDelete: Cascade)
}

// --- Шаблоны ---

model Template {
  id          String   @id @default(uuid())
  name        String
  description String   @default("")
  industry    String   @default("")
  isPublished Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  processSteps  TemplateProcessStep[]
  errorItems    TemplateErrorItem[]
  capexItems    TemplateCapexItem[]
  opexItems     TemplateOpexItem[]
  rolloutConfig TemplateRolloutConfig?
}

model TemplateProcessStep {
  id             String @id @default(uuid())
  templateId     String
  type           String
  order          Int
  name           String @default("")
  employee       String @default("")
  timeHours      Float?
  calendarDays   Float?
  executionShare Float?

  template Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
}

model TemplateErrorItem {
  id          String @id @default(uuid())
  templateId  String
  type        String
  order       Int
  name        String @default("")
  processStep String @default("")
  frequency   Float?

  template Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
}

model TemplateCapexItem {
  id         String  @id @default(uuid())
  templateId String
  order      Int
  name       String  @default("")
  comment    String?

  template Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
}

model TemplateOpexItem {
  id         String  @id @default(uuid())
  templateId String
  order      Int
  name       String  @default("")
  comment    String?

  template Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
}

model TemplateRolloutConfig {
  id            String @id @default(uuid())
  templateId    String @unique
  model         String @default("LINEAR")
  rolloutMonths Int?
  targetShare   Float?

  template Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
}
```

---

## Индексы

Для SQLite с низкой нагрузкой индексы минимальны:
- PK на id (автоматический)
- FK индексы (calculationId, templateId) — Prisma создаёт автоматически
- Unique на `RolloutConfig.calculationId` и `TemplateRolloutConfig.templateId`

---

## Миграция из шаблона в расчёт

При создании расчёта из шаблона:
1. Создаётся `Calculation` с `templateId`
2. `TemplateProcessStep` → `ProcessStep` (с `hourlyRate = 0`; `timeHours`, `calendarDays`, `executionShare` берутся из шаблона)
3. `TemplateErrorItem` → `ErrorItem` (с `fixCost = 0`, `fixTimeHours = 0`; `frequency` берётся из шаблона)
4. `TemplateCapexItem` → `CapexItem` (с `amount = 0`)
5. `TemplateOpexItem` → `OpexItem` (с `monthlyAmount = 0`)
6. `TemplateRolloutConfig` → `RolloutConfig` (с `operationsPerMonth = 0`; `model`, `rolloutMonths`, `targetShare` берутся из шаблона)
