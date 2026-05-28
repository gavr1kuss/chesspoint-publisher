import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Пиннинг корня, чтобы Next не путался со сторонними lockfile вне проекта
  turbopack: {
    root: import.meta.dirname,
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
