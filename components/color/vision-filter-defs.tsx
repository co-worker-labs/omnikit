"use client";

import { VISION_MATRICES, visionFilterId } from "../../libs/color/vision";

export function VisionFilterDefs() {
  const modes = Object.keys(VISION_MATRICES) as Array<keyof typeof VISION_MATRICES>;
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        {modes.map((mode) => (
          <filter id={visionFilterId(mode)!} key={mode} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={VISION_MATRICES[mode].join(" ")} />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
