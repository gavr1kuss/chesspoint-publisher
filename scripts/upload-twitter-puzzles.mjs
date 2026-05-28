// Twitter-пазлы из twitter/puzzles-2026-06: папка = дата (DD.MM.YYYY), внутри caption.txt + 1 png.
// Дата берётся из имени папки. Идемпотентно по тексту.
// Запуск: node scripts/upload-twitter-puzzles.mjs

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SRC =
  "C:/Users/mikos/OneDrive/Рабочий стол/ChessPoint 1/twitter/puzzles-2026-06";
const CHANNEL = "twitter";
const BUCKET = "post-images";

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

// DD.MM.YYYY -> YYYY-MM-DD
function toISO(name) {
  const m = name.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const folders = readdirSync(SRC)
  .filter((f) => statSync(join(SRC, f)).isDirectory())
  .sort();

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

for (const folder of folders) {
  const dir = join(SRC, folder);
  const iso = toISO(folder);
  if (!iso) {
    console.error(`✗ не дата: ${folder}`);
    continue;
  }
  const body = readFileSync(join(dir, "caption.txt"), "utf8").trim();
  const png = readdirSync(dir).find((f) => f.toLowerCase().endsWith(".png"));
  if (!png) {
    console.error(`✗ нет png в ${folder}`);
    continue;
  }

  // дубль?
  const { data: dup } = await sb
    .from("posts")
    .select("id")
    .eq("channel", CHANNEL)
    .eq("body", body)
    .limit(1)
    .maybeSingle();
  if (dup) {
    console.log(`• skip (уже есть): ${folder}`);
    skipped++;
    continue;
  }

  const storagePath = `${CHANNEL}/puzzle-${iso}.png`;
  const buffer = readFileSync(join(dir, png));
  const { error: upErr } = await sb.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: "image/png", upsert: true });
  if (upErr) {
    console.error(`✗ upload ${storagePath}: ${upErr.message}`);
    process.exit(1);
  }
  const url = sb.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;

  const { error: insErr } = await sb.from("posts").insert({
    channel: CHANNEL,
    body,
    scheduled_date: iso,
    post_number: num,
    status: "queued",
    image_url: url,
    image_path: storagePath,
    image_urls: [url],
    image_paths: [storagePath],
  });
  if (insErr) {
    console.error(`✗ insert ${folder}: ${insErr.message}`);
    process.exit(1);
  }
  console.log(`✓ #${num}  ${iso}  "${body.slice(0, 40).replace(/\n/g, " ")}…"`);
  num++;
  added++;
}

console.log(`\nГотово. Добавлено: ${added}, пропущено: ${skipped}.`);
