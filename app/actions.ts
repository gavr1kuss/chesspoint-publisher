"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { STORAGE_BUCKET, CHANNEL_IDS } from "@/lib/constants";
import { insertQueuedPosts } from "@/lib/insertPosts";
import type { ImportPost } from "@/lib/types";

// ---------- HELPERS ----------

async function nextPostNumber(channel: string): Promise<number> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("posts")
    .select("post_number")
    .eq("channel", channel)
    .order("post_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.post_number ?? 0) + 1;
}

function assertChannel(channel: string) {
  if (!CHANNEL_IDS.includes(channel as never)) {
    throw new Error(`Неизвестный канал: ${channel}`);
  }
}

// ---------- CREATE: одиночный пост (+опц. картинка) ----------

export async function addPost(formData: FormData) {
  const sb = supabaseAdmin();
  const channel = String(formData.get("channel") ?? "");
  assertChannel(channel);
  const body = String(formData.get("body") ?? "");
  const scheduled_date = (formData.get("scheduled_date") as string) || null;
  const file = formData.get("image") as File | null;

  let image_url: string | null = null;
  let image_path: string | null = null;

  if (file && file.size > 0) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    image_path = `${channel}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await sb.storage
      .from(STORAGE_BUCKET)
      .upload(image_path, buffer, { contentType: file.type, upsert: false });
    if (upErr) throw new Error("Загрузка картинки: " + upErr.message);
    image_url = sb.storage.from(STORAGE_BUCKET).getPublicUrl(image_path)
      .data.publicUrl;
  }

  const post_number = await nextPostNumber(channel);
  const { error } = await sb.from("posts").insert({
    channel,
    body,
    scheduled_date,
    image_url,
    image_path,
    image_urls: image_url ? [image_url] : null,
    image_paths: image_path ? [image_path] : null,
    post_number,
    status: "queued",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/admin");
}

// ---------- CREATE: массовый импорт из JSON ----------

export async function importPosts(jsonText: string): Promise<number> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Невалидный JSON");
  }
  const arr = (Array.isArray(parsed) ? parsed : [parsed]) as ImportPost[];
  const n = await insertQueuedPosts(arr);
  revalidatePath("/");
  revalidatePath("/admin");
  return n;
}

// ---------- UPDATE: дата публикации ----------

export async function updatePostDate(id: string, date: string | null) {
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("posts")
    .update({ scheduled_date: date && date.length > 0 ? date : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// ---------- DELETE: один слайд из поста ----------

export async function removeSlide(id: string, index: number) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("posts")
    .select("image_url, image_path, image_urls, image_paths")
    .eq("id", id)
    .maybeSingle();

  const urls: string[] = [
    ...(data?.image_urls ?? (data?.image_url ? [data.image_url] : [])),
  ];
  const paths: string[] = [
    ...(data?.image_paths ?? (data?.image_path ? [data.image_path] : [])),
  ];
  if (index < 0 || index >= urls.length) return;

  const removedPath = paths[index];
  urls.splice(index, 1);
  paths.splice(index, 1);
  if (removedPath) {
    await sb.storage.from(STORAGE_BUCKET).remove([removedPath]);
  }

  const { error } = await sb
    .from("posts")
    .update({
      image_url: urls[0] ?? null,
      image_path: paths[0] ?? null,
      image_urls: urls.length ? urls : null,
      image_paths: paths.length ? paths : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// ---------- UPDATE: статус ----------

export async function markPosted(id: string) {
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("posts")
    .update({ status: "posted", posted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/published");
}

export async function unpost(id: string) {
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("posts")
    .update({ status: "queued", posted_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/published");
}

// ---------- DELETE ----------

export async function deletePost(id: string) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("posts")
    .select("image_path, image_paths")
    .eq("id", id)
    .maybeSingle();
  const paths = [
    ...(data?.image_paths ?? []),
    ...(data?.image_path ? [data.image_path] : []),
  ].filter((p, i, a) => p && a.indexOf(p) === i);
  if (paths.length > 0) {
    await sb.storage.from(STORAGE_BUCKET).remove(paths);
  }
  const { error } = await sb.from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/published");
}

// ---------- ATTACH image to existing post (для импортированных) ----------

export async function attachImage(formData: FormData) {
  const sb = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  const channel = String(formData.get("channel") ?? "general");
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) return;

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const image_path = `${channel}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await sb.storage
    .from(STORAGE_BUCKET)
    .upload(image_path, buffer, { contentType: file.type });
  if (upErr) throw new Error("Загрузка картинки: " + upErr.message);
  const image_url = sb.storage.from(STORAGE_BUCKET).getPublicUrl(image_path)
    .data.publicUrl;

  const { error } = await sb
    .from("posts")
    .update({
      image_url,
      image_path,
      image_urls: [image_url],
      image_paths: [image_path],
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// ---------- DIRECT UPLOAD: подписанные URL (обходим лимит тела Vercel 4.5MB) ----------

// Выдаёт одноразовые подписанные URL для прямой загрузки файлов из браузера в Storage.
export async function signUploads(
  channel: string,
  count: number
): Promise<{ path: string; token: string }[]> {
  const sb = supabaseAdmin();
  const out: { path: string; token: string }[] = [];
  for (let i = 0; i < count; i++) {
    const path = `${channel}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${i}.png`;
    const { data, error } = await sb.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    out.push({ path: data.path, token: data.token });
  }
  return out;
}

// После прямой загрузки в Storage — привязывает пути к посту (добавляет слайдами).
export async function attachUploadedImages(id: string, newPaths: string[]) {
  const sb = supabaseAdmin();
  if (newPaths.length === 0) return;

  const { data: existing } = await sb
    .from("posts")
    .select("image_url, image_path, image_urls, image_paths")
    .eq("id", id)
    .maybeSingle();

  const urls: string[] = [
    ...(existing?.image_urls ??
      (existing?.image_url ? [existing.image_url] : [])),
  ];
  const paths: string[] = [
    ...(existing?.image_paths ??
      (existing?.image_path ? [existing.image_path] : [])),
  ];

  for (const p of newPaths) {
    urls.push(sb.storage.from(STORAGE_BUCKET).getPublicUrl(p).data.publicUrl);
    paths.push(p);
  }

  const { error } = await sb
    .from("posts")
    .update({
      image_url: urls[0] ?? null,
      image_path: paths[0] ?? null,
      image_urls: urls,
      image_paths: paths,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// ---------- ADD images (drag&drop): загружает 1+ файлов и ДОБАВЛЯЕТ слайдами ----------

export async function addImages(formData: FormData) {
  const sb = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  const channel = String(formData.get("channel") ?? "general");
  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;

  const { data: existing } = await sb
    .from("posts")
    .select("image_url, image_path, image_urls, image_paths")
    .eq("id", id)
    .maybeSingle();

  const urls: string[] = [
    ...(existing?.image_urls ??
      (existing?.image_url ? [existing.image_url] : [])),
  ];
  const paths: string[] = [
    ...(existing?.image_paths ??
      (existing?.image_path ? [existing.image_path] : [])),
  ];

  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${channel}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await sb.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { contentType: file.type || "image/png" });
    if (upErr) throw new Error("Загрузка картинки: " + upErr.message);
    urls.push(
      sb.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl
    );
    paths.push(path);
  }

  const { error } = await sb
    .from("posts")
    .update({
      image_url: urls[0] ?? null,
      image_path: paths[0] ?? null,
      image_urls: urls,
      image_paths: paths,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
