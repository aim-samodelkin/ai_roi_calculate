"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Template } from "@/types";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ManageTemplatesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ADMIN") { router.replace("/"); return; }

    fetch("/api/templates?all=1")
      .then((r) => r.json())
      .then((j) => setTemplates(j.data ?? []))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  async function togglePublish(id: string, current: boolean) {
    await fetch("/api/templates/manage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isPublished: !current }),
    });
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isPublished: !current } : t))
    );
  }

  async function deleteTemplate(id: string, name: string) {
    if (!confirm(`Удалить шаблон «${name}»? Это действие необратимо.`)) return;

    await fetch("/api/templates/manage", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20 text-gray-400">Загрузка...</div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление шаблонами</h1>
          <p className="text-gray-500 mt-1">Шаблоны создаются из расчётов кнопкой «Сохранить как шаблон»</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/templates">Библиотека шаблонов</Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">📂</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Шаблонов пока нет</h3>
          <p className="text-gray-500 max-w-sm">
            Откройте любой расчёт и нажмите «Сохранить как шаблон»
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/${tmpl.id}`}
                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {tmpl.name}
                  </Link>
                  <Badge variant={tmpl.isPublished ? "default" : "secondary"}>
                    {tmpl.isPublished ? "Опубликован" : "Черновик"}
                  </Badge>
                  {tmpl.industry && (
                    <Badge variant="outline" className="text-xs">{tmpl.industry}</Badge>
                  )}
                </div>
                {tmpl.description && (
                  <p className="text-sm text-gray-500 truncate max-w-xl">{tmpl.description}</p>
                )}
                <p className="text-xs text-gray-400">
                  Создан: {new Date(tmpl.createdAt).toLocaleDateString("ru-RU")}
                  {" · "}
                  Этапов: {tmpl.processSteps?.filter((s) => s.type === "AS_IS").length ?? 0} AS-IS
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => togglePublish(tmpl.id, tmpl.isPublished ?? false)}
                >
                  {tmpl.isPublished ? "Снять с публикации" : "Опубликовать"}
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${tmpl.id}`}>Открыть</Link>
                </Button>
                <button
                  onClick={() => deleteTemplate(tmpl.id, tmpl.name)}
                  className="text-sm text-gray-400 hover:text-red-500 transition-colors px-2"
                  title="Удалить шаблон"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
