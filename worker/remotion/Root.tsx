import React from "react";
import { Composition } from "remotion";
import { PlasmartStory, calcStoryMetadata } from "./PlasmartStory";
import { VIDEO } from "./tokens";
import { DEFAULT_SPEC } from "./types";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PlasmartStory"
      component={PlasmartStory}
      durationInFrames={VIDEO.fps * 12}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      calculateMetadata={calcStoryMetadata}
      defaultProps={{
        spec: DEFAULT_SPEC,
        imageSrc: "",
        depthSrc: undefined,
        videoSrc: undefined,
      }}
    />
  );
};
