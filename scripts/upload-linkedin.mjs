// LinkedIn: 5 постов про продуктовые апдейты ChessPoint, по 1 в день начиная с завтра.
// Идемпотентно по тексту. Запуск: node scripts/upload-linkedin.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const CHANNEL = "linkedin";

const POSTS = [
  // 1. CP accruals / audit / corrected
  `A platform that handles in-app currency has to answer one question honestly: are the numbers in player accounts correct?

We audited ours. They weren't always.

This month we ran a full review of historical ChessPoint accruals, identified the errors, reported them to the relevant stakeholders, and put corrective measures in place. The structural fix — fully automated CP tournaments — will prevent the same class of issue going forward.

We're publishing this rather than quietly patching it because the alternative sets a worse precedent. Players, partners, and organizers should know that when something is off, we'll find it ourselves, say so, and correct it. That standard is easier to keep when you start practicing it early, on small numbers, than to introduce later when the stakes are higher.

Trust isn't a marketing layer. It's an operational habit.`,

  // 2. No wallet at entry
  `The fastest way to lose a chess player is to ask them to install a crypto wallet before their first game. So we stopped asking.

In the next release, players can register for TON-denominated tournaments without a connected wallet. The wallet step moves later in the flow, where it actually belongs — closer to the payout, not at the door.

This is a small UX change with a large positioning consequence. ChessPoint isn't a Web3 product that uses chess. It's a chess platform that happens to settle prizes on TON. The infrastructure should sit underneath the experience, not in front of it. A 1500-rated club player shouldn't need a seed phrase to enter a Saturday blitz.

We'll keep moving crypto out of the player's way wherever it doesn't belong there. The board is the product.`,

  // 3. Self-running tournaments / scheduling
  `A platform that needs a human to start every tournament doesn't scale. So we built one that schedules and repeats them by itself.

This week we shipped a dedicated scheduling module: organizers can build fully flexible tournament calendars and configure recurring events on any cadence — daily, weekly, or custom — with full control over format, timing, and entry parameters. The manual setup overhead is gone.

The downstream effect is what matters. Players can find a real competitive tournament at almost any hour, not just when an operator is awake to launch one. Team capacity that used to go into running events redirects to building the next ones. The calendar becomes a piece of infrastructure rather than a daily task.

Less of the platform should require a human in the loop. This is one of the loops we've closed.`,

  // 4. WebAssembly / faster
  `Most performance work is invisible to the user — until you skip it, and the product feels slow in ways no one can articulate.

This release moves ChessPoint to a WebAssembly (WASM) build, replacing the previous rendering target. WASM is now the recommended build path from the Flutter team and is the right answer for what we're doing: faster load, smoother gameplay, better behavior across devices and browsers. Cross-browser validation is in progress.

Two reasons this matters beyond the technical note. First, blitz and bullet chess are unforgiving to lag — a half-second hitch decides games. Second, players don't return to a board that feels heavy. Performance is a retention metric in disguise.

A platform compounds on its foundations. We'd rather invest in them while the user base is still small enough that we can rebuild without disruption.`,

  // 5. Round-robin color allocation / FIDE pairing
  `If you've ever played a round-robin and noticed you had White four times in a row, you know the feeling. Something's off, and the platform doesn't seem to care.

This week we corrected the color-assignment algorithm in round-robin tournaments to follow official FIDE pairing tables. No more repeat-color streaks. It's the kind of fix that strong players notice immediately and casual players never notice at all — which is exactly the right test for whether a chess platform takes its own format seriously.

We mention it because the message it carries is bigger than the bug. Serious players, titled players, academy coaches, organizers — they read the small things. If pairing is wrong, the rest of the platform is suspect, regardless of how the brand sounds.

The board doesn't grade on effort. We don't either.`,
];

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
  d.setDate(d.getDate() + 1 + offsetDays); // завтра + offset
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

let added = 0,
  skipped = 0;

for (let i = 0; i < POSTS.length; i++) {
  const body = POSTS[i];
  const { data: dup } = await sb
    .from("posts")
    .select("id")
    .eq("channel", CHANNEL)
    .eq("body", body)
    .limit(1)
    .maybeSingle();
  if (dup) {
    console.log(`• skip (уже есть): пост ${i + 1}`);
    skipped++;
    continue;
  }
  const scheduled = dateStr(i);
  const { error } = await sb.from("posts").insert({
    channel: CHANNEL,
    body,
    scheduled_date: scheduled,
    post_number: num,
    status: "queued",
  });
  if (error) {
    console.error(`✗ insert #${num}: ${error.message}`);
    process.exit(1);
  }
  console.log(
    `✓ #${num}  ${scheduled}  "${body.split("\n")[0].slice(0, 60)}…"`
  );
  num++;
  added++;
}

console.log(`\nГотово. Добавлено: ${added}, пропущено: ${skipped}.`);
