import { ImageResponse } from "next/og";

export const landingPreviewSize = {
  width: 1200,
  height: 630,
};

export function createLandingPreviewImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#080b0e",
          color: "#f8fafc",
          display: "flex",
          fontFamily: "Inter, Arial, sans-serif",
          height: "100%",
          justifyContent: "space-between",
          padding: 64,
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 470,
          }}
        >
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div
              style={{
                alignItems: "center",
                background: "#f8fafc",
                borderRadius: 18,
                color: "#080b0e",
                display: "flex",
                fontSize: 34,
                height: 64,
                justifyContent: "center",
                width: 64,
              }}
            >
              L
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 34, fontWeight: 800 }}>LinkSnap</div>
              <div style={{ color: "#94a3b8", fontSize: 22 }}>
                Smart short links for campaigns
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ color: "#6ee7b7", fontSize: 26, fontWeight: 700 }}>
              Link pages, QR codes, analytics
            </div>
            <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1 }}>
              Every link becomes a conversion path.
            </div>
            <div style={{ color: "#cbd5e1", fontSize: 26, lineHeight: 1.35 }}>
              Route visitors by country and device, preview offers with branded
              link pages, and measure every click from one dashboard.
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#101820",
            border: "1px solid #2a3642",
            borderRadius: 28,
            boxShadow: "0 28px 80px rgba(0, 0, 0, 0.45)",
            display: "flex",
            flexDirection: "column",
            gap: 24,
            padding: 28,
            width: 520,
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ background: "#fb7185", borderRadius: 999, height: 16, width: 16 }} />
            <div style={{ background: "#fbbf24", borderRadius: 999, height: 16, width: 16 }} />
            <div style={{ background: "#34d399", borderRadius: 999, height: 16, width: 16 }} />
          </div>
          <div
            style={{
              background: "#0b1117",
              border: "1px solid #26323d",
              borderRadius: 18,
              color: "#9ca3af",
              display: "flex",
              fontSize: 22,
              padding: "16px 20px",
            }}
          >
            linksnap.id/ramadhan-sale
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            {[
              ["Clicks", "84.2K", "#6ee7b7"],
              ["QR scans", "12.8K", "#93c5fd"],
              ["CTR lift", "+38%", "#fcd34d"],
            ].map(([label, value, color]) => (
              <div
                key={label}
                style={{
                  background: "#0d141b",
                  border: "1px solid #24313d",
                  borderRadius: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: 18,
                  width: 150,
                }}
              >
                <div style={{ color: "#94a3b8", fontSize: 18 }}>{label}</div>
                <div style={{ color, fontSize: 34, fontWeight: 800 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              background: "#0d141b",
              border: "1px solid #24313d",
              borderRadius: 18,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              padding: 22,
            }}
          >
            {[
              ["Indonesia", "72%"],
              ["Mobile", "61%"],
              ["Instagram", "44%"],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ color: "#cbd5e1", fontSize: 22 }}>{label}</div>
                <div style={{ color: "#f8fafc", fontSize: 22, fontWeight: 700 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    landingPreviewSize,
  );
}
