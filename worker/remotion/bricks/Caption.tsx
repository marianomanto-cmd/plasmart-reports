import React from "react";
import { AbsoluteFill, interpolate, spring } from "remotion";
import { BRAND } from "../tokens";
import type { RenderSpec } from "../types";

// Caption flotante + scrim de legibilidad. Entra con un fade/slide sutil y
// se mantiene. El director de arte ya eligió la posición para no tapar la
// pieza (avoid_subject); acá sólo la respetamos.

interface CaptionProps {
  caption: RenderSpec["caption"];
  frame: number;
  fps: number;
  durationInFrames: number;
}

function anchor(position: RenderSpec["caption"]["position"]): React.CSSProperties {
  const isUpper = position.startsWith("upper");
  const horiz = position.endsWith("left")
    ? "flex-start"
    : position.endsWith("right")
      ? "flex-end"
      : "center";
  return {
    justifyContent: isUpper ? "flex-start" : "flex-end",
    alignItems: horiz,
    textAlign: position.endsWith("center")
      ? "center"
      : position.endsWith("right")
        ? "right"
        : "left",
  };
}

export const Caption: React.FC<CaptionProps> = ({
  caption,
  frame,
  fps,
  durationInFrames,
}) => {
  if (!caption.text) return null;

  const isUpper = caption.position.startsWith("upper");
  const a = anchor(caption.position);

  // Entrada: spring de opacidad + slide.
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: Math.round(fps * 0.7) });
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const slide = interpolate(enter, [0, 1], [isUpper ? -28 : 28, 0]);

  // Scrim: gradiente desde el borde donde está la caption.
  const scrim = isUpper
    ? "linear-gradient(to bottom, rgba(26,26,26,0.72) 0%, rgba(26,26,26,0) 42%)"
    : "linear-gradient(to top, rgba(26,26,26,0.78) 0%, rgba(26,26,26,0) 46%)";

  return (
    <>
      <AbsoluteFill style={{ background: scrim, pointerEvents: "none" }} />
      <AbsoluteFill style={{ padding: 96, display: "flex", ...a }}>
        <div
          style={{
            maxWidth: 860,
            transform: `translateY(${slide}px)`,
            opacity,
          }}
        >
          <div
            style={{
              width: 64,
              height: 4,
              backgroundColor: BRAND.copper,
              marginBottom: 28,
              marginLeft: a.textAlign === "center" ? "auto" : undefined,
              marginRight:
                a.textAlign === "center" || a.textAlign === "right"
                  ? a.textAlign === "right"
                    ? 0
                    : "auto"
                  : undefined,
            }}
          />
          <div
            style={{
              fontFamily: BRAND.fontFamily,
              color: BRAND.cream,
              fontSize: 60,
              lineHeight: 1.12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              textShadow: "0 2px 24px rgba(0,0,0,0.55)",
            }}
          >
            {caption.text}
          </div>
        </div>
      </AbsoluteFill>
    </>
  );
};
