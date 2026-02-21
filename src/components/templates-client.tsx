"use client";

import { useState } from "react";
import { Template } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Props {
  templates: Template[];
}

export function TemplatesClient({ templates }: Props) {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("Все");

  const industries = ["Все", ...Array.from(new Set(templates.map((t) => t.industry ?? "").filter(Boolean)))];

  const filtered = templates.filter((t) => {
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchIndustry = industry === "Все" || (t.industry ?? "") === industry;
    return matchSearch && matchIndustry;
  });

  if (templates.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Библиотека шаблонов</h1>
          <p className="text-gray-500 mt-1">Готовые шаблоны для типовых бизнес-процессов</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Шаблонов пока нет</h3>
          <p className="text-gray-500 max-w-sm">
            Библиотека шаблонов пуста. Администратор может добавить шаблоны, нажав «Сохранить как шаблон» в любом расчёте.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Библиотека шаблонов</h1>
        <p className="text-gray-500 mt-1">Выберите готовый шаблон и подставьте свои цифры</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Поиск по шаблонам..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          {industries.map((ind) => (
            <button
              key={ind}
              onClick={() => setIndustry(ind)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                industry === ind
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Ничего не найдено по вашему запросу
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template }: { template: Template }) {
  const asisCount = template.processSteps.filter((s) => s.type === "AS_IS").length;
  const tobeCount = template.processSteps.filter((s) => s.type === "TO_BE").length;

  return (
    <div className="border rounded-xl p-5 bg-white hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 text-base leading-tight">{template.name}</h3>
        {template.industry && (
          <Badge variant="secondary" className="shrink-0 text-xs">
            {template.industry}
          </Badge>
        )}
      </div>

      {(template.description ?? "") && (
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{template.description}</p>
      )}

      <div className="flex gap-3 text-xs text-gray-400">
        <span>{asisCount} этапов AS-IS</span>
        <span>·</span>
        <span>{tobeCount} этапов TO-BE</span>
        {template.capexItems.length > 0 && (
          <>
            <span>·</span>
            <span>{template.capexItems.length} статей CAPEX</span>
          </>
        )}
      </div>

      <form action={`/api/templates/${template.id}/use`} method="post" className="mt-auto">
        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
          Использовать шаблон
        </Button>
      </form>
    </div>
  );
}
