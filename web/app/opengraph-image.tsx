import { ImageResponse } from "next/og";

// Tells Next.js the metadata for this image route. When someone shares the
// site, LinkedIn/Twitter/Slack auto-fetch /opengraph-image and display the
// returned PNG in their preview card.
export const alt = "AI Brochure Generator — Paste a URL, get a branded brochure";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fetch Instrument Serif italic from Google Fonts at build time so the
// preview matches the site's actual display typography.
async function loadFont(): Promise<ArrayBuffer> {
  const url =
    "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&display=swap";
  const css = await (await fetch(url)).text();
  const match = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
  if (!match) throw new Error("Could not parse font URL");
  return (await fetch(match[1])).arrayBuffer();
}

export default async function OG() {
  let serifFont: ArrayBuffer | null = null;
  try {
    serifFont = await loadFont();
  } catch {
    // If font fetch fails (rare), fall back to Satori's default sans
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          // The same three-gradient aurora as the live hero section.
          // Each radial fades to transparent at 55% of its radius, which
          // is what makes the falloff smooth (no banding, no hard edges).
          backgroundColor: "#0B0B0F",
          backgroundImage: [
            "radial-gradient(circle at 15% 25%, rgba(124, 58, 237, 0.55) 0%, rgba(124, 58, 237, 0) 55%)",
            "radial-gradient(circle at 85% 30%, rgba(6, 182, 212, 0.45) 0%, rgba(6, 182, 212, 0) 55%)",
            "radial-gradient(circle at 50% 95%, rgba(236, 72, 153, 0.42) 0%, rgba(236, 72, 153, 0) 55%)",
          ].join(", "),
          color: "#F5F5F5",
          padding: "70px",
        }}
      >
        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            position: "relative",
          }}
        >
          {/* Top: brand mark */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 22,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: "rgba(245, 245, 245, 0.6)",
              fontWeight: 500,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 9999,
                backgroundColor: "#34D399",
                display: "flex",
              }}
            />
            Brochure Generator
          </div>

          {/* Middle: huge serif italic headline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <div
              style={{
                fontFamily: serifFont ? "InstrumentSerif" : undefined,
                fontSize: 132,
                lineHeight: 1.0,
                letterSpacing: -3,
                fontStyle: "italic",
                fontWeight: 400,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span>Any URL.</span>
              <span style={{ color: "rgba(245, 245, 245, 0.65)" }}>
                A branded brochure.
              </span>
            </div>
            <div
              style={{
                fontSize: 30,
                lineHeight: 1.35,
                color: "rgba(245, 245, 245, 0.75)",
                maxWidth: 880,
                display: "flex",
              }}
            >
              AI-generated PDF brochures in the company&apos;s real colors and
              voice. ~15 seconds, free, no signup.
            </div>
          </div>

          {/* Bottom: URL + tech */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 22,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "rgba(245, 245, 245, 0.55)",
              fontWeight: 500,
            }}
          >
            <span>brochure-generator-silk.vercel.app</span>
            <span>FastAPI · Gemini · WeasyPrint · Next.js</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: serifFont
        ? [
            {
              name: "InstrumentSerif",
              data: serifFont,
              style: "italic",
              weight: 400,
            },
          ]
        : undefined,
    },
  );
}
