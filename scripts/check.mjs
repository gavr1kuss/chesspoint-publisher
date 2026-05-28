// Быстрая проверка подключения к Supabase и наличия схемы.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// читаем .env.local вручную
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data, error, count } = await sb
  .from("posts")
  .select("*", { count: "exact" })
  .limit(1);

if (error) {
  console.log("TABLE_ERROR:", error.message);
} else {
  console.log("TABLE_OK rows:", count);
}

const { data: buckets, error: bErr } = await sb.storage.listBuckets();
if (bErr) {
  console.log("BUCKET_ERROR:", bErr.message);
} else {
  console.log(
    "BUCKETS:",
    buckets.map((b) => b.id).join(", ") || "(none)"
  );
}
