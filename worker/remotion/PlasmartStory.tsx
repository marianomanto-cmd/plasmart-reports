import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { BRAND, VIDEO } from "./tokens";
import {
  cropCenterPercent,
  normalizeRenderSpec,
  type RenderSpec,
} from "./types";
import { computeMotion } from "./motion";
import { CoverImage } from "./bricks/CoverImage";
import { Caption } from "./bricks/Caption";

// `type` (no `interface`): Remotion exige que las props satisfagan
// Record<string, unknown>, y los interfaces no obtienen index signature
// implícita.
export type StoryProps = {
  /** render_spec del director de arte (se normaliza por las dudas). */
  spec: RenderSpec;
  /** Imagen fuente: URL http(s) o data URL. */
  imageSrc: string;
  /** Depth map opcional (Depth Anything) para el parallax 2.5D. */
  depthSrc?: string;
  /** Clip I2V opcional (capa IA, Fase 8.4). Si viene, reemplaza la imagen. */
  videoSrc?: string;
};

// La duración del clip la decide el spec → se calcula acá para que el
// timeline de Remotion tenga el largo correcto sin tocar el componente.
export const calcStoryMetadata: CalculateMetadataFunction<StoryProps> = ({
  props,
}) => {
  const spec = normalizeRenderSpec(props.spec);
  const durationInFrames = Math.round(spec.movement.duration_s * VIDEO.fps);
  return {
    durationInFrames,
    fps: VIDEO.fps,
    width: VIDEO.width,
    height: VIDEO.height,
    props: { ...props, spec },
  };
};

export const PlasmartStory: React.FC<StoryProps> = ({
  spec,
  imageSrc,
  depthSrc,
  videoSrc,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const m = computeMotion(spec.movement, frame, durationInFrames);
  const center = cropCenterPercent(spec.crop.rect_9x16);
  const fill = spec.crop.background_fill;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.black }}>
      {/* 1. Relleno de fondo: nunca quedan bandas feas al mover las capas. */}
      {fill === "blur_extend" ? (
        <CoverImage
          src={imageSrc}
          objectPosition={center}
          transform={m.fill}
          blur={45}
          brightness={0.5}
        />
      ) : (
        <AbsoluteFill
          style={{
            backgroundColor: fill === "brand_cream" ? BRAND.cream : BRAND.black,
          }}
        />
      )}

      {/* 2. Capa principal: imagen real o clip IA (8.4) en modo cover. */}
      {videoSrc ? (
        <AbsoluteFill style={{ transform: m.background, transformOrigin: "center" }}>
          <OffthreadVideo
            src={videoSrc}
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: center,
            }}
          />
        </AbsoluteFill>
      ) : (
        <CoverImage src={imageSrc} objectPosition={center} transform={m.background} />
      )}

      {/* 3. Parallax 2.5D: foreground aislado por el depth map (sólo stills). */}
      {!videoSrc && depthSrc ? (
        <CoverImage
          src={imageSrc}
          maskSrc={depthSrc}
          objectPosition={center}
          transform={m.foreground}
        />
      ) : null}

      {/* 4. Scrim + caption. */}
      <Caption
        caption={spec.caption}
        frame={frame}
        fps={VIDEO.fps}
        durationInFrames={durationInFrames}
      />
    </AbsoluteFill>
  );
};
