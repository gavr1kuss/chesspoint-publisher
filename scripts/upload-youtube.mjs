// YouTube: стилизованные доски из chesspoint-replay/out/styled/_SCHEDULED.
// Привязка картинок к датам — из _manifest.csv (текста нет, body пустой).
// Идемпотентно по image_path. Запуск: node scripts/upload-youtube.mjs

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SRC =
  "C:/Users/mikos/OneDrive/Рабочий стол/chesspoint-replay/out/styled/_SCHEDULED";
const CHANNEL = "youtube";
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

// --- манифест ---
const rows = readFileSync(join(SRC, "_manifest.csv"), "utf8")
  .split(/\r?\n/)
  .slice(1)
  .filter((l) => l.trim())
  .map((l) => {
    const [date, post_num, style, source_file, new_name] = l.split(",");
    return { date, post_num, style, new_name };
  });

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

for (const r of rows) {
  const storagePath = `${CHANNEL}/${r.new_name}`;
  const { data: dup } = await sb
    .from("posts")
    .select("id")
    .eq("channel", CHANNEL)
    .eq("image_path", storagePath)
    .limit(1)
    .maybeSingle();
  if (dup) {
    console.log(`• skip: ${r.new_name}`);
    skipped++;
    continue;
  }

  const buffer = readFileSync(join(SRC, r.new_name));
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
    body: "",
    scheduled_date: r.date,
    post_number: num,
    status: "queued",
    image_url: url,
    image_path: storagePath,
    image_urls: [url],
    image_paths: [storagePath],
  });
  if (insErr) {
    console.error(`✗ insert ${r.new_name}: ${insErr.message}`);
    process.exit(1);
  }
  console.log(`✓ #${num}  ${r.date}  ${r.new_name}  [${r.style}]`);
  num++;
  added++;
}

console.log(`\nГотово. Добавлено: ${added}, пропущено: ${skipped}.`);
