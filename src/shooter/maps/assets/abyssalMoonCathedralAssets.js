import ko from "../../../i18n/locales/ko.js";
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
  asset("abyssal-distant-whale", ko["shooter.horizontalFigureEightPerspectiveWhaleV8"], "whale-v8/frames/02_right_approach_frame_15.png", 308, 318, {
    baseWidth: 0.28,
    slot: "background-environment",
    farWhale: {
      frames: ABYSSAL_WHALE_FIGURE8_FRAMES,
      mode: "figure8-v8",
      phases: ABYSSAL_WHALE_FIGURE8_PHASES,
      viewport: Object.freeze({ left: 0.17, right: 0.83, top: 0.055, bottom: 0.29 }),
    },
  }),
  asset("abyssal-fish-school-01", ko["shooter.backgroundFishSchoolA"], "fish_school_01_rgba.png", 285, 110, { baseWidth: 0.24, slot: "background-environment" }),
  asset("abyssal-fish-school-02", ko["shooter.backgroundFishSchoolB"], "fish_school_02_rgba.png", 275, 104, { baseWidth: 0.23, slot: "background-environment" }),
  asset("abyssal-bell-chain", ko["shooter.cathedralBellChain"], "bell_chain_rgba.png", 40, 355, { baseWidth: 0.042, anchorY: 0 }),
  asset("abyssal-bell-body", ko["shooter.deepSeaCathedralBell"], "bell_body_rgba.png", 271, 351, { baseWidth: 0.28, anchorY: 2 }),
  asset("abyssal-bell-clapper", ko["shooter.cathedralBellClapper"], "bell_clapper_rgba.png", 54, 300, { baseWidth: 0.056, anchorY: 1 }),
  asset("abyssal-orrery-complete", ko["shooter.armillarySphereFixedBase"], "orrery_complete_rgba.png", 339, 400, { baseWidth: 0.30, anchorY: 39 }),
  asset("abyssal-orrery-outer", ko["shooter.armillarySphereOuterRing"], "orrery_outer_ring_rgba.png", 339, 312, { baseWidth: 0.30 }),
  asset("abyssal-orrery-middle", ko["shooter.armillarySphereMiddleRing"], "orrery_middle_ring_rgba.png", 235, 260, { baseWidth: 0.208 }),
  asset("abyssal-orrery-inner", ko["shooter.armillarySphereInnerRing"], "orrery_inner_ring_rgba.png", 149, 174, { baseWidth: 0.132 }),
  asset("abyssal-gatekeeper", ko["shooter.deepSeaGatekeeperStatue"], "gatekeeper_statue_rgba.png", 246, 482, { baseWidth: 0.12, anchorY: 100 }),
  asset("abyssal-seahorse-left", ko["shooter.leftSeahorseGuardian"], "seahorse_guardian_left_rgba.png", 154, 353, { baseWidth: 0.10, anchorY: 100 }),
  asset("abyssal-seahorse-right", ko["shooter.rightSeahorseGuardian"], "seahorse_guardian_right_rgba.png", 153, 354, { baseWidth: 0.10, anchorY: 100 }),
  asset("abyssal-kelp-01", ko["shooter.seaweedClusterA"], "kelp_cluster_01_rgba.png", 117, 522, { baseWidth: 0.08, anchorY: 100 }),
  asset("abyssal-kelp-02", ko["shooter.seaweedClusterB"], "kelp_cluster_02_rgba.png", 126, 508, { baseWidth: 0.085, anchorY: 100 }),
  asset("abyssal-kelp-03", ko["shooter.seaweedClusterC"], "kelp_cluster_03_rgba.png", 133, 512, { baseWidth: 0.09, anchorY: 100 }),
  asset("abyssal-kelp-04", ko["shooter.seaweedClusterD"], "kelp_cluster_04_rgba.png", 194, 508, { baseWidth: 0.12, anchorY: 100 }),
  asset("abyssal-seagrass-01", ko["shooter.fineSeaweedClusterA"], "seagrass_cluster_01_rgba.png", 160, 351, { baseWidth: 0.10, anchorY: 100 }),
  asset("abyssal-seagrass-02", ko["shooter.fineSeaweedClusterB"], "seagrass_cluster_02_rgba.png", 160, 407, { baseWidth: 0.10, anchorY: 100 }),
  asset("abyssal-seagrass-03", ko["shooter.fineSeaweedClusterC"], "seagrass_cluster_03_rgba.png", 160, 364, { baseWidth: 0.10, anchorY: 100 }),
  asset("abyssal-banner-left", ko["shooter.leftMoonlightBanner"], "banner_left_rgba.png", 98, 408, { baseWidth: 0.08, anchorY: 0 }),
  asset("abyssal-banner-right", ko["shooter.rightMoonlightBanner"], "banner_right_rgba.png", 123, 522, { baseWidth: 0.085, anchorY: 0 }),
  asset("abyssal-shell-lantern", ko["shooter.fixedShellLamp"], "shell_lantern_unlit_rgba.png", 203, 425, { baseWidth: 0.14, anchorY: 100, maxInstances: 2 }),
]);
