import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-6xl mb-6">🔍</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Страница не найдена</h1>
      <p className="text-gray-500 max-w-sm mb-8">
        Возможно, расчёт был удалён или ссылка некорректна
      </p>
      <Button asChild className="bg-blue-600 hover:bg-blue-700">
        <Link href="/">На главную</Link>
      </Button>
    </div>
  );
}
