import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

// Process steps from CSV, excluding:
// - ШАГ X. header rows (no employee, no data)
// - ИТОГО rows (summaries)
// - БЛОК rows (block headers)
// - Last empty row
const processSteps: {
  name: string;
  employee: string;
  timeHours: number;
  calendarDays: number;
  executionShare: number;
}[] = [
  // ШАГ 1. Подтвердить актуальность конструкторской документации
  { name: "Запросить у КБ перечень действующих спецификаций и версий КД", employee: "Координатор", timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответа от КБ", employee: "—", timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминание КБ при отсутствии ответа", employee: "Координатор", timeHours: 0.5, calendarDays: 1, executionShare: 0.5 },
  { name: "Получить перечень и проверить на полноту", employee: "Калькулятор", timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Зафиксировать спецификации как базу расчёта", employee: "Калькулятор", timeHours: 2, calendarDays: 1, executionShare: 1 },

  // ШАГ 2. Подтвердить актуальность состава изделия
  { name: "Запросить у КБ подтверждение актуальности состава изделия и спецификаций", employee: "Координатор", timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответа от КБ", employee: "—", timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминание КБ при отсутствии ответа в срок", employee: "Координатор", timeHours: 0.5, calendarDays: 1, executionShare: 0.5 },
  { name: "Получить ответ и зафиксировать отличия от предыдущего расчёта в составе изделия", employee: "Калькулятор", timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Подтвердить что спецификации актуальны и можно переходить к сбору цен", employee: "Руководитель", timeHours: 1, calendarDays: 1, executionShare: 1 },

  // ШАГ 3. Уточнить перечень закупаемых материалов и комплектующих
  { name: "Выгрузить из спецификаций список покупных позиций с объёмами", employee: "Калькулятор", timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Запросить у снабжения подтверждение объёмов и списка поставщиков", employee: "Ценовик", timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответа от снабжения", employee: "—", timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминание снабжению", employee: "Ценовик", timeHours: 0.5, calendarDays: 1, executionShare: 0.5 },
  { name: "Сверить список с тем что реально проходит через производственный процесс", employee: "Ценовик", timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Зафиксировать утверждённый перечень закупаемых позиций с объёмами", employee: "Ценовик", timeHours: 1, calendarDays: 1, executionShare: 1 },

  // ШАГ 4. Подготовить и направить запрос КП поставщикам
  { name: "Подготовить запрос КП (перечень позиций, объёмы, условия поставки, дедлайн)", employee: "Ценовик", timeHours: 8, calendarDays: 2, executionShare: 1 },
  { name: "Разослать запрос утверждённым поставщикам", employee: "Ценовик", timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответов поставщиков", employee: "—", timeHours: 0, calendarDays: 10, executionShare: 1 },
  { name: "Направить напоминание поставщикам не ответившим в срок", employee: "Ценовик", timeHours: 2, calendarDays: 1, executionShare: 0.7 },
  { name: "Ожидание ответов после напоминания", employee: "—", timeHours: 0, calendarDays: 5, executionShare: 0.7 },
  { name: "Получить КП и проверить каждое на полноту (цены, сроки, партии, условия)", employee: "Ценовик", timeHours: 8, calendarDays: 2, executionShare: 1 },
  { name: "Направить уточняющие запросы при неполноте или неясности КП", employee: "Ценовик", timeHours: 3, calendarDays: 1, executionShare: 0.6 },
  { name: "Ожидание уточнений от поставщиков", employee: "—", timeHours: 0, calendarDays: 5, executionShare: 0.6 },
  { name: "Получить окончательные данные и подтвердить их достаточность", employee: "Ценовик", timeHours: 2, calendarDays: 1, executionShare: 1 },

  // ШАГ 5. Нормализовать цены и утвердить базовые закупочные цены
  { name: "Привести все КП к единой валюте по курсу на расчётную дату", employee: "Ценовик", timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Добавить транспортные и прочие сопутствующие расходы к ценам", employee: "Ценовик", timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Учесть условия минимальных партий и их влияние на удельную стоимость", employee: "Ценовик", timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Сформировать сравнительную таблицу по поставщикам для ключевых позиций", employee: "Ценовик", timeHours: 6, calendarDays: 2, executionShare: 1 },
  { name: "Выбрать и обосновать базовые цены по каждой позиции", employee: "Ценовик", timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Передать базовые цены на согласование руководителю и финансовому отделу", employee: "Координатор", timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание согласования базовых цен", employee: "—", timeHours: 0, calendarDays: 3, executionShare: 1 },
  { name: "Ответить на уточняющие вопросы по ценам", employee: "Ценовик", timeHours: 2, calendarDays: 1, executionShare: 0.7 },
  { name: "Получить подтверждение базовых цен", employee: "Координатор", timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  { name: "Зафиксировать утверждённые цены в расчётных таблицах или системе", employee: "Калькулятор", timeHours: 2, calendarDays: 1, executionShare: 1 },

  // ШАГ 6. Обновить и подтвердить ставки оплаты труда и использования оборудования
  { name: "Направить запросы одновременно: в ОТиЗ — ставки труда по разрядам; в плановый отдел — ставки оборудования", employee: "Координатор", timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответов от ОТиЗ и планового отдела", employee: "—", timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминания при отсутствии ответа в срок", employee: "Координатор", timeHours: 0.5, calendarDays: 1, executionShare: 0.5 },
  { name: "Получить ответы и сравнить ставки труда и оборудования с действующими в системе", employee: "Калькулятор", timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Уточнить причины расхождений при их наличии", employee: "Координатор", timeHours: 1, calendarDays: 1, executionShare: 0.5 },
  { name: "Внести скорректированные ставки в учётную систему", employee: "Калькулятор", timeHours: 2, calendarDays: 1, executionShare: 1 },

  // ШАГ 7. Пересмотреть ставки распределения накладных расходов
  { name: "Запросить у ПЭО актуальные сметы и бюджеты по центрам затрат", employee: "Координатор", timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответа от ПЭО", employee: "—", timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминание ПЭО", employee: "Координатор", timeHours: 0.5, calendarDays: 1, executionShare: 0.5 },
  { name: "Получить сметы и рассчитать ставки ОПР и ОХР по центрам затрат", employee: "Калькулятор", timeHours: 8, calendarDays: 2, executionShare: 1 },
  { name: "Передать рассчитанные ставки на согласование плановому отделу и финансам", employee: "Координатор", timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание согласования ставок", employee: "—", timeHours: 0, calendarDays: 3, executionShare: 1 },
  { name: "Ответить на уточняющие вопросы по ставкам", employee: "Калькулятор", timeHours: 2, calendarDays: 1, executionShare: 0.6 },
  { name: "Получить подтверждение ставок", employee: "Координатор", timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  { name: "Зафиксировать утверждённые ставки в учётной системе", employee: "Калькулятор", timeHours: 2, calendarDays: 1, executionShare: 1 },

  // ШАГ 8. Рассчитать прямые материальные затраты по деталям и узлам
  { name: "Подготовить расчётные таблицы или настроить расчёт в учётной системе", employee: "Калькулятор", timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Заполнить утверждёнными базовыми закупочными ценами", employee: "Калькулятор", timeHours: 6, calendarDays: 1, executionShare: 1 },
  { name: "Выполнить расчёт по деталям, сборочным единицам и узлам", employee: "Калькулятор", timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Проверить результаты на аномалии", employee: "Калькулятор", timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Устранить ошибки или объяснить обоснованные отклонения", employee: "Калькулятор", timeHours: 4, calendarDays: 1, executionShare: 0.6 },

  // ШАГ 9. Рассчитать прямые затраты труда и оборудования по маршрутам
  { name: "Выгрузить маршруты и нормы по всем позициям из системы", employee: "Калькулятор", timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Применить актуальные ставки к нормо-часам и машино-часам", employee: "Калькулятор", timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Рассчитать затраты по операциям, узлам и тепловозу в целом", employee: "Калькулятор", timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Проверить результаты на аномалии", employee: "Калькулятор", timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Устранить ошибки или объяснить обоснованные отклонения", employee: "Калькулятор", timeHours: 4, calendarDays: 1, executionShare: 0.6 },

  // ШАГ 10. Распределить накладные расходы на изделие
  { name: "Применить ставки накладных к базам распределения по каждому центру затрат", employee: "Калькулятор", timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Отнести накладные на уровень узлов и готового тепловоза", employee: "Калькулятор", timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Проверить корректность разнесения — сверка суммы с бюджетом", employee: "Калькулятор", timeHours: 2, calendarDays: 1, executionShare: 1 },

  // ШАГ 11. Запустить пересчёт стандартной себестоимости в учётной системе
  { name: "Проверить полноту входных данных в системе", employee: "Калькулятор", timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Запустить пересчёт стандартной себестоимости от деталей до готового тепловоза", employee: "Калькулятор", timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Проверить журнал ошибок после расчёта", employee: "Калькулятор", timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Устранить ошибки и перезапустить расчёт при необходимости", employee: "Калькулятор", timeHours: 4, calendarDays: 1, executionShare: 0.4 },
  { name: "Выгрузить результаты расчёта для анализа", employee: "Калькулятор", timeHours: 1, calendarDays: 1, executionShare: 1 },

  // ШАГ 12. Проанализировать изменения себестоимости
  { name: "Сравнить новую стандартную себестоимость с предыдущей версией постатейно", employee: "Калькулятор", timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Сравнить с фактическими данными за период", employee: "Калькулятор", timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Выделить вклад каждой составляющей (материалы, ставки, накладные)", employee: "Калькулятор", timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Подготовить аналитическую справку с объяснением ключевых отклонений", employee: "Калькулятор", timeHours: 6, calendarDays: 2, executionShare: 1 },
  { name: "Уточнить нетипичные отклонения у производства или снабжения", employee: "Координатор", timeHours: 1, calendarDays: 1, executionShare: 0.5 },
  { name: "Скорректировать входные данные и перезапустить расчёт при необходимости", employee: "Калькулятор", timeHours: 4, calendarDays: 1, executionShare: 0.3 },

  // ШАГ 13. Согласовать и утвердить новую себестоимость
  { name: "Подготовить пакет материалов для согласования (расчёт, справка, допущения, цены)", employee: "Калькулятор", timeHours: 8, calendarDays: 2, executionShare: 1 },
  { name: "Разослать пакет в КБ, ТБ, производство, снабжение, финансы, коммерцию", employee: "Координатор", timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответов от служб", employee: "—", timeHours: 0, calendarDays: 7, executionShare: 1 },
  { name: "Направить напоминание службам не ответившим в срок", employee: "Координатор", timeHours: 1, calendarDays: 1, executionShare: 0.8 },
  { name: "Ожидание ответов после напоминания", employee: "—", timeHours: 0, calendarDays: 3, executionShare: 0.8 },
  { name: "Собрать и систематизировать замечания и вопросы от каждой службы", employee: "Координатор", timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Ответить на уточняющие вопросы по методологии, ценам и допущениям", employee: "Калькулятор", timeHours: 4, calendarDays: 2, executionShare: 0.8 },
  { name: "Провести рабочее совещание при существенных разногласиях", employee: "Руководитель", timeHours: 3, calendarDays: 1, executionShare: 0.3 },
  { name: "Скорректировать расчёт и направить на повторное согласование", employee: "Калькулятор", timeHours: 4, calendarDays: 1, executionShare: 0.3 },
  { name: "Ожидание повторных ответов после доработки", employee: "—", timeHours: 0, calendarDays: 3, executionShare: 0.3 },
  { name: "Получить итоговое согласование от всех служб", employee: "Координатор", timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Оформить протокол согласования с фиксацией допущений и решений", employee: "Координатор", timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Передать протокол на утверждение уполномоченному руководителю", employee: "Координатор", timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  { name: "Получить подписанный протокол", employee: "Координатор", timeHours: 0.5, calendarDays: 1, executionShare: 1 },

  // ШАГ 14. Обновить данные в системах и запустить контроль отклонений
  { name: "Активировать новые стандартные себестоимости и ставки в системе", employee: "Калькулятор", timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Провести контрольную проверку — сверить несколько позиций вручную", employee: "Калькулятор", timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Проверить что отчёты план/факт перестроились на новые данные", employee: "Калькулятор", timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Направить уведомление службам об активации новых ставок и дате вступления", employee: "Координатор", timeHours: 1, calendarDays: 1, executionShare: 1 },

  // БЛОК 2. ПРОИЗВОДСТВЕННОЕ ПЛАНИРОВАНИЕ
  // ШАГ 15. Рассчитать нормативный срок изготовления тепловоза
  { name: "Выгрузить нормо-часы по операциям в разрезе производственных участков", employee: "Плановик", timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Сопоставить операции с производственным календарём и режимом работы участков", employee: "Плановик", timeHours: 6, calendarDays: 1, executionShare: 1 },
  { name: "Рассчитать длительность цикла по узлам с учётом параллельности операций", employee: "Плановик", timeHours: 8, calendarDays: 2, executionShare: 1 },
  { name: "Добавить нормативные сроки поставки ключевых покупных комплектующих", employee: "Плановик", timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Получить итоговый нормативный срок от запуска до сдачи тепловоза", employee: "Плановик", timeHours: 2, calendarDays: 1, executionShare: 1 },

  // ШАГ 16. Оценить доступные производственные мощности
  { name: "Запросить у производства данные о загрузке участков и оборудования на расчётный период", employee: "Координатор", timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответа от производства", employee: "—", timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминание при отсутствии ответа в срок", employee: "Координатор", timeHours: 0.5, calendarDays: 1, executionShare: 0.5 },
  { name: "Сопоставить потребность по тепловозу с доступными мощностями", employee: "Плановик", timeHours: 4, calendarDays: 1, executionShare: 1 },
  { name: "Выявить узкие места — участки с недостаточной пропускной способностью", employee: "Плановик", timeHours: 3, calendarDays: 1, executionShare: 1 },
  { name: "Оформить справку о доступных мощностях с выводом о реалистичности срока", employee: "Плановик", timeHours: 3, calendarDays: 1, executionShare: 1 },

  // ШАГ 17. Сформировать и согласовать производственный график
  { name: "Определить возможную дату запуска с учётом комплектующих и мощностей", employee: "Плановик", timeHours: 2, calendarDays: 1, executionShare: 1 },
  { name: "Составить укрупнённый производственный график по узлам и этапам сборки", employee: "Плановик", timeHours: 8, calendarDays: 2, executionShare: 1 },
  { name: "Направить проект графика на согласование в производство и снабжение одновременно", employee: "Координатор", timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Ожидание ответов", employee: "—", timeHours: 0, calendarDays: 5, executionShare: 1 },
  { name: "Направить напоминания при отсутствии ответа в срок", employee: "Координатор", timeHours: 0.5, calendarDays: 1, executionShare: 0.5 },
  { name: "Скорректировать график по полученным замечаниям", employee: "Плановик", timeHours: 3, calendarDays: 1, executionShare: 0.6 },
  { name: "Согласовать итоговый график", employee: "Координатор", timeHours: 1, calendarDays: 1, executionShare: 1 },
  { name: "Передать утверждённый график руководителю", employee: "Координатор", timeHours: 0.5, calendarDays: 1, executionShare: 1 },
  { name: "Зафиксировать плановую дату сдачи как основу для коммерческого предложения", employee: "Руководитель", timeHours: 1, calendarDays: 1, executionShare: 1 },
];

// HR template: Анализ откликов соискателей
const hrProcessStepsAsis: {
  name: string;
  employee: string;
  timeHours: number;
  calendarDays: number;
  executionShare: number;
}[] = [
  // Приём и первичная фильтрация откликов
  { name: "Получить и открыть отклик в системе (HH, почта, ATS)", employee: "Рекрутер", timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Проверить наличие резюме и сопроводительного письма", employee: "Рекрутер", timeHours: 0.1, calendarDays: 1, executionShare: 1 },
  { name: "Прочитать резюме и оценить соответствие требованиям вакансии", employee: "Рекрутер", timeHours: 0.25, calendarDays: 1, executionShare: 1 },
  { name: "Проставить статус в ATS (подходит / не подходит / требует уточнения)", employee: "Рекрутер", timeHours: 0.05, calendarDays: 1, executionShare: 1 },
  { name: "Отправить автоматический отказ нерелевантным кандидатам", employee: "Рекрутер", timeHours: 0.05, calendarDays: 1, executionShare: 0.6 },

  // Первичный скрининг кандидата
  { name: "Подготовить список вопросов для телефонного скрининга", employee: "Рекрутер", timeHours: 0.25, calendarDays: 1, executionShare: 0.4 },
  { name: "Позвонить кандидату для согласования удобного времени скрининга", employee: "Рекрутер", timeHours: 0.2, calendarDays: 1, executionShare: 0.4 },
  { name: "Ожидание дозвона (повторные попытки при недоступности)", employee: "Рекрутер", timeHours: 0.3, calendarDays: 2, executionShare: 0.15 },
  { name: "Провести телефонный скрининг (проверка мотивации, зарплатных ожиданий, доступности)", employee: "Рекрутер", timeHours: 0.5, calendarDays: 1, executionShare: 0.4 },
  { name: "Занести итоги скрининга в ATS, обновить статус кандидата", employee: "Рекрутер", timeHours: 0.2, calendarDays: 1, executionShare: 0.4 },

  // Согласование кандидата с нанимающим менеджером
  { name: "Подготовить краткое саммари по кандидату для нанимающего менеджера", employee: "Рекрутер", timeHours: 0.3, calendarDays: 1, executionShare: 0.25 },
  { name: "Направить саммари нанимающему менеджеру на оценку", employee: "Рекрутер", timeHours: 0.1, calendarDays: 1, executionShare: 0.25 },
  { name: "Ожидание обратной связи от нанимающего менеджера", employee: "—", timeHours: 0, calendarDays: 2, executionShare: 0.25 },
  { name: "Направить напоминание менеджеру при отсутствии ответа", employee: "Рекрутер", timeHours: 0.1, calendarDays: 1, executionShare: 0.1 },
  { name: "Получить решение менеджера и обновить статус в ATS", employee: "Рекрутер", timeHours: 0.1, calendarDays: 1, executionShare: 0.25 },

  // Организация интервью
  { name: "Согласовать слоты для интервью с нанимающим менеджером", employee: "Рекрутер", timeHours: 0.3, calendarDays: 1, executionShare: 0.2 },
  { name: "Предложить кандидату варианты времени интервью", employee: "Рекрутер", timeHours: 0.15, calendarDays: 1, executionShare: 0.2 },
  { name: "Ожидание подтверждения от кандидата", employee: "—", timeHours: 0, calendarDays: 1, executionShare: 0.2 },
  { name: "Создать событие в календаре и выслать приглашение всем участникам", employee: "Рекрутер", timeHours: 0.2, calendarDays: 1, executionShare: 0.2 },
  { name: "Направить кандидату инструкции по формату интервью (онлайн/офис, что взять)", employee: "Рекрутер", timeHours: 0.15, calendarDays: 1, executionShare: 0.2 },

  // Сбор обратной связи после интервью
  { name: "Напомнить интервьюерам о необходимости дать обратную связь", employee: "Рекрутер", timeHours: 0.1, calendarDays: 1, executionShare: 0.2 },
  { name: "Ожидание обратной связи от интервьюеров", employee: "—", timeHours: 0, calendarDays: 2, executionShare: 0.2 },
  { name: "Собрать и агрегировать фидбек в единую оценочную форму", employee: "Рекрутер", timeHours: 0.3, calendarDays: 1, executionShare: 0.2 },
  { name: "Принять итоговое решение совместно с нанимающим менеджером", employee: "Рекрутер", timeHours: 0.5, calendarDays: 1, executionShare: 0.2 },
  { name: "Уведомить кандидата об итоге (оффер или отказ с обратной связью)", employee: "Рекрутер", timeHours: 0.2, calendarDays: 1, executionShare: 0.2 },
];

const hrProcessStepsTobe: typeof hrProcessStepsAsis = [
  // ИИ читает резюме и выдаёт структурированную оценку
  { name: "Получить отклик — ИИ автоматически парсит резюме и проверяет соответствие требованиям", employee: "ИИ-агент", timeHours: 0.02, calendarDays: 1, executionShare: 1 },
  { name: "Рекрутер проверяет оценку ИИ и принимает решение (подходит / не подходит)", employee: "Рекрутер", timeHours: 0.08, calendarDays: 1, executionShare: 1 },
  { name: "ИИ автоматически отправляет отказ с персонализированной обратной связью", employee: "ИИ-агент", timeHours: 0.01, calendarDays: 1, executionShare: 0.6 },

  // ИИ проводит асинхронный скрининг
  { name: "ИИ направляет кандидату скрининговую анкету и ссылку на запись видеоответов", employee: "ИИ-агент", timeHours: 0.01, calendarDays: 1, executionShare: 0.4 },
  { name: "Ожидание ответов кандидата на скрининговую анкету", employee: "—", timeHours: 0, calendarDays: 1, executionShare: 0.4 },
  { name: "ИИ анализирует ответы и формирует итоговое саммари с рейтингом кандидата", employee: "ИИ-агент", timeHours: 0.05, calendarDays: 1, executionShare: 0.4 },
  { name: "Рекрутер просматривает саммари ИИ и принимает решение о переводе к менеджеру", employee: "Рекрутер", timeHours: 0.1, calendarDays: 1, executionShare: 0.4 },

  // Согласование с менеджером — через автоматический отчёт
  { name: "ИИ направляет нанимающему менеджеру структурированный профиль кандидата", employee: "ИИ-агент", timeHours: 0.01, calendarDays: 1, executionShare: 0.25 },
  { name: "Нанимающий менеджер оставляет решение в ATS", employee: "Нанимающий менеджер", timeHours: 0.1, calendarDays: 1, executionShare: 0.25 },

  // Автоматическое планирование интервью
  { name: "ИИ предлагает кандидату слоты из календаря менеджера и рекрутера", employee: "ИИ-агент", timeHours: 0.01, calendarDays: 1, executionShare: 0.2 },
  { name: "Ожидание выбора слота кандидатом", employee: "—", timeHours: 0, calendarDays: 1, executionShare: 0.2 },
  { name: "ИИ автоматически создаёт событие в календаре и рассылает приглашения", employee: "ИИ-агент", timeHours: 0.01, calendarDays: 1, executionShare: 0.2 },

  // Сбор фидбека и итог
  { name: "ИИ автоматически запрашивает фидбек у интервьюеров после встречи", employee: "ИИ-агент", timeHours: 0.01, calendarDays: 1, executionShare: 0.2 },
  { name: "Ожидание обратной связи от интервьюеров", employee: "—", timeHours: 0, calendarDays: 1, executionShare: 0.2 },
  { name: "Рекрутер и менеджер принимают решение по агрегированному отчёту ИИ", employee: "Рекрутер", timeHours: 0.2, calendarDays: 1, executionShare: 0.2 },
  { name: "ИИ направляет кандидату уведомление об итоге с персонализированным текстом", employee: "ИИ-агент", timeHours: 0.01, calendarDays: 1, executionShare: 0.2 },
];

async function main() {
  const TEMPLATE_NAME = "Расчёт себестоимости продукции";
  console.log(`Seeding template: ${TEMPLATE_NAME}...`);

  // Remove existing template with same name to allow re-running the seed
  await prisma.calculation.deleteMany({
    where: { name: TEMPLATE_NAME, isTemplate: true },
  });

  const template = await prisma.calculation.create({
    data: {
      name: TEMPLATE_NAME,
      description:
        "Полный цикл расчёта себестоимости и производственного планирования: подтверждение КД и состава изделия, сбор и нормализация цен, обновление ставок труда и накладных расходов, расчёт прямых затрат, запуск стандартной себестоимости, анализ и согласование результатов, формирование производственного графика.",
      industry: "Производство",
      isTemplate: true,
      isPublished: true,
      processSteps: {
        createMany: {
          data: processSteps.map((step, idx) => ({
            type: "AS_IS",
            order: idx + 1,
            name: step.name,
            employee: step.employee,
            timeHours: step.timeHours,
            calendarDays: step.calendarDays,
            executionShare: step.executionShare,
          })),
        },
      },
      rolloutConfig: {
        create: {
          model: "LINEAR",
          rolloutMonths: 6,
          targetShare: 1,
          operationsPerMonth: 100,
        },
      },
    },
  });

  console.log(`Template created: ${template.id} — "${template.name}"`);
  console.log(`Process steps: ${processSteps.length}`);

  // --- HR template ---
  const HR_TEMPLATE_NAME = "Анализ откликов соискателей";
  console.log(`\nSeeding template: ${HR_TEMPLATE_NAME}...`);

  await prisma.calculation.deleteMany({
    where: { name: HR_TEMPLATE_NAME, isTemplate: true },
  });

  const hrTemplate = await prisma.calculation.create({
    data: {
      name: HR_TEMPLATE_NAME,
      description:
        "Полный цикл обработки отклика соискателя: первичная фильтрация резюме, телефонный скрининг, согласование с нанимающим менеджером, организация интервью и сбор обратной связи. ИИ автоматизирует разбор резюме, скрининг, планирование встреч и коммуникацию с кандидатами.",
      industry: "HR / Рекрутинг",
      isTemplate: true,
      isPublished: true,
      processSteps: {
        createMany: {
          data: [
            ...hrProcessStepsAsis.map((step, idx) => ({
              type: "AS_IS",
              order: idx + 1,
              name: step.name,
              employee: step.employee,
              timeHours: step.timeHours,
              calendarDays: step.calendarDays,
              executionShare: step.executionShare,
            })),
            ...hrProcessStepsTobe.map((step, idx) => ({
              type: "TO_BE",
              order: idx + 1,
              name: step.name,
              employee: step.employee,
              timeHours: step.timeHours,
              calendarDays: step.calendarDays,
              executionShare: step.executionShare,
            })),
          ],
        },
      },
      errorItems: {
        createMany: {
          data: [
            // AS-IS errors
            { type: "AS_IS", order: 1, name: "Дублирование отклика (кандидат подал повторно)", employee: "HR-менеджер", hourlyRate: 0, timeHours: 0.5, timeUnit: "hours", calendarDays: 0.5, extraCost: 0, frequency: 0.08 },
            { type: "AS_IS", order: 2, name: "Отклик потерян или не обработан вовремя", employee: "HR-менеджер", hourlyRate: 0, timeHours: 1, timeUnit: "hours", calendarDays: 1, extraCost: 0, frequency: 0.05 },
            { type: "AS_IS", order: 3, name: "Неправильная оценка релевантности (ложный отказ)", employee: "Рекрутер", hourlyRate: 0, timeHours: 1.5, timeUnit: "hours", calendarDays: 1, extraCost: 0, frequency: 0.1 },
            { type: "AS_IS", order: 4, name: "Кандидат недоступен, скрининг перенесён несколько раз", employee: "Рекрутер", hourlyRate: 0, timeHours: 0.5, timeUnit: "hours", calendarDays: 2, extraCost: 0, frequency: 0.2 },
            { type: "AS_IS", order: 5, name: "Нанимающий менеджер не дал обратную связь вовремя", employee: "HR-менеджер", hourlyRate: 0, timeHours: 1, timeUnit: "hours", calendarDays: 3, extraCost: 0, frequency: 0.3 },
            { type: "AS_IS", order: 6, name: "Кандидат отказался от интервью или не явился", employee: "Рекрутер", hourlyRate: 0, timeHours: 1, timeUnit: "hours", calendarDays: 1, extraCost: 0, frequency: 0.12 },
            { type: "AS_IS", order: 7, name: "Интервьюер не оставил фидбек после встречи", employee: "HR-менеджер", hourlyRate: 0, timeHours: 0.5, timeUnit: "hours", calendarDays: 1, extraCost: 0, frequency: 0.25 },
            // TO-BE errors
            { type: "TO_BE", order: 1, name: "ИИ ошибочно отклонил релевантного кандидата", employee: "Рекрутер", hourlyRate: 0, timeHours: 2, timeUnit: "hours", calendarDays: 1, extraCost: 0, frequency: 0.03 },
            { type: "TO_BE", order: 2, name: "Кандидат не ответил на скрининговую анкету ИИ", employee: "Рекрутер", hourlyRate: 0, timeHours: 0.5, timeUnit: "hours", calendarDays: 1, extraCost: 0, frequency: 0.1 },
            { type: "TO_BE", order: 3, name: "Конфликт слотов при автоматическом планировании", employee: "HR-менеджер", hourlyRate: 0, timeHours: 0.5, timeUnit: "hours", calendarDays: 0.5, extraCost: 0, frequency: 0.05 },
          ],
        },
      },
      capexItems: {
        createMany: {
          data: [
            { order: 1, name: "Лицензия / внедрение ИИ-решения для рекрутинга", comment: "ATS с ИИ или интеграция с OpenAI/OpenRouter" },
            { order: 2, name: "Интеграция ИИ с текущей ATS системой", comment: "API-интеграция, разработка" },
            { order: 3, name: "Обучение рекрутеров работе с ИИ-инструментами", comment: "Тренинги, документация" },
          ],
        },
      },
      opexItems: {
        createMany: {
          data: [
            { order: 1, name: "Ежемесячная подписка на ИИ-сервис / API-запросы", comment: "Зависит от объёма откликов" },
            { order: 2, name: "Поддержка и обновление интеграций", comment: "Технический сопровождение" },
          ],
        },
      },
      rolloutConfig: {
        create: {
          model: "S_CURVE",
          rolloutMonths: 3,
          targetShare: 0.9,
          operationsPerMonth: 200,
        },
      },
    },
  });

  console.log(`Template created: ${hrTemplate.id} — "${hrTemplate.name}"`);
  console.log(`AS-IS steps: ${hrProcessStepsAsis.length}, TO-BE steps: ${hrProcessStepsTobe.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
