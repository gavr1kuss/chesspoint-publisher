import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Пиннинг корня, чтобы Next не путался со сторонними lockfile вне проекта
  turbopack: {
    root: import.meta.dirname,
  },
  // Картинки бывают по несколько МБ — поднимаем лимит тела server actions (дефолт 1MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
