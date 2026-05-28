"use client";

import { useState, useRef, useTransition } from "react";
import { CHANNELS } from "@/lib/constants";
import { addPost, importPosts } from "@/app/actions";

const SAMPLE = `[
  { "channel": "twitter", "scheduled_date": "2026-06-01", "body": "Текст твита #1 ..." },
  { "channel": "telegram", "scheduled_date": "2026-06-01", "body": "Текст поста для TG ..." }
]`;

export default function AdminClient() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [json, setJson] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await addPost(fd);
        setMsg("Пост добавлен ✓");
        formRef.current?.reset();
      } catch (err) {
        setMsg("Ошибка: " + (err as Error).message);
      }
    });
  }

  function onImport() {
    startTransition(async () => {
      try {
        const n = await importPosts(json);
        setMsg(`Импортировано постов: ${n} ✓ (картинки прикрепи в «Очереди»)`);
        setJson("");
      } catch (err) {
        setMsg("Ошибка импорта: " + (err as Error).message);
      }
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-6">
      {/* Одиночный пост */}
      <section className="bg-white border-2 border-ink rounded-xl p-5 shadow-[4px_4px_0_0_var(--ink)]">
        <h2 className="font-black text-lg mb-4">Добавить один пост</h2>
        <form ref={formRef} onSubmit={onAdd} className="flex flex-col gap-3">
          <label className="text-sm font-bold">Канал</label>
          <select
            name="channel"
            required
            className="border-2 border-ink rounded-lg px-3 py-2"
          >
            {CHANNELS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          <label className="text-sm font-bold">Дата публикации</label>
          <input
            type="date"
            name="scheduled_date"
            className="border-2 border-ink rounded-lg px-3 py-2"
          />

          <label className="text-sm font-bold">Текст</label>
          <textarea
            name="body"
            rows={6}
            required
            className="border-2 border-ink rounded-lg px-3 py-2 resize-y"
            placeholder="Текст поста…"
          />

          <label className="text-sm font-bold">Картинка (опц.)</label>
          <input
            type="file"
            name="image"
            accept="image/*"
            className="text-sm"
          />

          <button
            disabled={pending}
            className="bg-ink text-white font-bold rounded-lg py-2 hover:bg-accent transition-colors disabled:opacity-50"
          >
            {pending ? "…" : "Добавить в очередь"}
          </button>
        </form>
      </section>

      {/* Массовый импорт */}
      <section className="bg-white border-2 border-ink rounded-xl p-5 shadow-[4px_4px_0_0_var(--ink)]">
        <h2 className="font-black text-lg mb-1">Массовый импорт (JSON)</h2>
        <p className="text-xs text-neutral-500 mb-4">
          Вставь JSON-массив постов (его даст Claude). Картинки добавишь потом
          в «Очереди» кнопкой «+ Прикрепить картинку».
        </p>
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={12}
          className="w-full border-2 border-ink rounded-lg px-3 py-2 font-mono text-xs resize-y"
          placeholder={SAMPLE}
        />
        <button
          onClick={onImport}
          disabled={pending || !json.trim()}
          className="mt-3 w-full bg-ink text-white font-bold rounded-lg py-2 hover:bg-accent transition-colors disabled:opacity-50"
        >
          {pending ? "…" : "Импортировать"}
        </button>
      </section>

      {msg && (
        <div className="md:col-span-2 text-sm font-bold text-center py-2">
          {msg}
        </div>
      )}
    </div>
  );
}
