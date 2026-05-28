"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import type { Post } from "@/lib/types";
import { markPosted, deletePost, attachImage } from "@/app/actions";

export default function PostCard({ post }: { post: Post }) {
  const [pending, startTransition] = useTransition();
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Все слайды по порядку: массив каруселей, иначе одиночная обложка.
  const slides =
    post.image_urls && post.image_urls.length > 0
      ? post.image_urls
      : post.image_url
        ? [post.image_url]
        : [];
  const current = slides[Math.min(idx, slides.length - 1)] ?? null;
  const isCarousel = slides.length > 1;

  async function copyText() {
    await navigator.clipboard.writeText(post.body ?? "");
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1500);
  }

  async function copyImage() {
    if (!current) return;
    setBusy("copy");
    try {
      const res = await fetch(current);
      const blob = await res.blob();
      const outBlob = blob.type === "image/png" ? blob : await toPng(blob);
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": outBlob }),
      ]);
      setCopiedImg(true);
      setTimeout(() => setCopiedImg(false), 1500);
    } catch {
      alert("Не удалось скопировать картинку. Используй «Скачать».");
    } finally {
      setBusy(null);
    }
  }

  async function downloadOne(url: string, n: number) {
    const res = await fetch(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ext = blob.type.split("/")[1] || "png";
    a.href = objUrl;
    a.download = `${post.channel}-${post.post_number ?? "post"}-${n}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  }

  async function downloadAll() {
    if (slides.length === 0) return;
    setBusy("download");
    try {
      for (let i = 0; i < slides.length; i++) {
        await downloadOne(slides[i], i + 1);
        await new Promise((r) => setTimeout(r, 250)); // не душим браузер
      }
    } finally {
      setBusy(null);
    }
  }

  function onMarkPosted() {
    startTransition(async () => {
      await markPosted(post.id);
    });
  }

  function onDelete() {
    if (!confirm("Удалить пост насовсем?")) return;
    startTransition(async () => {
      await deletePost(post.id);
    });
  }

  function onAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("id", post.id);
    fd.set("channel", String(post.channel));
    fd.set("image", file);
    startTransition(async () => {
      await attachImage(fd);
    });
  }

  return (
    <div className="bg-white border-2 border-ink rounded-xl overflow-hidden shadow-[4px_4px_0_0_var(--ink)] flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-ink/10">
        <span className="font-black text-sm">#{post.post_number ?? "—"}</span>
        <div className="flex items-center gap-2">
          {isCarousel && (
            <span className="text-[10px] font-bold bg-ink text-white rounded px-1.5 py-0.5">
              {idx + 1}/{slides.length}
            </span>
          )}
          <span className="text-xs text-neutral-500">
            {post.scheduled_date ?? "без даты"}
          </span>
        </div>
      </div>

      {/* Превью текущего слайда */}
      <div className="relative bg-neutral-100 aspect-square flex items-center justify-center">
        {current ? (
          <Image
            key={current}
            src={current}
            alt={`post ${post.post_number} slide ${idx + 1}`}
            fill
            unoptimized
            className="object-contain"
          />
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm text-neutral-400 hover:text-accent px-4 py-8"
          >
            {pending ? "Загрузка…" : "+ Прикрепить картинку"}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onAttach}
        />
      </div>

      {/* Лента миниатюр карусели */}
      {isCarousel && (
        <div className="flex gap-1 p-2 border-b-2 border-ink/10 overflow-x-auto">
          {slides.map((s, i) => (
            <button
              key={s}
              onClick={() => setIdx(i)}
              className={`relative w-12 h-12 shrink-0 rounded border-2 overflow-hidden ${
                i === idx ? "border-accent" : "border-ink/20"
              }`}
            >
              <Image src={s} alt={`slide ${i + 1}`} fill unoptimized className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Текст */}
      <div className="p-3 flex-1">
        <p className="text-sm whitespace-pre-wrap line-clamp-6">{post.body}</p>
      </div>

      {/* Кнопки */}
      <div className="p-3 pt-0 grid grid-cols-2 gap-2">
        <button
          onClick={copyText}
          className="col-span-2 border-2 border-ink rounded-lg py-1.5 text-sm font-bold hover:bg-ink hover:text-white transition-colors"
        >
          {copiedText ? "✓ Скопировано" : "Копировать текст"}
        </button>
        <button
          onClick={copyImage}
          disabled={!current || busy === "copy"}
          className="border-2 border-ink rounded-lg py-1.5 text-sm font-bold hover:bg-ink hover:text-white transition-colors disabled:opacity-30"
        >
          {copiedImg ? "✓" : busy === "copy" ? "…" : isCarousel ? "Копир. слайд" : "Копир. фото"}
        </button>
        <button
          onClick={downloadAll}
          disabled={slides.length === 0 || busy === "download"}
          className="border-2 border-ink rounded-lg py-1.5 text-sm font-bold hover:bg-ink hover:text-white transition-colors disabled:opacity-30"
        >
          {busy === "download" ? "…" : isCarousel ? "Скачать все" : "Скачать"}
        </button>
        <button
          onClick={onMarkPosted}
          disabled={pending}
          className="col-span-2 bg-accent text-white rounded-lg py-2 text-sm font-black hover:brightness-110 transition disabled:opacity-50"
        >
          {pending ? "…" : "Выложено ✓"}
        </button>
        <button
          onClick={onDelete}
          className="col-span-2 text-xs text-neutral-400 hover:text-accent"
        >
          удалить
        </button>
      </div>
    </div>
  );
}

// Конвертация любого изображения в PNG-blob через canvas (для копирования в буфер).
async function toPng(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas ctx");
  ctx.drawImage(bitmap, 0, 0);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png"
    )
  );
}
