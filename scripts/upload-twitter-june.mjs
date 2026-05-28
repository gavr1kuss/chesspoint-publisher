// Добавление июньских Twitter-постов из markdown-файлов (twitter/posts/2026-06).
// Текст = содержимое блока ``` под "## Post". Дата = из имени файла. Картинок нет (прикрепить на сайте).
// Идемпотентно: пост с уже существующим текстом пропускается.
// Запуск: node scripts/upload-twitter-june.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SRC =
  "C:/Users/mikos/OneDrive/Рабочий стол/ChessPoint 1/twitter/posts/2026-06";
const CHANNEL = "twitter";

// --- env ---
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

// --- файлы постов (без _calendar) ---
const files = readdirSync(SRC)
  .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
  .sort();

// --- стартовый номер ---
const { data: maxRow } = await sb
  .from("posts")
  .select("post_number")
  .eq("channel", CHANNEL)
  .order("post_number", { ascending: false })
  .limit(1)
  .maybeSingle();
let num = (maxRow?.post_number ?? 0) + 1;

let added = 0,
  skipped = 0;

for (const file of files) {
  const text = readFileSync(join(SRC, file), "utf8");
  const dateM = file.match(/(\d{4}-\d{2}-\d{2})/);
  const scheduled = dateM ? dateM[1] : null;

  // первый блок ``` ... ``` после "## Post"
  const afterPost = text.split(/##\s*Post/i)[1] ?? text;
  const blockM = afterPost.match(/```[^\n]*\n([\s\S]*?)\n```/);
  if (!blockM) {
    console.error(`✗ нет блока текста в ${file}`);
    continue;
  }
  const body = blockM[1].replace(/^\n+/, "").replace(/\s+$/, "");

  // дубль?
  const { data: dup } = await sb
    .from("posts")
    .select("id")
    .eq("channel", CHANNEL)
    .eq("body", body)
    .limit(1)
    .maybeSingle();
  if (dup) {
    console.log(`• skip (уже есть): ${file}`);
    skipped++;
    continue;
  }

  const { error } = await sb.from("posts").insert({
    channel: CHANNEL,
    body,
    scheduled_date: scheduled,
    post_number: num,
    status: "queued",
  });
  if (error) {
    console.error(`✗ insert ${file}: ${error.message}`);
    process.exit(1);
  }
  console.log(
    `✓ #${num}  ${scheduled}  "${body.slice(0, 46).replace(/\n/g, " ")}…"`
  );
  num++;
  added++;
}

console.log(`\nГотово. Добавлено: ${added}, пропущено: ${skipped}.`);
