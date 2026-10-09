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
  // Медиа отдаём через свой домен: /media/<path> → публичный объект в Storage.
  async rewrites() {
    return [
      {
        source: "/media/:path*",
        destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      // self-hosted Supabase на своём VPS (за Caddy с Let's Encrypt)
      {
        protocol: "https",
        hostname: "2-26-81-161.sslip.io",
      },
    ],
  },
};

export default nextConfig;
