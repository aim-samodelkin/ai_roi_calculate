"use client";

import { useState } from "react";
import { Template } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminTemplateForm } from "./admin-template-form";

interface Props {
  token: string;
  templates: Template[];
}

export function AdminClient({ token, templates: initial }: Props) {
  const [templates, setTemplates] = useState<Template[]>(initial);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);

  const togglePublish = async (template: Template) => {
    const res = await fetch(`/api/admin/templates/${template.id}?token=${token}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !template.isPublished }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setTemplates((prev) => prev.map((t) => (t.id === data.id ? data : t)));
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Удалить шаблон?")) return;
    await fetch(`/api/admin/templates/${id}?token=${token}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const onSaved = (saved: Template) => {
    setTemplates((prev) => {
      const exists = prev.find((t) => t.id === saved.id);
      return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev];
    });
    setEditing(null);
    setCreating(false);
  };

  if (editing || creating) {
    return (
      <AdminTemplateForm
        token={token}
        template={editing ?? undefined}
        onSaved={onSaved}
        onCancel={() => {
          setEditing(null);
          setCreating(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Администрирование</h1>
          <p className="text-gray-500 mt-1">Управление библиотекой шаблонов</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setCreating(true)}>
          + Новый шаблон
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-3">📭</div>
          <p>Шаблонов нет. Создайте первый!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-white"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">{t.name}</span>
                  {t.isPublished ? (
                    <Badge className="bg-green-100 text-green-700 border-0 text-xs">Опубликован</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Черновик</Badge>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {t.industry && <span className="mr-2">{t.industry}</span>}
                  {t.processSteps.filter((s) => s.type === "AS_IS").length} этапов AS-IS
                  {" · "}
                  {t.processSteps.filter((s) => s.type === "TO_BE").length} этапов TO-BE
                </div>
              </div>
              <div className="flex gap-2 shrink-0 ml-4">
                <Button variant="outline" size="sm" onClick={() => togglePublish(t)}>
                  {t.isPublished ? "Снять" : "Опубликовать"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(t)}>
                  Редактировать
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:border-red-300"
                  onClick={() => deleteTemplate(t.id)}
                >
                  Удалить
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
