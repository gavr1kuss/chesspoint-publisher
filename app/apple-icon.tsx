import { ImageResponse } from "next/og";

// 180×180 — стандарт apple-touch-icon. iOS возьмёт эту иконку при «На экран Домой».
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#D8362A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Большой моноrgам CP */}
        <div
          style={{
            color: "#F4EEDD",
            fontSize: 112,
            fontWeight: 900,
            letterSpacing: -6,
            lineHeight: 1,
          }}
        >
          CP
        </div>

        {/* Bauhaus-акцент: чёрный квадрат снизу-справа */}
        <div
          style={{
            position: "absolute",
            bottom: 18,
            right: 18,
            width: 22,
            height: 22,
            background: "#111",
          }}
        />

        {/* И светлый квадрат сверху-слева — баланс */}
        <div
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            width: 14,
            height: 14,
            background: "#F4EEDD",
            opacity: 0.7,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
