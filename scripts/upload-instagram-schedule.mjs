// Instagram schedule-10-days: каждый день — папка day-NN-YYYY-MM-DD,
// внутри пары N.png + N.txt = отдельные посты (пазлы). Дата из имени папки.
// Идемпотентно по image_path. Запуск: node scripts/upload-instagram-schedule.mjs

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SRC =
  "C:/Users/mikos/OneDrive/Рабочий стол/ChessPoint 1/instagram/schedule-10-days";
const CHANNEL = "instagram";
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
  const dateM = folder.match(/(\d{4}-\d{2}-\d{2})$/);
  const date = dateM ? dateM[1] : null;
  if (!date) {
    console.error(`✗ не дата: ${folder}`);
    continue;
  }
  // номера постов внутри дня
  const nums = readdirSync(dir)
    .filter((f) => /^\d+\.png$/i.test(f))
    .map((f) => parseInt(f))
    .sort((a, b) => a - b);

  for (const n of nums) {
    const txtPath = join(dir, `${n}.txt`);
    const pngPath = join(dir, `${n}.png`);
    const body = readFileSync(txtPath, "utf8").trim();
    const storagePath = `${CHANNEL}/sched-${date}-${n}.png`;

    // дубль по пути картинки
    const { data: dup } = await sb
      .from("posts")
      .select("id")
      .eq("channel", CHANNEL)
      .eq("image_path", storagePath)
      .limit(1)
      .maybeSingle();
    if (dup) {
      console.log(`• skip: ${folder}/${n}`);
      skipped++;
      continue;
    }

    const buffer = readFileSync(pngPath);
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
    const url = sb.storage.from(BUCKET).getPublicUrl(storagePath).data
      .publicUrl;

    const { error: insErr } = await sb.from("posts").insert({
      channel: CHANNEL,
      body,
      scheduled_date: date,
      post_number: num,
      status: "queued",
      image_url: url,
      image_path: storagePath,
      image_urls: [url],
      image_paths: [storagePath],
    });
    if (insErr) {
      console.error(`✗ insert ${folder}/${n}: ${insErr.message}`);
      process.exit(1);
    }
    console.log(
      `✓ #${num}  ${date}  (${folder}/${n})  "${body.slice(0, 32).replace(/\n/g, " ")}…"`
    );
    num++;
    added++;
  }
}

console.log(`\nГотово. Добавлено: ${added}, пропущено: ${skipped}.`);
