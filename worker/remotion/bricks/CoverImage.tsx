import React from "react";
import { AbsoluteFill, Img } from "remotion";

// Ladrillo base: muestra una imagen en modo "cover" sobre el frame 9:16,
// enfocada en un punto (objectPosition = centro del recorte del director de
// arte). Garantiza que NUNCA queden bandas: la imagen siempre llena el frame.
//
// - `maskSrc`: si viene un depth map, se usa como máscara por LUMINANCIA
//   (claro = cerca = visible) para aislar el foreground y lograr el parallax.
// - `blur` / `brightness`: para la capa de relleno borrosa de fondo.

export interface CoverImageProps {
  src: string;
  objectPosition: string;
  transform: string;
  maskSrc?: string;
  blur?: number;
  brightness?: number;
}

export const CoverImage: React.FC<CoverImageProps> = ({
  src,
  objectPosition,
  transform,
  maskSrc,
  blur,
  brightness,
}) => {
  // Cast: varias props -webkit-mask-* no están tipadas en React.CSSProperties
  // pero Chromium (el renderer de Remotion) las soporta.
  const maskStyle: React.CSSProperties = maskSrc
    ? ({
        maskImage: `url(${maskSrc})`,
        WebkitMaskImage: `url(${maskSrc})`,
        maskMode: "luminance",
        WebkitMaskMode: "luminance",
        maskSize: "cover",
        WebkitMaskSize: "cover",
        maskPosition: objectPosition,
        WebkitMaskPosition: objectPosition,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      } as React.CSSProperties)
    : {};

  const filters: string[] = [];
  if (blur) filters.push(`blur(${blur}px)`);
  if (brightness != null) filters.push(`brightness(${brightness})`);

  return (
    <AbsoluteFill style={{ transform, transformOrigin: "center center" }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition,
          filter: filters.length ? filters.join(" ") : undefined,
          ...maskStyle,
        }}
      />
    </AbsoluteFill>
  );
};
