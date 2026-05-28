import { supabaseAdmin } from "./supabase/server";
import { CHANNEL_IDS } from "./constants";
import type { ImportPost } from "./types";

// Общая логика вставки постов в очередь — используется и server action'ом (/admin),
// и API-роутом (/api/import). Проставляет post_number автоматически по каждому каналу.
export async function insertQueuedPosts(arr: ImportPost[]): Promise<number> {
  const sb = supabaseAdmin();
  if (!Array.isArray(arr) || arr.length === 0) return 0;

  const counters: Record<string, number> = {};
  const rows = [];
  for (const p of arr) {
    const channel = String(p.channel ?? "");
    if (!CHANNEL_IDS.includes(channel as never)) {
      throw new Error(`Неизвестный канал: "${channel}"`);
    }
    if (counters[channel] === undefined) {
      const { data } = await sb
        .from("posts")
        .select("post_number")
        .eq("channel", channel)
        .order("post_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      counters[channel] = (data?.post_number ?? 0) + 1;
    } else {
      counters[channel] += 1;
    }
    rows.push({
      channel,
      body: String(p.body ?? ""),
      scheduled_date: p.scheduled_date ?? null,
      post_number: counters[channel],
      status: "queued" as const,
    });
  }

  const { error } = await sb.from("posts").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}
