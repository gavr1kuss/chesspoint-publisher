"use client";

import { useState } from "react";
import { CHANNELS } from "@/lib/constants";
import type { Post } from "@/lib/types";
import PostCard from "./PostCard";

export default function QueueClient({ posts }: { posts: Post[] }) {
  const [active, setActive] = useState<string>(CHANNELS[0].id);

  const countByChannel = (id: string) =>
    posts.filter((p) => p.channel === id).length;

  const visible = posts.filter((p) => p.channel === active);

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
              style={isActive ? { background: c.color, borderColor: c.color } : {}}
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

      {/* Сетка постов */}
      {visible.length === 0 ? (
        <p className="text-neutral-400 py-16 text-center">
          В этом канале пока нет постов в очереди.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
