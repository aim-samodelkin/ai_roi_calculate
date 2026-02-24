"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalculationListItem } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth/auth-provider";

export function MyCalculationsClient() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CalculationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      loadFromServer();
    } else {
      loadFromLocalStorage();
    }
  }, [user, authLoading]);

  async function loadFromServer() {
    try {
      const res = await fetch("/api/calculations/my");
      if (res.ok) {
        const json = await res.json();
        setItems(json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem("roi-calculations");
      const ids: string[] = raw ? JSON.parse(raw) : [];

      if (ids.length === 0) {
        setLoading(false);
        return;
      }

      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/calculations/${id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => j?.data ?? null)
        )
      );

      const loaded: CalculationListItem[] = [];
      const validIds: string[] = [];

      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) {
          loaded.push({
            id: r.value.id,
            name: r.value.name,
            createdAt: r.value.createdAt,
            updatedAt: r.value.updatedAt,
          });
          validIds.push(ids[i]);
        }
      });

      localStorage.setItem("roi-calculations", JSON.stringify(validIds));
      setItems(loaded);
    } finally {
      setLoading(false);
    }
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/calculations/${pendingDeleteId}`, { method: "DELETE" });
      if (res.ok) {
        if (!user) {
          const raw = localStorage.getItem("roi-calculations");
          const ids: string[] = raw ? JSON.parse(raw) : [];
          localStorage.setItem(
            "roi-calculations",
            JSON.stringify(ids.filter((i) => i !== pendingDeleteId))
          );
        }
        setItems((prev) => prev.filter((i) => i.id !== pendingDeleteId));
      }
    } finally {
      setDeleting(false);
      setPendingDeleteId(null);
    }
  };

  const subtitle = user
    ? "Все расчёты, привязанные к вашему аккаунту"
    : "Ранее созданные расчёты на этом устройстве";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мои расчёты</h1>
          <p className="text-gray-500 mt-1">{subtitle}</p>
        </div>
        <form action="/api/calculations" method="post">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            + Новый расчёт
          </Button>
        </form>
      </div>

      {loading || authLoading ? (
        <div className="flex justify-center py-12">
          <div className="text-gray-400">Загрузка...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">🗂️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Расчётов пока нет</h3>
          <p className="text-gray-500 max-w-sm mb-6">
            {user
              ? "Создайте новый расчёт — он автоматически появится здесь"
              : "Создайте новый расчёт или воспользуйтесь готовым шаблоном из библиотеки"}
          </p>
          <div className="flex gap-3">
            <form action="/api/calculations" method="post">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Новый расчёт
              </Button>
            </form>
            <Button variant="outline" asChild>
              <Link href="/templates">Из библиотеки</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <Link
                    href={`/${item.id}`}
                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors truncate"
                  >
                    {item.name || "Без названия"}
                  </Link>
                  <div className="text-xs text-gray-400">
                    Изменён:{" "}
                    {new Date(item.updatedAt).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/${item.id}`}>Открыть</Link>
                  </Button>
                  <button
                    onClick={() => setPendingDeleteId(item.id)}
                    className="text-sm text-gray-400 hover:text-red-500 transition-colors px-2"
                    title="Удалить расчёт"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      <Dialog open={pendingDeleteId !== null} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить расчёт?</DialogTitle>
            <DialogDescription>
              Расчёт будет удалён без возможности восстановления.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDeleteId(null)}
              disabled={deleting}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Удаление…" : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
