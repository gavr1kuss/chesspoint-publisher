import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChessPoint Publisher",
    short_name: "ChessPoint",
    description: "Очередь постов под публикацию по каналам",
    start_url: "/",
    display: "standalone",
    background_color: "#F4EEDD",
    theme_color: "#D8362A",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
