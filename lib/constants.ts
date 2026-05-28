export type ChannelId =
  | "telegram"
  | "twitter"
  | "instagram"
  | "threads"
  | "youtube"
  | "tiktok"
  | "linkedin"
  | "facebook";

export const CHANNELS: { id: ChannelId; label: string; color: string }[] = [
  { id: "telegram", label: "Telegram", color: "#229ED9" },
  { id: "twitter", label: "Twitter / X", color: "#111111" },
  { id: "instagram", label: "Instagram", color: "#E1306C" },
  { id: "threads", label: "Threads", color: "#444444" },
  { id: "youtube", label: "YouTube", color: "#FF0000" },
  { id: "tiktok", label: "TikTok", color: "#000000" },
  { id: "linkedin", label: "LinkedIn", color: "#0A66C2" },
  { id: "facebook", label: "Facebook", color: "#1877F2" },
];

export const CHANNEL_IDS = CHANNELS.map((c) => c.id);

export function channelLabel(id: string): string {
  return CHANNELS.find((c) => c.id === id)?.label ?? id;
}

export const STORAGE_BUCKET = "post-images";
