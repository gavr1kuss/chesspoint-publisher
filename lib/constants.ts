export type ChannelId =
  | "telegram"
  | "twitter"
  | "instagram"
  | "instagram_stories"
  | "threads"
  | "youtube"
  | "tiktok"
  | "linkedin"
  | "facebook"
  | "free_images"
  | "mortal"
  | "edits"
  | "music_puzzle";

export const CHANNELS: { id: ChannelId; label: string; color: string }[] = [
  { id: "telegram", label: "Telegram", color: "#229ED9" },
  { id: "twitter", label: "Twitter / X", color: "#111111" },
  { id: "instagram", label: "Instagram", color: "#E1306C" },
  { id: "instagram_stories", label: "Instagram Stories", color: "#C13584" },
  { id: "threads", label: "Threads", color: "#444444" },
  { id: "youtube", label: "YouTube", color: "#FF0000" },
  { id: "tiktok", label: "TikTok", color: "#000000" },
  { id: "linkedin", label: "LinkedIn", color: "#0A66C2" },
  { id: "facebook", label: "Facebook", color: "#1877F2" },
  { id: "free_images", label: "Свободные картинки", color: "#0E9F6E" },
  { id: "mortal", label: "Mortal", color: "#C0392B" },
  { id: "edits", label: "EDITS", color: "#7C3AED" },
  { id: "music_puzzle", label: "MUSIC PUZZLE", color: "#F59E0B" },
];

export const CHANNEL_IDS = CHANNELS.map((c) => c.id);

export function channelLabel(id: string): string {
  return CHANNELS.find((c) => c.id === id)?.label ?? id;
}

export const STORAGE_BUCKET = "post-images";

// Публичный URL файла в Storage → путь через прокси самого сайта (/media/…, см. rewrites в next.config).
// Браузер не ходит на хост хранилища напрямую: часть сетей режет sslip.io,
// а same-origin запрос заодно снимает CORS с кнопки «Скачать».
export const STORAGE_PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/`;
export function mediaUrl(url: string): string {
  return url.startsWith(STORAGE_PUBLIC_BASE)
    ? "/media/" + url.slice(STORAGE_PUBLIC_BASE.length)
    : url;
}
