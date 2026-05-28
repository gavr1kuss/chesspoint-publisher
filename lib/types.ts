import type { ChannelId } from "./constants";

export type PostStatus = "queued" | "posted";

export type Post = {
  id: string;
  channel: ChannelId | string;
  post_number: number | null;
  scheduled_date: string | null;
  body: string;
  image_url: string | null; // обложка / первый слайд
  image_path: string | null;
  image_urls: string[] | null; // все слайды карусели по порядку
  image_paths: string[] | null;
  status: PostStatus;
  posted_at: string | null;
  created_at: string;
};

// Формат одного поста в массовом JSON-импорте (картинки добавляются отдельно).
export type ImportPost = {
  channel: ChannelId | string;
  scheduled_date?: string | null;
  body: string;
};
