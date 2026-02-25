"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalculationAdminListItem } from "@/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";

export function AdminCalculationsClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CalculationAdminListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "ADMIN") {
      router.replace("/");
      return;
    }
    loadFromServer(page);
  }, [user, authLoading, router, page]);

  async function loadFromServer(nextPage: number) {
    try {
      const res = await fetch(`/api/admin/calculations?page=${nextPage}&pageSize=${pageSize}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.data ?? []);
        setTotal(json.total ?? 0);
        const totalPages = Math.max(1, Math.ceil((json.total ?? 0) / pageSize));
        if (nextPage > totalPages) {
          setPage(totalPages);
          return;
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Расчёты пользователей</h1>
          <p className="text-gray-500 mt-1">Все расчёты, созданные другими пользователями</p>
        </div>
      </div>

      {loading || authLoading ? (
        <div className="flex justify-center py-12">
          <div className="text-gray-400">Загрузка...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">🗂️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Расчётов пока нет</h3>
          <p className="text-gray-500 max-w-sm">
            Здесь появятся расчёты других пользователей и анонимные расчёты
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <Link
                    href={`/${item.id}?shared=1`}
                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors truncate"
                  >
                    {item.name || "Без названия"}
                  </Link>
                  <div className="text-xs text-gray-500 truncate">
                    {item.userId
                      ? (item.userEmail ?? "Неизвестный пользователь")
                      : "Анонимный"}
                  </div>
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
                    <Link href={`/${item.id}?shared=1`}>Открыть</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-gray-500">
              Страница {page} из {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrev}
              >
                Назад
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!canNext}
              >
                Вперёд
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
