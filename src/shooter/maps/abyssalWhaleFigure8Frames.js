const FIGURE8_FRAME_ROOT = "/assets/maps/abyssal-moon-cathedral/objects/whale-v8/frames";

function phase(id, prefix, width, height) {
  const frames = Object.freeze(Array.from({ length: 16 }, (_, index) => (
    `${FIGURE8_FRAME_ROOT}/${prefix}_frame_${String(index).padStart(2, "0")}.png`
  )));
  return Object.freeze({ frames, height, id, width });
}

export const ABYSSAL_WHALE_FIGURE8_PHASES = Object.freeze({
  distantRearCurve: phase("distantRearCurve", "01_distant_rear_curve", 308, 320),
  rightApproach: phase("rightApproach", "02_right_approach", 308, 318),
  centerTurnDive: phase("centerTurnDive", "03_center_turn_dive", 384, 256),
  leftReturn: phase("leftReturn", "04_left_return", 306, 321),
  centerCrossRightExit: phase("centerCrossRightExit", "05_center_cross_right_exit", 314, 314),
});

export const ABYSSAL_WHALE_FIGURE8_FRAMES = Object.freeze(
  Object.values(ABYSSAL_WHALE_FIGURE8_PHASES).flatMap((entry) => entry.frames),
);
