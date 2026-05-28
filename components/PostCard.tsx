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
  const fileRef = useRef<HTMLInputElement>(null);

  async function copyText() {
    await navigator.clipboard.writeText(post.body ?? "");
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1500);
  }

  async function copyImage() {
    if (!post.image_url) return;
    setBusy("copy");
    try {
      const res = await fetch(post.image_url);
      const blob = await res.blob();
      // ClipboardItem поддерживает PNG надёжнее всего — конвертируем при необходимости
      let outBlob = blob;
      if (blob.type !== "image/png") {
        outBlob = await toPng(blob);
      }
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

  async function downloadImage() {
    if (!post.image_url) return;
    setBusy("download");
    try {
      const res = await fetch(post.image_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = blob.type.split("/")[1] || "png";
      a.href = url;
      a.download = `${post.channel}-${post.post_number ?? "post"}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
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
        <span className="font-black text-sm">
          #{post.post_number ?? "—"}
        </span>
        <span className="text-xs text-neutral-500">
          {post.scheduled_date ?? "без даты"}
        </span>
      </div>

      {/* Картинка */}
      <div className="relative bg-neutral-100 aspect-square flex items-center justify-center">
        {post.image_url ? (
          <Image
            src={post.image_url}
            alt={`post ${post.post_number}`}
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
          disabled={!post.image_url || busy === "copy"}
          className="border-2 border-ink rounded-lg py-1.5 text-sm font-bold hover:bg-ink hover:text-white transition-colors disabled:opacity-30"
        >
          {copiedImg ? "✓" : busy === "copy" ? "…" : "Копир. фото"}
        </button>
        <button
          onClick={downloadImage}
          disabled={!post.image_url || busy === "download"}
          className="border-2 border-ink rounded-lg py-1.5 text-sm font-bold hover:bg-ink hover:text-white transition-colors disabled:opacity-30"
        >
          {busy === "download" ? "…" : "Скачать"}
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
