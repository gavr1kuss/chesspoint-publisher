import { login } from "@/app/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <form
        action={login}
        className="w-full max-w-sm bg-white border-2 border-ink rounded-xl p-8 shadow-[6px_6px_0_0_var(--ink)]"
      >
        <h1 className="text-2xl font-black tracking-tight mb-1">ChessPoint</h1>
        <p className="text-sm text-neutral-500 mb-6">Publisher — вход</p>
        <input
          type="password"
          name="password"
          placeholder="Пароль"
          autoFocus
          className="w-full border-2 border-ink rounded-lg px-3 py-2 mb-3 outline-none focus:border-accent"
        />
        {error && (
          <p className="text-sm text-accent mb-3">Неверный пароль</p>
        )}
        <button
          type="submit"
          className="w-full bg-ink text-white font-bold rounded-lg py-2 hover:bg-accent transition-colors"
        >
          Войти
        </button>
      </form>
    </main>
  );
}
