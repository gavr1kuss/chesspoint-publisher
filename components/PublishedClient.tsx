"use client";

import { useState, useTransition } from "react";
import { channelLabel, CHANNELS } from "@/lib/constants";
import type { Post } from "@/lib/types";
import { unpost } from "@/app/actions";

function toCsv(posts: Post[]): string {
  const header = [
    "channel",
    "post_number",
    "scheduled_date",
    "posted_at",
    "body",
    "image_url",
  ];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return `"${s.replace(/"/g, '""')}"`;
  };
  const rows = posts.map((p) =>
    [
      channelLabel(p.channel),
      p.post_number ?? "",
      p.scheduled_date ?? "",
      p.posted_at ?? "",
      p.body,
      p.image_url ?? "",
    ]
      .map(esc)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

export default function PublishedClient({ posts }: { posts: Post[] }) {
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<string>("all");

  const visible =
    filter === "all" ? posts : posts.filter((p) => p.channel === filter);

  function exportCsv() {
    const csv = "﻿" + toCsv(visible); // BOM для кириллицы в Excel
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chesspoint-published-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border-2 border-ink rounded-lg px-3 py-1.5 font-bold text-sm"
        >
          <option value="all">Все каналы ({posts.length})</option>
          {CHANNELS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} ({posts.filter((p) => p.channel === c.id).length})
            </option>
          ))}
        </select>
        <button
          onClick={exportCsv}
          disabled={visible.length === 0}
          className="ml-auto bg-ink text-white font-bold rounded-lg px-4 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-40"
        >
          Экспорт CSV
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="text-neutral-400 py-16 text-center">
          Выложенных постов пока нет.
        </p>
      ) : (
        <div className="overflow-x-auto border-2 border-ink rounded-xl bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink text-white">
              <tr>
                <th className="text-left px-3 py-2">Канал</th>
                <th className="text-left px-3 py-2">№</th>
                <th className="text-left px-3 py-2">Дата</th>
                <th className="text-left px-3 py-2">Выложен</th>
                <th className="text-left px-3 py-2">Текст</th>
                <th className="px-3 py-2">Фото</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} className="border-t border-ink/10 align-top">
                  <td className="px-3 py-2 font-bold whitespace-nowrap">
                    {channelLabel(p.channel)}
                  </td>
                  <td className="px-3 py-2">{p.post_number ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {p.scheduled_date ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-neutral-500">
                    {p.posted_at ? p.posted_at.slice(0, 16).replace("T", " ") : "—"}
                  </td>
                  <td className="px-3 py-2 max-w-xs">
                    <span className="line-clamp-3">{p.body}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {p.image_url ? (
                      <a
                        href={p.image_url}
                        target="_blank"
                        className="text-accent underline"
                      >
                        фото
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() =>
                        startTransition(async () => {
                          await unpost(p.id);
                        })
                      }
                      disabled={pending}
                      className="text-xs text-neutral-400 hover:text-accent whitespace-nowrap"
                    >
                      ↩ вернуть
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
