import { createClient } from "@supabase/supabase-js";

// Роль из JWT-ключа. Подпись не проверяем — нужно только выбрать, как передать ключ.
function jwtRole(key: string): string | null {
  try {
    const payload = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8")).role ?? null;
  } catch {
    return null;
  }
}

// Серверный клиент Supabase.
// Используется ТОЛЬКО в server actions / server components — ключ никогда не уходит в браузер.
//
// SUPABASE_SERVICE_ROLE_KEY — либо полный service_role, либо ограниченный JWT своей роли
// (например cp_publisher: только таблица posts и bucket post-images).
// Шлюз self-hosted Supabase пускает в заголовок apikey лишь anon/service, поэтому
// ограниченный JWT едет в Authorization, а в apikey — публичный anon-ключ.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Не заданы NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY (см. .env.local.example)"
    );
  }
  const auth = { persistSession: false, autoRefreshToken: false };

  if (jwtRole(key) === "service_role") {
    return createClient(url, key, { auth });
  }
  if (!anon) {
    throw new Error(
      "Ограниченный ключ в SUPABASE_SERVICE_ROLE_KEY требует NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createClient(url, anon, {
    auth,
    global: { headers: { Authorization: `Bearer ${key}` } },
  });
}
