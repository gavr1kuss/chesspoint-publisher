"use client";

import { createClient } from "@supabase/supabase-js";

// Браузерный клиент с публичным anon-ключом — используется ТОЛЬКО для прямой
// загрузки файлов в Storage по одноразовому подписанному URL (минуя сервер Vercel).
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);
