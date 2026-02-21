import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="border-t bg-gray-50 mt-auto">
      <div className="container mx-auto px-4 max-w-7xl py-6 flex justify-center">
        <Link
          href="https://aimintegrations.ru"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          Сделано с 🪶 и 🧠 в AIMintegrations.ru
        </Link>
      </div>
    </footer>
  );
}
