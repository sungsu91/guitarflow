import { DEFAULT_PSEUDO3D_SETTINGS } from "../../pseudo3d/projection.js";

const PSEUDO3D_DECORATIONS = Object.freeze([
  Object.freeze({ id: "rock-left-near", src: "/assets/maps/river/rocks/rock-island-three.png", worldX: -1.02, worldZ: 0.18, baseSize: 98 }),
  Object.freeze({ id: "rock-right-near", src: "/assets/maps/river/rocks/rock-island-flat-top.png", worldX: 1.08, worldZ: 0.25, baseSize: 94 }),
  Object.freeze({ id: "lily-left-mid", src: "/assets/maps/river/lily-pads/lily-pad-large-round.png", worldX: -0.84, worldZ: 0.48, baseSize: 72 }),
  Object.freeze({ id: "lotus-right-mid", src: "/assets/maps/river/lotus/lotus-open-side.png", worldX: 0.92, worldZ: 0.58, baseSize: 78 }),
  Object.freeze({ id: "rock-left-far", src: "/assets/maps/river/rocks/rock-island-small-round.png", worldX: -0.68, worldZ: 0.76, baseSize: 66 }),
  Object.freeze({ id: "lily-right-far", src: "/assets/maps/river/lily-pads/lily-pad-medium-notched.png", worldX: 0.7, worldZ: 0.86, baseSize: 62 }),
  Object.freeze({ id: "note-c-far", src: "/assets/shooter/note-monsters/c/frame-1.png", worldX: -0.22, worldZ: 0.92, baseSize: 52, opacity: 0.74 }),
  Object.freeze({ id: "note-g-far", src: "/assets/shooter/note-monsters/g/frame-1.png", worldX: 0.28, worldZ: 0.82, baseSize: 50, opacity: 0.7 }),
]);

export const PSEUDO3D_TEST_MAP_SKIN = Object.freeze({
  id: "dev-pseudo3d-test",
  kind: "pseudo3d",
  renderer: "pseudo3d",
  devOnly: true,
  label: "DEV MODE7",
  description: "개발자 전용 Pseudo 3D 원근·Ground 테스트",
  referenceViewport: Object.freeze({
    width: 390,
    height: 756,
    deviceWidth: 390,
    deviceHeight: 844,
  }),
  pseudo3d: Object.freeze({ ...DEFAULT_PSEUDO3D_SETTINGS }),
  decorations: PSEUDO3D_DECORATIONS,
  performance: Object.freeze({
    mobileGameplay: Object.freeze({ mode: "canvas-lite" }),
  }),
});

