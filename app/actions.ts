"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { STORAGE_BUCKET, CHANNEL_IDS } from "@/lib/constants";
import { insertQueuedPosts } from "@/lib/insertPosts";
import type { ImportPost } from "@/lib/types";

const AUTH_COOKIE = "cp_auth";

// ---------- AUTH ----------

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.SITE_PASSWORD;
  if (!expected) throw new Error("SITE_PASSWORD не задан в окружении");
  if (password !== expected) {
    redirect("/login?error=1");
  }
  const jar = await cookies();
  jar.set(AUTH_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 дней
  });
  redirect("/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
  redirect("/login");
}

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
