import { createClient } from "@supabase/supabase-js";

// Серверный клиент Supabase с service_role ключом.
// Используется ТОЛЬКО в server actions / server components — ключ никогда не уходит в браузер.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Не заданы NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY (см. .env.local.example)"
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
