import Link from "next/link";
import { logout } from "@/app/actions";

export default function Nav({ active }: { active: "queue" | "published" | "admin" }) {
  const item = (href: string, label: string, key: string) => (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-colors ${
        active === key
          ? "bg-ink text-white"
          : "text-ink hover:bg-ink/10"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="border-b-2 border-ink bg-bg sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2">
        <Link href="/" className="font-black text-lg tracking-tight mr-2">
          ChessPoint<span className="text-accent">.</span>
        </Link>
        <nav className="flex items-center gap-1">
          {item("/", "Очередь", "queue")}
          {item("/published", "Выложено", "published")}
          {item("/admin", "Добавить", "admin")}
        </nav>
        <form action={logout} className="ml-auto">
          <button className="text-sm text-neutral-500 hover:text-accent">
            Выйти
          </button>
        </form>
      </div>
    </header>
  );
}
