import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16">
      {/* Hero */}
      <section className="text-center pt-8 pb-4">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          Бесплатный инструмент для бизнес-аналитики
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Рассчитайте ROI
          <br />
          <span className="text-blue-600">внедрения ИИ</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Опишите бизнес-процесс «как есть» и «как будет с ИИ» — получите наглядный расчёт
          окупаемости с графиками и ключевыми метриками.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <NewCalculationButton />
          <Button variant="outline" size="lg" asChild className="text-base px-8">
            <Link href="/templates">Из библиотеки шаблонов</Link>
          </Button>
          <Button variant="ghost" size="lg" asChild className="text-base px-8">
            <Link href="/my">Мои расчёты</Link>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-10">
          Как это работает
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <Card key={i} className="border-0 shadow-sm bg-gray-50">
              <CardContent className="pt-6 pb-6">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-lg mb-4">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 rounded-2xl p-10">
        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-10">Что вы получите</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="flex gap-4">
              <div className="text-3xl">{f.icon}</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const steps = [
  {
    title: "Процесс AS-IS",
    description: "Опишите текущий процесс по этапам с трудозатратами и ставками сотрудников",
  },
  {
    title: "Процесс TO-BE",
    description: "Опишите, как изменится процесс после внедрения ИИ-решения",
  },
  {
    title: "Затраты на внедрение",
    description: "Укажите CAPEX (единоразовые) и OPEX (ежемесячные) затраты на ИИ",
  },
  {
    title: "Результаты",
    description: "Получите ROI, точку окупаемости и графики динамики за любой горизонт",
  },
];

const features = [
  {
    icon: "📊",
    title: "Наглядные графики",
    description:
      "Динамика окупаемости, помесячная экономия, кривая раскатки и сравнение AS-IS vs TO-BE",
  },
  {
    icon: "🎯",
    title: "Точка окупаемости",
    description: "Система автоматически определяет месяц, когда инвестиции начнут окупаться",
  },
  {
    icon: "📋",
    title: "Готовые шаблоны",
    description: "Библиотека типовых процессов — загрузите и подставьте свои цифры",
  },
  {
    icon: "🔗",
    title: "Поделитесь расчётом",
    description: "Каждый расчёт доступен по уникальной ссылке — отправьте коллегам",
  },
  {
    icon: "💾",
    title: "Автосохранение",
    description: "Расчёт сохраняется автоматически, можно вернуться в любой момент",
  },
  {
    icon: "⚡",
    title: "Мгновенный расчёт",
    description: "Все вычисления выполняются на клиенте — никаких задержек при вводе данных",
  },
];

function NewCalculationButton() {
  return (
    <form action="/api/calculations" method="post">
      <Button size="lg" type="submit" className="text-base px-8 bg-blue-600 hover:bg-blue-700">
        Новый расчёт →
      </Button>
    </form>
  );
}
