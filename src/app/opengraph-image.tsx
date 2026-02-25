import { ImageResponse } from "next/og";

export const alt = "AI ROI Calculator. AIMintegrations — Сервис расчета окупаемости внедрения ИИ.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            padding: 48,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#ffffff",
              textAlign: "center",
            }}
          >
            AI ROI Calculator
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#10B981",
              fontWeight: 600,
            }}
          >
            AIMintegrations
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#94a3b8",
              textAlign: "center",
              maxWidth: 800,
            }}
          >
            Сервис расчета окупаемости внедрения ИИ.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
