import {
  ABYSSAL_WHALE_FIGURE8_FRAMES,
  ABYSSAL_WHALE_FIGURE8_PHASES,
} from "../abyssalWhaleFigure8Frames.js";

const ABYSSAL_ROOT = "/assets/maps/abyssal-moon-cathedral/objects";

function asset(id, label, fileName, width, height, options = {}) {
  return Object.freeze({
    id,
    label,
    src: `${ABYSSAL_ROOT}/${fileName}`,
    slot: options.slot ?? "animated-environment",
    baseWidth: options.baseWidth,
    anchorX: options.anchorX ?? 50,
    anchorY: options.anchorY ?? 50,
    aspectRatio: width / height,
    farWhale: options.farWhale
      ? Object.freeze({ ...options.farWhale })
      : undefined,
    maxInstances: options.maxInstances ?? 1,
  });
}

export const ABYSSAL_MOON_CATHEDRAL_ASSETS = Object.freeze([
  asset("abyssal-distant-whale", "수평 8자 원근 고래 V8", "whale-v8/frames/02_right_approach_frame_15.png", 308, 318, {
    baseWidth: 0.28,
    slot: "background-environment",
    farWhale: {
      frames: ABYSSAL_WHALE_FIGURE8_FRAMES,
      mode: "figure8-v8",
      phases: ABYSSAL_WHALE_FIGURE8_PHASES,
      viewport: Object.freeze({ left: 0.17, right: 0.83, top: 0.055, bottom: 0.29 }),
    },
  }),
  asset("abyssal-fish-school-01", "후방 물고기 떼 A", "fish_school_01_rgba.png", 285, 110, { baseWidth: 0.24, slot: "background-environment" }),
  asset("abyssal-fish-school-02", "후방 물고기 떼 B", "fish_school_02_rgba.png", 275, 104, { baseWidth: 0.23, slot: "background-environment" }),
  asset("abyssal-bell-chain", "대성당 종 체인", "bell_chain_rgba.png", 40, 355, { baseWidth: 0.042, anchorY: 0 }),
  asset("abyssal-bell-body", "심해 대성당 종", "bell_body_rgba.png", 271, 351, { baseWidth: 0.28, anchorY: 2 }),
  asset("abyssal-bell-clapper", "대성당 종 추", "bell_clapper_rgba.png", 54, 300, { baseWidth: 0.056, anchorY: 1 }),
  asset("abyssal-orrery-complete", "천구의 고정 받침", "orrery_complete_rgba.png", 339, 400, { baseWidth: 0.30, anchorY: 39 }),
  asset("abyssal-orrery-outer", "천구의 외곽 링", "orrery_outer_ring_rgba.png", 339, 312, { baseWidth: 0.30 }),
  asset("abyssal-orrery-middle", "천구의 중간 링", "orrery_middle_ring_rgba.png", 235, 260, { baseWidth: 0.208 }),
  asset("abyssal-orrery-inner", "천구의 내부 링", "orrery_inner_ring_rgba.png", 149, 174, { baseWidth: 0.132 }),
  asset("abyssal-gatekeeper", "심해 문지기 석상", "gatekeeper_statue_rgba.png", 246, 482, { baseWidth: 0.12, anchorY: 100 }),
  asset("abyssal-seahorse-left", "좌측 해마 수호상", "seahorse_guardian_left_rgba.png", 154, 353, { baseWidth: 0.10, anchorY: 100 }),
  asset("abyssal-seahorse-right", "우측 해마 수호상", "seahorse_guardian_right_rgba.png", 153, 354, { baseWidth: 0.10, anchorY: 100 }),
  asset("abyssal-kelp-01", "해초 군락 A", "kelp_cluster_01_rgba.png", 117, 522, { baseWidth: 0.08, anchorY: 100 }),
  asset("abyssal-kelp-02", "해초 군락 B", "kelp_cluster_02_rgba.png", 126, 508, { baseWidth: 0.085, anchorY: 100 }),
  asset("abyssal-kelp-03", "해초 군락 C", "kelp_cluster_03_rgba.png", 133, 512, { baseWidth: 0.09, anchorY: 100 }),
  asset("abyssal-kelp-04", "해초 군락 D", "kelp_cluster_04_rgba.png", 194, 508, { baseWidth: 0.12, anchorY: 100 }),
  asset("abyssal-seagrass-01", "가는 해초 군락 A", "seagrass_cluster_01_rgba.png", 160, 351, { baseWidth: 0.10, anchorY: 100 }),
  asset("abyssal-seagrass-02", "가는 해초 군락 B", "seagrass_cluster_02_rgba.png", 160, 407, { baseWidth: 0.10, anchorY: 100 }),
  asset("abyssal-seagrass-03", "가는 해초 군락 C", "seagrass_cluster_03_rgba.png", 160, 364, { baseWidth: 0.10, anchorY: 100 }),
  asset("abyssal-banner-left", "좌측 월광 배너", "banner_left_rgba.png", 98, 408, { baseWidth: 0.08, anchorY: 0 }),
  asset("abyssal-banner-right", "우측 월광 배너", "banner_right_rgba.png", 123, 522, { baseWidth: 0.085, anchorY: 0 }),
  asset("abyssal-shell-lantern", "고정 조개 전등", "shell_lantern_unlit_rgba.png", 203, 425, { baseWidth: 0.14, anchorY: 100, maxInstances: 2 }),
]);
