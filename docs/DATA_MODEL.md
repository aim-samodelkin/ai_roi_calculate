# Модель данных: AI ROI Calculator

## ER-диаграмма (текстовая)

```
User (1) ──── (*) Calculation

Calculation (1) ──── (*) ProcessStep
Calculation (1) ──── (*) ErrorItem
Calculation (1) ──── (*) CapexItem
Calculation (1) ──── (*) OpexItem
Calculation (1) ──── (1) RolloutConfig
```

Шаблоны — это те же записи `Calculation` с флагом `isTemplate = true`. Отдельных Template-моделей нет.

---

## Таблицы

### User

Зарегистрированный пользователь.

| Поле | Тип | Описание |
|------|-----|----------|
| id | String (UUID) | Уникальный идентификатор |
| email | String (unique) | Email пользователя |
| passwordHash | String | Хеш пароля (bcrypt) |
| role | String | `USER` или `ADMIN` |
| createdAt | DateTime | Дата регистрации |
| updatedAt | DateTime | Дата последнего обновления |

Роль `ADMIN` назначается автоматически при регистрации, если email входит в список `ADMIN_EMAILS` (env-переменная).

---

### Calculation

Основная сущность — один расчёт ROI. Шаблоны — это расчёты с `isTemplate = true`.

| Поле | Тип | Описание |
|------|-----|----------|
| id | String (UUID) | Уникальный идентификатор |
| name | String | Название расчёта |
| createdAt | DateTime | Дата создания |
| updatedAt | DateTime | Дата последнего изменения |
| templateId | String? | ID шаблона-источника (если создан из шаблона) |
| userId | String? | FK → User (null для анонимных расчётов) |
| isTemplate | Boolean | Является ли шаблоном (default: false) |
| description | String | Описание шаблона (default: "") |
| industry | String | Отрасль/категория шаблона (default: "") |
| isPublished | Boolean | Шаблон опубликован (виден в библиотеке) |

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
| timeUnit | String | `hours` или `minutes` |
| calendarDays | Float | Календарный срок в днях |
| executionShare | Float | Доля в выполнении (0–1) |
| extraCost | Float | Доп. затраты на этап (₽) |

**Вычисляемые поля (на клиенте):**
- `stepCost` = hourlyRate × timeHours + extraCost
- `unitTime` = timeHours × executionShare
- `unitCost` = stepCost × executionShare

---

### ErrorItem

Риск процесса (AS-IS и TO-BE). Структура аналогична `ProcessStep`.

| Поле | Тип | Описание |
|------|-----|----------|
| id | String (UUID) | PK |
| calculationId | String | FK → Calculation |
| type | Enum: `AS_IS`, `TO_BE` | Тип |
| order | Int | Порядковый номер |
| name | String | Тип риска / описание |
| employee | String | Роль сотрудника, устраняющего риск |
| hourlyRate | Float | Цена часа сотрудника (₽) |
| timeHours | Float | Время на устранение одного случая (ч) |
| timeUnit | String | `hours` или `minutes` |
| calendarDays | Float | Срок устранения в календарных днях |
| extraCost | Float | Прямые доп. затраты (штрафы, переработка и пр.) (₽) |
| frequency | Float | Вероятность возникновения (0–1) |

**Вычисляемые поля (на клиенте):**
- `riskCost` = hourlyRate × timeHours + extraCost
- `unitErrorCost` = riskCost × frequency
- `unitErrorTime` = timeHours × frequency

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
| operationsPerMonth | Int | Базовый объём операций в месяц |
| growthEnabled | Boolean | Учитывать рост объёма операций (default: false) |
| growthType | Enum: `COMPOUND`, `LINEAR_ABS` | Тип роста: сложный процент или линейный прирост |
| growthRate | Float | Для COMPOUND — доля роста в месяц (0.05 = 5%); для LINEAR_ABS — прирост в операциях/мес. |
| growthCeiling | Int? | Потолок операций в месяц (null = без ограничений) |

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

## Prisma Schema

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  role         String   @default("USER") // USER | ADMIN
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  calculations Calculation[]
}

model Calculation {
  id          String   @id @default(uuid())
  name        String   @default("Новый расчёт")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  templateId  String?
  userId      String?
  isTemplate  Boolean  @default(false)
  description String   @default("")
  industry    String   @default("")
  isPublished Boolean  @default(false)

  user          User?          @relation(fields: [userId], references: [id])
  processSteps  ProcessStep[]
  errorItems    ErrorItem[]
  capexItems    CapexItem[]
  opexItems     OpexItem[]
  rolloutConfig RolloutConfig?
}

model RolloutConfig {
  id                 String   @id @default(uuid())
  calculationId      String   @unique
  model              String   @default("LINEAR") // LINEAR | S_CURVE | INSTANT
  rolloutMonths      Int      @default(6)
  targetShare        Float    @default(1)
  operationsPerMonth Int      @default(100)
  growthEnabled      Boolean  @default(false)
  growthType         String   @default("COMPOUND") // COMPOUND | LINEAR_ABS
  growthRate         Float    @default(0)
  growthCeiling      Int?

  calculation Calculation @relation(fields: [calculationId], references: [id], onDelete: Cascade)
}
```

---

## Авторизация

- Сессия хранится в httpOnly-cookie (`roi-auth`) со временем жизни 30 дней
- Cookie содержит JWT, подписанный `JWT_SECRET` (env-переменная)
- JWT payload: `{ userId, email, role }`
- Роль `ADMIN` задаётся при регистрации через env-список `ADMIN_EMAILS`
- Флаг `Secure` у куки управляется переменной `COOKIE_SECURE`:
  - `COOKIE_SECURE=true` — устанавливать только при HTTPS (иначе браузер не отправит куку)
  - `COOKIE_SECURE=false` или не задана — для HTTP-деплоев (текущий продакшн по IP)

---

## Шаблоны

Шаблон — это запись `Calculation` с `isTemplate = true`. Структура идентична обычному расчёту, содержит все поля включая стоимости.

**Создание шаблона:**
Администратор нажимает «Сохранить как шаблон» в расчёте → API `/api/templates/from-calculation` копирует все данные расчёта в новую запись `Calculation` с `isTemplate = true`.

**Использование шаблона:**
`POST /api/templates/:id/use` — создаёт новый расчёт, копируя все поля шаблона (включая стоимости). Если пользователь авторизован — расчёт привязывается к его аккаунту.

---

## Анонимный доступ

- Расчёт создаётся без `userId` (анонимный)
- ID расчёта сохраняется в localStorage браузера
- Авторизованный пользователь: расчёты привязаны к аккаунту, localStorage не используется

---

## ИИ-генерация данных

Функционал ИИ-генерации (кнопка «Заполнить с ИИ» на вкладках калькулятора) **не добавляет новых таблиц в БД**. ИИ работает как stateless-генератор:

1. Клиент отправляет контекст расчёта и описание от пользователя на сервер
2. Сервер вызывает OpenRouter API (двухшаговая цепочка)
3. Сервер возвращает готовые объекты (`ProcessStep[]`, `ErrorItem[]` и т.д.) клиенту
4. Клиент применяет данные локально и запускает обычное автосохранение через `PUT /api/calculations/:id`

---

## Индексы

Для SQLite с низкой нагрузкой индексы минимальны:
- PK на id (автоматический)
- FK индексы (calculationId, userId) — Prisma создаёт автоматически
- Unique на `User.email`
- Unique на `RolloutConfig.calculationId`
