"use client";

import { useState } from "react";
import { CHANNELS } from "@/lib/constants";
import type { Post } from "@/lib/types";
import PostCard from "./PostCard";

function fmtDate(d: string | null): string {
  if (!d) return "Без даты";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

// Группировка постов по дате с сохранением порядка (даты по возрастанию, "без даты" в конец).
function groupByDate(posts: Post[]) {
  const map = new Map<string, Post[]>();
  for (const p of posts) {
    const key = p.scheduled_date ?? "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return [...map.entries()].sort(([a], [b]) => {
    if (a === "") return 1;
    if (b === "") return -1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

export default function QueueClient({ posts }: { posts: Post[] }) {
  const [active, setActive] = useState<string>(CHANNELS[0].id);

  const countByChannel = (id: string) =>
    posts.filter((p) => p.channel === id).length;

  const visible = posts.filter((p) => p.channel === active);
  const groups = groupByDate(visible);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Табы каналов */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CHANNELS.map((c) => {
          const n = countByChannel(c.id);
          const isActive = active === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`px-3 py-1.5 rounded-lg font-bold text-sm border-2 transition-colors ${
                isActive
                  ? "text-white border-ink"
                  : "bg-white border-ink hover:bg-ink/5"
              }`}
              style={
                isActive ? { background: c.color, borderColor: c.color } : {}
              }
            >
              {c.label}
              <span
                className={`ml-1.5 text-xs ${
                  isActive ? "opacity-80" : "text-neutral-400"
                }`}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {/* Группы по датам */}
      {visible.length === 0 ? (
        <p className="text-neutral-400 py-16 text-center">
          В этом канале пока нет постов в очереди.
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map(([date, items]) => (
            <section key={date || "no-date"}>
              <div className="flex items-baseline gap-3 mb-4 border-b-2 border-ink pb-2">
                <h2 className="text-3xl font-black tracking-tight">
                  {fmtDate(date || null)}
                </h2>
                <span className="text-sm font-bold text-neutral-400">
                  {items.length}{" "}
                  {items.length === 1 ? "пост" : "поста/ов"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
