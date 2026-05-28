// Загрузка Twitter-расписания: 7 дней × 2 твита (длинный + короткий), по аналогии с IG.
// Тексты парсятся из schedule_utf8.txt (один-в-один), картинки — из twitter-pkg.
// Даты сдвигаются: первый день расписания → СЕГОДНЯ, далее по дню.
// Запуск: node scripts/upload-twitter.mjs   (повторно — только с --force)

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SCHEDULE = "C:/Users/mikos/Downloads/schedule_utf8.txt";
const IMAGES = "C:/Users/mikos/Downloads/twitter-pkg";
const CHANNEL = "twitter";
const BUCKET = "post-images";
// Оригинальные даты в именах файлов (в порядке расписания)
const ORIG_DATES = [
  "2026-05-26",
  "2026-05-27",
  "2026-05-28",
  "2026-05-29",
  "2026-05-30",
  "2026-05-31",
  "2026-06-01",
];

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

// --- парсинг текстов ---
const lines = readFileSync(SCHEDULE, "utf8").split(/\r?\n/);
const isDateHeader = (t) => /^\d{1,2}\s+\S+\s+2026\s*$/.test(t);
const isFooter = (t) => /дней\s*·/.test(t) || /^Расписание/.test(t);

const bodies = [];
let cur = null;
for (const raw of lines) {
  const t = raw.trim();
  if (/^ПОСТ\s/.test(t)) {
    if (cur) bodies.push(cur.join("\n\n"));
    cur = [];
    continue;
  }
  if (cur !== null) {
    if (t === "" || isDateHeader(t) || isFooter(t)) {
      bodies.push(cur.join("\n\n"));
      cur = null;
      continue;
    }
    cur.push(t);
  }
}
if (cur) bodies.push(cur.join("\n\n"));

if (bodies.length !== 14) {
  console.error(
    `Ожидалось 14 постов, распарсено ${bodies.length}. Прерываю.`
  );
  bodies.forEach((b, i) => console.error(`  [${i}] ${b.slice(0, 60)}…`));
  process.exit(1);
}

// --- защита от дублей ---
const { count: existing } = await sb
  .from("posts")
  .select("*", { count: "exact", head: true })
  .eq("channel", CHANNEL);
if ((existing ?? 0) > 0 && !process.argv.includes("--force")) {
  console.log(
    `В канале twitter уже ${existing} постов. Запусти с --force, если точно хочешь добавить ещё.`
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

function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

for (let i = 0; i < bodies.length; i++) {
  const day = Math.floor(i / 2);
  const slot = (i % 2) + 1; // 1 = длинный, 2 = короткий
  const orig = ORIG_DATES[day];
  const scheduled = dateStr(day); // первый день → сегодня
  const body = bodies[i];

  const file = `${orig}_post-${slot}.png`;
  const fullPath = join(IMAGES, file);
  if (!existsSync(fullPath)) {
    console.error(`✗ нет картинки: ${file}`);
    process.exit(1);
  }
  const buffer = readFileSync(fullPath);
  const storagePath = `${CHANNEL}/${orig}_post-${slot}.png`;
  const { error: upErr } = await sb.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: "image/png",
      upsert: true,
    });
  if (upErr) {
    console.error(`✗ upload ${storagePath}: ${upErr.message}`);
    process.exit(1);
  }
  const url = sb.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;

  const { error: insErr } = await sb.from("posts").insert({
    channel: CHANNEL,
    body,
    scheduled_date: scheduled,
    post_number: num,
    status: "queued",
    image_url: url,
    image_path: storagePath,
    image_urls: [url],
    image_paths: [storagePath],
  });
  if (insErr) {
    console.error(`✗ insert #${num}: ${insErr.message}`);
    process.exit(1);
  }

  console.log(
    `✓ #${num}  ${scheduled}  post-${slot}  "${body.slice(0, 48).replace(/\n/g, " ")}…"`
  );
  num++;
}

console.log("\nГотово. 14 твитов в очереди, по 2 в день, с сегодня.");
