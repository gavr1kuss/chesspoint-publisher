// Загрузка готовых Instagram-каруселей из папки posts-ready в Supabase.
// Запуск: node scripts/upload-instagram.mjs
// По одному посту в день начиная с сегодня. Слайды: обложка + 2.png + 3.png + 4.png.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SRC =
  "C:/Users/mikos/OneDrive/Рабочий стол/ChessPoint 1/instagram/posts-ready";
const CHANNEL = "instagram";
const BUCKET = "post-images";

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

// --- защита от дублей ---
const { count: existing } = await sb
  .from("posts")
  .select("*", { count: "exact", head: true })
  .eq("channel", CHANNEL);
if ((existing ?? 0) > 0 && !process.argv.includes("--force")) {
  console.log(
    `В канале instagram уже ${existing} постов. Запусти с --force, если точно хочешь добавить ещё.`
  );
  process.exit(0);
}

// --- стартовый номер ---
const { data: maxRow } = await sb
  .from("posts")
  .select("post_number")
  .eq("channel", CHANNEL)
  .order("post_number", { ascending: false })
  .limit(1)
  .maybeSingle();
let num = (maxRow?.post_number ?? 0) + 1;

// --- дата +i дней от сегодня (локально) ---
function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const folders = readdirSync(SRC)
  .filter((f) => statSync(join(SRC, f)).isDirectory())
  .sort();

console.log(`Папок найдено: ${folders.length}\n`);

let dayOffset = 0;
for (const folder of folders) {
  const dir = join(SRC, folder);
  const pngs = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png"));
  // обложка = png, имя которого НЕ чистое число (не 2.png/3.png/4.png)
  const cover = pngs.find((f) => !/^\d+\.png$/i.test(f));
  const numbered = pngs
    .filter((f) => /^\d+\.png$/i.test(f))
    .sort((a, b) => parseInt(a) - parseInt(b));
  const ordered = [cover, ...numbered].filter(Boolean);

  const caption = readFileSync(join(dir, "caption.txt"), "utf8").trim();
  const scheduled = dateStr(dayOffset);

  const image_urls = [];
  const image_paths = [];
  for (let i = 0; i < ordered.length; i++) {
    const file = ordered[i];
    const buffer = readFileSync(join(dir, file));
    const path = `${CHANNEL}/${folder}/${i + 1}.png`;
    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: "image/png", upsert: true });
    if (upErr) {
      console.error(`  ✗ upload ${path}: ${upErr.message}`);
      process.exit(1);
    }
    const url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    image_urls.push(url);
    image_paths.push(path);
  }

  const { error: insErr } = await sb.from("posts").insert({
    channel: CHANNEL,
    body: caption,
    scheduled_date: scheduled,
    post_number: num,
    status: "queued",
    image_url: image_urls[0] ?? null,
    image_path: image_paths[0] ?? null,
    image_urls,
    image_paths,
  });
  if (insErr) {
    console.error(`  ✗ insert ${folder}: ${insErr.message}`);
    process.exit(1);
  }

  console.log(
    `✓ #${num}  ${scheduled}  ${folder}  (${image_urls.length} слайд., обложка: ${cover})`
  );
  num++;
  dayOffset++;
}

console.log("\nГотово.");
