// Facebook: 20 досок-пазлов из styled/2026-05-28-facebook.
// С ЗАВТРА, по 2 поста в день. Текста в исходниках нет — генерим заголовок + CTA + хештеги.
// Идемпотентно по image_path. Запуск: node scripts/upload-facebook.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SRC =
  "C:/Users/mikos/OneDrive/Рабочий стол/chesspoint-replay/out/styled/2026-05-28-facebook";
const CHANNEL = "facebook";
const BUCKET = "post-images";

// Заголовки (в голосе Директора, без привязки к конкретному решению — решений в данных нет).
const TITLES = [
  "Find the move that ends it.",
  "One move turns this position. Can you see it?",
  "Sharper than it looks. Find the best move.",
  "Your move. Make it count.",
  "Most players miss the strongest move here.",
  "There's a clean win on the board. Find it.",
  "Quiet position, one precise move.",
  "Calculate first. Then commit.",
  "The best move isn't the loud one.",
  "Spot the idea that cracks it open.",
  "This one rewards patience over checks.",
  "Find the only move that holds.",
  "Tactics hide in calm positions too.",
  "Read the board before you reach for a piece.",
  "One move swings the whole evaluation.",
  "Look past the obvious capture.",
  "The position is asking a question. Answer it.",
  "Precision beats aggression here.",
  "Find the move a grandmaster wouldn't hesitate on.",
  "Simple board. Not a simple move.",
];

// Хештеги (лёгкая ротация для естественности).
const HASHTAGS = [
  "#chess #ChessPoint #chesspuzzle #chesstactics",
  "#chess #ChessPoint #chesspuzzle #brainteaser",
  "#chess #ChessPoint #chesspuzzle #findthemove",
  "#chess #ChessPoint #chesstactics #mateintwo",
];

function makeBody(i) {
  const title = TITLES[i % TITLES.length];
  const tags = HASHTAGS[i % HASHTAGS.length];
  return `${title}\n\nDrop your move in the comments — no engines.\n\nPlay at chesspoint.org\n\n${tags}`;
}

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

const pngs = readdirSync(SRC)
  .filter((f) => f.toLowerCase().endsWith(".png"))
  .sort();

const { data: maxRow } = await sb
  .from("posts")
  .select("post_number")
  .eq("channel", CHANNEL)
  .order("post_number", { ascending: false })
  .limit(1)
  .maybeSingle();
let num = (maxRow?.post_number ?? 0) + 1;

// дата = завтра + floor(i/2)
function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + 1 + offsetDays); // +1 = завтра
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

let added = 0,
  skipped = 0;

for (let i = 0; i < pngs.length; i++) {
  const file = pngs[i];
  const storagePath = `${CHANNEL}/${file}`;
  const { data: dup } = await sb
    .from("posts")
    .select("id")
    .eq("channel", CHANNEL)
    .eq("image_path", storagePath)
    .limit(1)
    .maybeSingle();
  if (dup) {
    console.log(`• skip: ${file}`);
    skipped++;
    continue;
  }

  const buffer = readFileSync(join(SRC, file));
  const { error: upErr } = await sb.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: "image/png", upsert: true });
  if (upErr) {
    console.error(`✗ upload ${storagePath}: ${upErr.message}`);
    process.exit(1);
  }
  const url = sb.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
  const scheduled = dateStr(Math.floor(i / 2));
  const body = makeBody(i);

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
    console.error(`✗ insert ${file}: ${insErr.message}`);
    process.exit(1);
  }
  console.log(`✓ #${num}  ${scheduled}  "${TITLES[i % TITLES.length]}"`);
  num++;
  added++;
}

console.log(`\nГотово. Добавлено: ${added}, пропущено: ${skipped}.`);
