import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

const USER_EMAIL = "sam.yakushev@gmail.com";
const CALCULATION_NAME = "Расчёт себестоимости тепловоза";

// AS-IS steps from расчет_трудозатрат.csv
// Skipping: header, ШАГ X. section headers, ИТОГО rows, БЛОК rows
const asisSteps: {
  name: string;
  employee: string;
  hourlyRate: number;
  timeHours: number;
  calendarDays: number;
  executionShare: number;
}[] = [
  // ШАГ 1
  { name: "Запросить у КБ перечень действующих спецификаций и версий КД", employee: "Координатор", hourlyRate: 500, timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответа от КБ", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминание КБ при отсутствии ответа", employee: "Координатор", hourlyRate: 500, timeHours: 0.5, calendarDays: 1, executionShare: 0.5 },
  { name: "Получить перечень и проверить на полноту", employee: "Калькулятор", hourlyRate: 600, timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Зафиксировать спецификации как базу расчёта", employee: "Калькулятор", hourlyRate: 600, timeHours: 2, calendarDays: 1, executionShare: 1 },
  // ШАГ 2
  { name: "Запросить у КБ подтверждение актуальности состава изделия и спецификаций", employee: "Координатор", hourlyRate: 500, timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответа от КБ", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминание КБ при отсутствии ответа в срок", employee: "Координатор", hourlyRate: 500, timeHours: 0.5, calendarDays: 1, executionShare: 0.5 },
  { name: "Получить ответ и зафиксировать отличия от предыдущего расчёта в составе изделия", employee: "Калькулятор", hourlyRate: 600, timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Подтвердить что спецификации актуальны и можно переходить к сбору цен", employee: "Руководитель", hourlyRate: 1000, timeHours: 1, calendarDays: 1, executionShare: 1 },
  // ШАГ 3
  { name: "Выгрузить из спецификаций список покупных позиций с объёмами", employee: "Калькулятор", hourlyRate: 600, timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Запросить у снабжения подтверждение объёмов и списка поставщиков", employee: "Ценовик", hourlyRate: 600, timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответа от снабжения", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминание снабжению", employee: "Ценовик", hourlyRate: 600, timeHours: 0.5, calendarDays: 1, executionShare: 0.5 },
  { name: "Сверить список с тем что реально проходит через производственный процесс", employee: "Ценовик", hourlyRate: 600, timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Зафиксировать утверждённый перечень закупаемых позиций с объёмами", employee: "Ценовик", hourlyRate: 600, timeHours: 1, calendarDays: 1, executionShare: 1 },
  // ШАГ 4
  { name: "Подготовить запрос КП (перечень позиций объёмы условия поставки дедлайн)", employee: "Ценовик", hourlyRate: 600, timeHours: 8, calendarDays: 2, executionShare: 1 },
  { name: "Разослать запрос утверждённым поставщикам", employee: "Ценовик", hourlyRate: 600, timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответов поставщиков", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 10, executionShare: 1 },
  { name: "Направить напоминание поставщикам не ответившим в срок", employee: "Ценовик", hourlyRate: 600, timeHours: 2, calendarDays: 1, executionShare: 0.7 },
  { name: "Ожидание ответов после напоминания", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 0.7 },
  { name: "Получить КП и проверить каждое на полноту (цены сроки партии условия)", employee: "Ценовик", hourlyRate: 600, timeHours: 8, calendarDays: 2, executionShare: 1 },
  { name: "Направить уточняющие запросы при неполноте или неясности КП", employee: "Ценовик", hourlyRate: 600, timeHours: 3, calendarDays: 1, executionShare: 0.6 },
  { name: "Ожидание уточнений от поставщиков", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 0.6 },
  { name: "Получить окончательные данные и подтвердить их достаточность", employee: "Ценовик", hourlyRate: 600, timeHours: 2, calendarDays: 1, executionShare: 1 },
  // ШАГ 5
  { name: "Привести все КП к единой валюте по курсу на расчётную дату", employee: "Ценовик", hourlyRate: 600, timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Добавить транспортные и прочие сопутствующие расходы к ценам", employee: "Ценовик", hourlyRate: 600, timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Учесть условия минимальных партий и их влияние на удельную стоимость", employee: "Ценовик", hourlyRate: 600, timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Сформировать сравнительную таблицу по поставщикам для ключевых позиций", employee: "Ценовик", hourlyRate: 600, timeHours: 6, calendarDays: 2, executionShare: 1 },
  { name: "Выбрать и обосновать базовые цены по каждой позиции", employee: "Ценовик", hourlyRate: 600, timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Передать базовые цены на согласование руководителю и финансовому отделу", employee: "Координатор", hourlyRate: 500, timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание согласования базовых цен", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 3, executionShare: 1 },
  { name: "Ответить на уточняющие вопросы по ценам", employee: "Ценовик", hourlyRate: 600, timeHours: 2, calendarDays: 1, executionShare: 0.7 },
  { name: "Получить подтверждение базовых цен", employee: "Координатор", hourlyRate: 500, timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  { name: "Зафиксировать утверждённые цены в расчётных таблицах или системе", employee: "Калькулятор", hourlyRate: 600, timeHours: 2, calendarDays: 1, executionShare: 1 },
  // ШАГ 6
  { name: "Направить запросы одновременно: в ОТиЗ — ставки труда по разрядам; в плановый отдел — ставки оборудования", employee: "Координатор", hourlyRate: 500, timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответов от ОТиЗ и планового отдела", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминания при отсутствии ответа в срок", employee: "Координатор", hourlyRate: 500, timeHours: 0.5, calendarDays: 1, executionShare: 0.5 },
  { name: "Получить ответы и сравнить ставки труда и оборудования с действующими в системе", employee: "Калькулятор", hourlyRate: 600, timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Уточнить причины расхождений при их наличии", employee: "Координатор", hourlyRate: 500, timeHours: 1, calendarDays: 1, executionShare: 0.5 },
  { name: "Внести скорректированные ставки в учётную систему", employee: "Калькулятор", hourlyRate: 600, timeHours: 2, calendarDays: 1, executionShare: 1 },
  // ШАГ 7
  { name: "Запросить у ПЭО актуальные сметы и бюджеты по центрам затрат", employee: "Координатор", hourlyRate: 500, timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответа от ПЭО", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминание ПЭО", employee: "Координатор", hourlyRate: 500, timeHours: 0.5, calendarDays: 1, executionShare: 0.5 },
  { name: "Получить сметы и рассчитать ставки ОПР и ОХР по центрам затрат", employee: "Калькулятор", hourlyRate: 600, timeHours: 8, calendarDays: 2, executionShare: 1 },
  { name: "Передать рассчитанные ставки на согласование плановому отделу и финансам", employee: "Координатор", hourlyRate: 500, timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание согласования ставок", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 3, executionShare: 1 },
  { name: "Ответить на уточняющие вопросы по ставкам", employee: "Калькулятор", hourlyRate: 600, timeHours: 2, calendarDays: 1, executionShare: 0.6 },
  { name: "Получить подтверждение ставок", employee: "Координатор", hourlyRate: 500, timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  { name: "Зафиксировать утверждённые ставки в учётной системе", employee: "Калькулятор", hourlyRate: 600, timeHours: 2, calendarDays: 1, executionShare: 1 },
  // ШАГ 8
  { name: "Подготовить расчётные таблицы или настроить расчёт в учётной системе", employee: "Калькулятор", hourlyRate: 600, timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Заполнить утверждёнными базовыми закупочными ценами", employee: "Калькулятор", hourlyRate: 600, timeHours: 6, calendarDays: 1, executionShare: 1 },
  { name: "Выполнить расчёт по деталям сборочным единицам и узлам", employee: "Калькулятор", hourlyRate: 600, timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Проверить результаты на аномалии", employee: "Калькулятор", hourlyRate: 600, timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Устранить ошибки или объяснить обоснованные отклонения", employee: "Калькулятор", hourlyRate: 600, timeHours: 4, calendarDays: 1, executionShare: 0.6 },
  // ШАГ 9
  { name: "Выгрузить маршруты и нормы по всем позициям из системы", employee: "Калькулятор", hourlyRate: 600, timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Применить актуальные ставки к нормо-часам и машино-часам", employee: "Калькулятор", hourlyRate: 600, timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Рассчитать затраты по операциям узлам и тепловозу в целом", employee: "Калькулятор", hourlyRate: 600, timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Проверить результаты на аномалии", employee: "Калькулятор", hourlyRate: 600, timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Устранить ошибки или объяснить обоснованные отклонения", employee: "Калькулятор", hourlyRate: 600, timeHours: 4, calendarDays: 1, executionShare: 0.6 },
  // ШАГ 10
  { name: "Применить ставки накладных к базам распределения по каждому центру затрат", employee: "Калькулятор", hourlyRate: 600, timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Отнести накладные на уровень узлов и готового тепловоза", employee: "Калькулятор", hourlyRate: 600, timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Проверить корректность разнесения — сверка суммы с бюджетом", employee: "Калькулятор", hourlyRate: 600, timeHours: 2, calendarDays: 1, executionShare: 1 },
  // ШАГ 11
  { name: "Проверить полноту входных данных в системе", employee: "Калькулятор", hourlyRate: 600, timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Запустить пересчёт стандартной себестоимости от деталей до готового тепловоза", employee: "Калькулятор", hourlyRate: 600, timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Проверить журнал ошибок после расчёта", employee: "Калькулятор", hourlyRate: 600, timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Устранить ошибки и перезапустить расчёт при необходимости", employee: "Калькулятор", hourlyRate: 600, timeHours: 4, calendarDays: 1, executionShare: 0.4 },
  { name: "Выгрузить результаты расчёта для анализа", employee: "Калькулятор", hourlyRate: 600, timeHours: 1, calendarDays: 1, executionShare: 1 },
  // ШАГ 12
  { name: "Сравнить новую стандартную себестоимость с предыдущей версией постатейно", employee: "Калькулятор", hourlyRate: 600, timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Сравнить с фактическими данными за период", employee: "Калькулятор", hourlyRate: 600, timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Выделить вклад каждой составляющей (материалы ставки накладные)", employee: "Калькулятор", hourlyRate: 600, timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Подготовить аналитическую справку с объяснением ключевых отклонений", employee: "Калькулятор", hourlyRate: 600, timeHours: 6, calendarDays: 2, executionShare: 1 },
  { name: "Уточнить нетипичные отклонения у производства или снабжения", employee: "Координатор", hourlyRate: 500, timeHours: 1, calendarDays: 1, executionShare: 0.5 },
  { name: "Скорректировать входные данные и перезапустить расчёт при необходимости", employee: "Калькулятор", hourlyRate: 600, timeHours: 4, calendarDays: 1, executionShare: 0.3 },
  // ШАГ 13
  { name: "Подготовить пакет материалов для согласования (расчёт справка допущения цены)", employee: "Калькулятор", hourlyRate: 600, timeHours: 8, calendarDays: 2, executionShare: 1 },
  { name: "Разослать пакет в КБ ТБ производство снабжение финансы коммерцию", employee: "Координатор", hourlyRate: 500, timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответов от служб", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 7, executionShare: 1 },
  { name: "Направить напоминание службам не ответившим в срок", employee: "Координатор", hourlyRate: 500, timeHours: 1, calendarDays: 1, executionShare: 0.8 },
  { name: "Ожидание ответов после напоминания", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 3, executionShare: 0.8 },
  { name: "Собрать и систематизировать замечания и вопросы от каждой службы", employee: "Координатор", hourlyRate: 500, timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Ответить на уточняющие вопросы по методологии ценам и допущениям", employee: "Калькулятор", hourlyRate: 600, timeHours: 4, calendarDays: 2, executionShare: 0.8 },
  { name: "Провести рабочее совещание при существенных разногласиях", employee: "Руководитель", hourlyRate: 1000, timeHours: 3, calendarDays: 1, executionShare: 0.3 },
  { name: "Скорректировать расчёт и направить на повторное согласование", employee: "Калькулятор", hourlyRate: 600, timeHours: 4, calendarDays: 1, executionShare: 0.3 },
  { name: "Ожидание повторных ответов после доработки", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 3, executionShare: 0.3 },
  { name: "Получить итоговое согласование от всех служб", employee: "Координатор", hourlyRate: 500, timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Оформить протокол согласования с фиксацией допущений и решений", employee: "Координатор", hourlyRate: 500, timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Передать протокол на утверждение уполномоченному руководителю", employee: "Координатор", hourlyRate: 500, timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  { name: "Получить подписанный протокол", employee: "Координатор", hourlyRate: 500, timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  // ШАГ 14
  { name: "Активировать новые стандартные себестоимости и ставки в системе", employee: "Калькулятор", hourlyRate: 600, timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Провести контрольную проверку — сверить несколько позиций вручную", employee: "Калькулятор", hourlyRate: 600, timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Проверить что отчёты план/факт перестроились на новые данные", employee: "Калькулятор", hourlyRate: 600, timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Направить уведомление службам об активации новых ставок и дате вступления", employee: "Координатор", hourlyRate: 500, timeHours: 1, calendarDays: 1, executionShare: 1 },
  // БЛОК 2 / ШАГ 15
  { name: "Выгрузить нормо-часы по операциям в разрезе производственных участков", employee: "Плановик", hourlyRate: 650, timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Сопоставить операции с производственным календарём и режимом работы участков", employee: "Плановик", hourlyRate: 650, timeHours: 6, calendarDays: 1, executionShare: 1 },
  { name: "Рассчитать длительность цикла по узлам с учётом параллельности операций", employee: "Плановик", hourlyRate: 650, timeHours: 8, calendarDays: 2, executionShare: 1 },
  { name: "Добавить нормативные сроки поставки ключевых покупных комплектующих", employee: "Плановик", hourlyRate: 650, timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Получить итоговый нормативный срок от запуска до сдачи тепловоза", employee: "Плановик", hourlyRate: 650, timeHours: 2, calendarDays: 1, executionShare: 1 },
  // ШАГ 16
  { name: "Запросить у производства данные о загрузке участков и оборудования на расчётный период", employee: "Координатор", hourlyRate: 500, timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответа от производства", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминание при отсутствии ответа в срок", employee: "Координатор", hourlyRate: 500, timeHours: 0.5, calendarDays: 1, executionShare: 0.5 },
  { name: "Сопоставить потребность по тепловозу с доступными мощностями", employee: "Плановик", hourlyRate: 650, timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Выявить узкие места — участки с недостаточной пропускной способностью", employee: "Плановик", hourlyRate: 650, timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Оформить справку о доступных мощностях с выводом о реалистичности срока", employee: "Плановик", hourlyRate: 650, timeHours: 3, calendarDays: 1, executionShare: 1 },
  // ШАГ 17
  { name: "Определить возможную дату запуска с учётом комплектующих и мощностей", employee: "Плановик", hourlyRate: 650, timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Составить укрупнённый производственный график по узлам и этапам сборки", employee: "Плановик", hourlyRate: 650, timeHours: 8, calendarDays: 2, executionShare: 1 },
  { name: "Направить проект графика на согласование в производство и снабжение одновременно", employee: "Координатор", hourlyRate: 500, timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответов", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминания при отсутствии ответа в срок", employee: "Координатор", hourlyRate: 500, timeHours: 0.5, calendarDays: 1, executionShare: 0.5 },
  { name: "Скорректировать график по полученным замечаниям", employee: "Плановик", hourlyRate: 650, timeHours: 3, calendarDays: 1, executionShare: 0.6 },
  { name: "Согласовать итоговый график", employee: "Координатор", hourlyRate: 500, timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Передать утверждённый график руководителю", employee: "Координатор", hourlyRate: 500, timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  { name: "Зафиксировать плановую дату сдачи как основу для коммерческого предложения", employee: "Руководитель", hourlyRate: 1000, timeHours: 1, calendarDays: 1, executionShare: 1 },
];

// TO-BE steps from расчет_трудозатрат_ИИ.csv
const tobeSteps: typeof asisSteps = [
  // ШАГ 1
  { name: "Запросить у КБ перечень действующих спецификаций и версий КД", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответа от КБ", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминание КБ при отсутствии ответа", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0, calendarDays: 1, executionShare: 0.5 },
  { name: "Получить перечень и проверить на полноту", employee: "Калькулятор", hourlyRate: 1200, timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  { name: "Зафиксировать спецификации как базу расчёта", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  // ШАГ 2
  { name: "Запросить у КБ подтверждение актуальности состава изделия и спецификаций", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответа от КБ", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминание КБ при отсутствии ответа в срок", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0, calendarDays: 1, executionShare: 0.5 },
  { name: "Получить ответ и зафиксировать отличия от предыдущего расчёта в составе изделия", employee: "Калькулятор", hourlyRate: 1200, timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  { name: "Подтвердить что спецификации актуальны и можно переходить к сбору цен", employee: "Руководитель", hourlyRate: 2000, timeHours: 0.3, calendarDays: 1, executionShare: 1 },
  // ШАГ 3
  { name: "Выгрузить из спецификаций список покупных позиций с объёмами", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.2, calendarDays: 1, executionShare: 1 },
  { name: "Запросить у снабжения подтверждение объёмов и списка поставщиков", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответа от снабжения", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминание снабжению", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0, calendarDays: 1, executionShare: 0.5 },
  { name: "Сверить список с тем что реально проходит через производственный процесс", employee: "Ценовик", hourlyRate: 1200, timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  { name: "Зафиксировать утверждённый перечень закупаемых позиций с объёмами", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  // ШАГ 4
  { name: "Подготовить запрос КП (перечень позиций объёмы условия поставки дедлайн)", employee: "Ценовик", hourlyRate: 1200, timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Разослать запрос утверждённым поставщикам", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответов поставщиков", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 10, executionShare: 1 },
  { name: "Направить напоминание поставщикам не ответившим в срок", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0, calendarDays: 1, executionShare: 0.7 },
  { name: "Ожидание ответов после напоминания", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 0.7 },
  { name: "Получить КП и проверить каждое на полноту (цены сроки партии условия)", employee: "Ценовик", hourlyRate: 1200, timeHours: 1, calendarDays: 2, executionShare: 1 },
  { name: "Направить уточняющие запросы при неполноте или неясности КП", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 0.6 },
  { name: "Ожидание уточнений от поставщиков", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 0.6 },
  { name: "Получить окончательные данные и подтвердить их достаточность", employee: "Ценовик", hourlyRate: 1200, timeHours: 0.3, calendarDays: 1, executionShare: 1 },
  // ШАГ 5
  { name: "Привести все КП к единой валюте по курсу на расчётную дату", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Добавить транспортные и прочие сопутствующие расходы к ценам", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.2, calendarDays: 1, executionShare: 1 },
  { name: "Учесть условия минимальных партий и их влияние на удельную стоимость", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Сформировать сравнительную таблицу по поставщикам для ключевых позиций", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Выбрать и обосновать базовые цены по каждой позиции", employee: "Ценовик", hourlyRate: 1200, timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Передать базовые цены на согласование руководителю и финансовому отделу", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание согласования базовых цен", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 3, executionShare: 1 },
  { name: "Ответить на уточняющие вопросы по ценам", employee: "Ценовик", hourlyRate: 1200, timeHours: 0.5, calendarDays: 1, executionShare: 0.7 },
  { name: "Получить подтверждение базовых цен", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Зафиксировать утверждённые цены в расчётных таблицах или системе", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  // ШАГ 6
  { name: "Направить запросы одновременно: в ОТиЗ — ставки труда по разрядам; в плановый отдел — ставки оборудования", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответов от ОТиЗ и планового отдела", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминания при отсутствии ответа в срок", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0, calendarDays: 1, executionShare: 0.5 },
  { name: "Получить ответы и сравнить ставки труда и оборудования с действующими в системе", employee: "Калькулятор", hourlyRate: 1200, timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  { name: "Уточнить причины расхождений при их наличии", employee: "Координатор", hourlyRate: 1100, timeHours: 0.5, calendarDays: 1, executionShare: 0.5 },
  { name: "Внести скорректированные ставки в учётную систему", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  // ШАГ 7
  { name: "Запросить у ПЭО актуальные сметы и бюджеты по центрам затрат", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответа от ПЭО", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминание ПЭО", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0, calendarDays: 1, executionShare: 0.5 },
  { name: "Получить сметы и рассчитать ставки ОПР и ОХР по центрам затрат", employee: "Калькулятор", hourlyRate: 1200, timeHours: 1, calendarDays: 2, executionShare: 1 },
  { name: "Передать рассчитанные ставки на согласование плановому отделу и финансам", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание согласования ставок", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 3, executionShare: 1 },
  { name: "Ответить на уточняющие вопросы по ставкам", employee: "Калькулятор", hourlyRate: 1200, timeHours: 0.5, calendarDays: 1, executionShare: 0.6 },
  { name: "Получить подтверждение ставок", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Зафиксировать утверждённые ставки в учётной системе", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  // ШАГ 8
  { name: "Подготовить расчётные таблицы или настроить расчёт в учётной системе", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Заполнить утверждёнными базовыми закупочными ценами", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Выполнить расчёт по деталям сборочным единицам и узлам", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Проверить результаты на аномалии", employee: "Калькулятор", hourlyRate: 1200, timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  { name: "Устранить ошибки или объяснить обоснованные отклонения", employee: "Калькулятор", hourlyRate: 1200, timeHours: 1, calendarDays: 1, executionShare: 0.6 },
  // ШАГ 9
  { name: "Выгрузить маршруты и нормы по всем позициям из системы", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Применить актуальные ставки к нормо-часам и машино-часам", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Рассчитать затраты по операциям узлам и тепловозу в целом", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Проверить результаты на аномалии", employee: "Калькулятор", hourlyRate: 1200, timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  { name: "Устранить ошибки или объяснить обоснованные отклонения", employee: "Калькулятор", hourlyRate: 1200, timeHours: 1, calendarDays: 1, executionShare: 0.6 },
  // ШАГ 10
  { name: "Применить ставки накладных к базам распределения по каждому центру затрат", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Отнести накладные на уровень узлов и готового тепловоза", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Проверить корректность разнесения — сверка суммы с бюджетом", employee: "Калькулятор", hourlyRate: 1200, timeHours: 0.3, calendarDays: 1, executionShare: 1 },
  // ШАГ 11
  { name: "Проверить полноту входных данных в системе", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Запустить пересчёт стандартной себестоимости от деталей до готового тепловоза", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Проверить журнал ошибок после расчёта", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Устранить ошибки и перезапустить расчёт при необходимости", employee: "Калькулятор", hourlyRate: 1200, timeHours: 1, calendarDays: 1, executionShare: 0.4 },
  { name: "Выгрузить результаты расчёта для анализа", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  // ШАГ 12
  { name: "Сравнить новую стандартную себестоимость с предыдущей версией постатейно", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.2, calendarDays: 1, executionShare: 1 },
  { name: "Сравнить с фактическими данными за период", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.2, calendarDays: 1, executionShare: 1 },
  { name: "Выделить вклад каждой составляющей (материалы ставки накладные)", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.2, calendarDays: 1, executionShare: 1 },
  { name: "Подготовить аналитическую справку с объяснением ключевых отклонений", employee: "Калькулятор", hourlyRate: 1200, timeHours: 1.5, calendarDays: 1, executionShare: 1 },
  { name: "Уточнить нетипичные отклонения у производства или снабжения", employee: "Координатор", hourlyRate: 1100, timeHours: 0.5, calendarDays: 1, executionShare: 0.5 },
  { name: "Скорректировать входные данные и перезапустить расчёт при необходимости", employee: "Калькулятор", hourlyRate: 1200, timeHours: 0.3, calendarDays: 1, executionShare: 0.3 },
  // ШАГ 13
  { name: "Подготовить пакет материалов для согласования (расчёт справка допущения цены)", employee: "Калькулятор", hourlyRate: 1200, timeHours: 2, calendarDays: 2, executionShare: 1 },
  { name: "Разослать пакет в КБ ТБ производство снабжение финансы коммерцию", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответов от служб", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 7, executionShare: 1 },
  { name: "Направить напоминание службам не ответившим в срок", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0, calendarDays: 1, executionShare: 0.8 },
  { name: "Ожидание ответов после напоминания", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 3, executionShare: 0.8 },
  { name: "Собрать и систематизировать замечания и вопросы от каждой службы", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.2, calendarDays: 1, executionShare: 1 },
  { name: "Ответить на уточняющие вопросы по методологии ценам и допущениям", employee: "Калькулятор", hourlyRate: 1200, timeHours: 1, calendarDays: 2, executionShare: 0.8 },
  { name: "Провести рабочее совещание при существенных разногласиях", employee: "Руководитель", hourlyRate: 2000, timeHours: 2, calendarDays: 1, executionShare: 0.3 },
  { name: "Скорректировать расчёт и направить на повторное согласование", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.5, calendarDays: 1, executionShare: 0.3 },
  { name: "Ожидание повторных ответов после доработки", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 3, executionShare: 0.3 },
  { name: "Получить итоговое согласование от всех служб", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Оформить протокол согласования с фиксацией допущений и решений", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.3, calendarDays: 1, executionShare: 1 },
  { name: "Передать протокол на утверждение уполномоченному руководителю", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Получить подписанный протокол", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  // ШАГ 14
  { name: "Активировать новые стандартные себестоимости и ставки в системе", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.2, calendarDays: 1, executionShare: 1 },
  { name: "Провести контрольную проверку — сверить несколько позиций вручную", employee: "Калькулятор", hourlyRate: 1200, timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  { name: "Проверить что отчёты план/факт перестроились на новые данные", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.2, calendarDays: 1, executionShare: 1 },
  { name: "Направить уведомление службам об активации новых ставок и дате вступления", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  // БЛОК 2 / ШАГ 15
  { name: "Выгрузить нормо-часы по операциям в разрезе производственных участков", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Сопоставить операции с производственным календарём и режимом работы участков", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.3, calendarDays: 1, executionShare: 1 },
  { name: "Рассчитать длительность цикла по узлам с учётом параллельности операций", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.3, calendarDays: 1, executionShare: 1 },
  { name: "Добавить нормативные сроки поставки ключевых покупных комплектующих", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Получить итоговый нормативный срок от запуска до сдачи тепловоза", employee: "Плановик", hourlyRate: 1300, timeHours: 0.3, calendarDays: 1, executionShare: 1 },
  // ШАГ 16
  { name: "Запросить у производства данные о загрузке участков и оборудования на расчётный период", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответа от производства", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминание при отсутствии ответа в срок", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0, calendarDays: 1, executionShare: 0.5 },
  { name: "Сопоставить потребность по тепловозу с доступными мощностями", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.3, calendarDays: 1, executionShare: 1 },
  { name: "Выявить узкие места — участки с недостаточной пропускной способностью", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.2, calendarDays: 1, executionShare: 1 },
  { name: "Оформить справку о доступных мощностях с выводом о реалистичности срока", employee: "Плановик", hourlyRate: 1300, timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  // ШАГ 17
  { name: "Определить возможную дату запуска с учётом комплектующих и мощностей", employee: "Плановик", hourlyRate: 1300, timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  { name: "Составить укрупнённый производственный график по узлам и этапам сборки", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.5, calendarDays: 2, executionShare: 1 },
  { name: "Направить проект графика на согласование в производство и снабжение одновременно", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответов", employee: "—", hourlyRate: 0, timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминания при отсутствии ответа в срок", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0, calendarDays: 1, executionShare: 0.5 },
  { name: "Скорректировать график по полученным замечаниям", employee: "Плановик", hourlyRate: 1300, timeHours: 0.5, calendarDays: 1, executionShare: 0.6 },
  { name: "Согласовать итоговый график", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Передать утверждённый график руководителю", employee: "ИИ-агент", hourlyRate: 50, timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Зафиксировать плановую дату сдачи как основу для коммерческого предложения", employee: "Руководитель", hourlyRate: 2000, timeHours: 0.3, calendarDays: 1, executionShare: 1 },
];

async function main() {
  console.log(`Looking up user: ${USER_EMAIL}...`);

  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL },
  });

  if (!user) {
    throw new Error(`User not found: ${USER_EMAIL}`);
  }

  console.log(`User found: ${user.id} (${user.email}, role: ${user.role})`);

  // Delete existing calculation with same name for this user to allow re-running
  const deleted = await prisma.calculation.deleteMany({
    where: { name: CALCULATION_NAME, userId: user.id },
  });
  if (deleted.count > 0) {
    console.log(`Deleted ${deleted.count} existing calculation(s) with name "${CALCULATION_NAME}"`);
  }

  const calculation = await prisma.calculation.create({
    data: {
      name: CALCULATION_NAME,
      userId: user.id,
      isTemplate: false,
      processSteps: {
        createMany: {
          data: [
            ...asisSteps.map((step, idx) => ({
              type: "AS_IS",
              order: idx + 1,
              name: step.name,
              employee: step.employee,
              hourlyRate: step.hourlyRate,
              timeHours: step.timeHours,
              calendarDays: step.calendarDays,
              executionShare: step.executionShare,
            })),
            ...tobeSteps.map((step, idx) => ({
              type: "TO_BE",
              order: idx + 1,
              name: step.name,
              employee: step.employee,
              hourlyRate: step.hourlyRate,
              timeHours: step.timeHours,
              calendarDays: step.calendarDays,
              executionShare: step.executionShare,
            })),
          ],
        },
      },
      rolloutConfig: {
        create: {
          model: "LINEAR",
          rolloutMonths: 12,
          targetShare: 1,
          operationsPerMonth: 12,
        },
      },
    },
  });

  console.log(`\nCalculation created successfully!`);
  console.log(`  ID: ${calculation.id}`);
  console.log(`  Name: "${calculation.name}"`);
  console.log(`  User: ${USER_EMAIL}`);
  console.log(`  AS-IS steps: ${asisSteps.length}`);
  console.log(`  TO-BE steps: ${tobeSteps.length}`);
  console.log(`\nOpen at: http://89.23.112.115/${calculation.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
