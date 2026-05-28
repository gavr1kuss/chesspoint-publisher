"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Image from "next/image";
import type { Post } from "@/lib/types";
import {
  markPosted,
  deletePost,
  addImages,
  updatePostDate,
  removeSlide,
} from "@/app/actions";

export default function PostCard({ post }: { post: Post }) {
  const [pending, startTransition] = useTransition();
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [dateVal, setDateVal] = useState(post.scheduled_date ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  // синхронизируем локальное поле даты, когда пост обновился с сервера
  useEffect(() => {
    setDateVal(post.scheduled_date ?? "");
  }, [post.scheduled_date]);

  const dateChanged = dateVal !== (post.scheduled_date ?? "");

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

  function uploadFiles(files: File[]) {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (imgs.length === 0) return;
    const fd = new FormData();
    fd.set("id", post.id);
    fd.set("channel", String(post.channel));
    for (const f of imgs) fd.append("images", f);
    startTransition(async () => {
      await addImages(fd);
    });
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) uploadFiles(Array.from(e.target.files));
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  }

  function applyDate() {
    if (!dateChanged) return;
    startTransition(async () => {
      await updatePostDate(post.id, dateVal || null);
    });
  }

  function cancelDate() {
    setDateVal(post.scheduled_date ?? "");
  }

  function onRemoveSlide() {
    if (!confirm(isCarousel ? "Удалить этот слайд?" : "Удалить картинку?"))
      return;
    const removeAt = Math.min(idx, slides.length - 1);
    setIdx((i) => Math.max(0, i - (removeAt === slides.length - 1 ? 1 : 0)));
    startTransition(async () => {
      await removeSlide(post.id, removeAt);
    });
  }

  return (
    <div className="bg-white border-2 border-ink rounded-xl overflow-hidden shadow-[4px_4px_0_0_var(--ink)] flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-ink/10 gap-2">
        <span className="font-black text-sm shrink-0">
          #{post.post_number ?? "—"}
        </span>
        <div className="flex items-center gap-2">
          {isCarousel && (
            <span className="text-[10px] font-bold bg-ink text-white rounded px-1.5 py-0.5">
              {idx + 1}/{slides.length}
            </span>
          )}
          <input
            type="date"
            value={dateVal}
            onChange={(e) => setDateVal(e.target.value)}
            disabled={pending}
            title="Изменить дату публикации"
            className="text-xs border border-ink/30 rounded px-1.5 py-0.5 bg-white hover:border-accent focus:border-accent outline-none disabled:opacity-50"
          />
          {dateChanged && (
            <>
              <button
                onClick={applyDate}
                disabled={pending}
                title="Применить дату"
                className="bg-accent text-white rounded w-6 h-6 text-sm font-black leading-none hover:brightness-110 disabled:opacity-50"
              >
                ✓
              </button>
              <button
                onClick={cancelDate}
                disabled={pending}
                title="Отменить"
                className="border border-ink/30 rounded w-6 h-6 text-sm leading-none hover:border-accent"
              >
                ×
              </button>
            </>
          )}
        </div>
      </div>

      {/* Превью текущего слайда + зона drag&drop */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative bg-neutral-100 aspect-square flex items-center justify-center transition-shadow ${
          dragOver ? "ring-4 ring-accent ring-inset" : ""
        }`}
      >
        {current ? (
          <Image
            key={current}
            src={current}
            alt={`post ${post.post_number} slide ${idx + 1}`}
            fill
            unoptimized
            className="object-contain pointer-events-none"
          />
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm text-neutral-400 hover:text-accent px-4 py-8 text-center whitespace-pre-line"
          >
            {pending ? "Загрузка…" : "Перетащи картинку сюда\nили нажми, чтобы выбрать"}
          </button>
        )}

        {/* Оверлей при перетаскивании */}
        {dragOver && (
          <div className="absolute inset-0 bg-accent/80 text-white flex items-center justify-center font-black text-sm pointer-events-none">
            Отпусти — закрепим в посте
          </div>
        )}

        {/* Добавить слайд / удалить текущий (когда картинка есть) */}
        {current && !dragOver && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              title="Добавить картинку / слайд"
              className="absolute bottom-1 right-1 bg-ink/80 text-white rounded-md w-7 h-7 text-lg leading-none hover:bg-accent"
            >
              +
            </button>
            <button
              onClick={onRemoveSlide}
              disabled={pending}
              title={isCarousel ? "Удалить этот слайд" : "Удалить картинку"}
              className="absolute top-1 right-1 bg-ink/80 text-white rounded-md w-7 h-7 text-lg leading-none hover:bg-accent disabled:opacity-50"
            >
              ×
            </button>
          </>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onInputChange}
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
