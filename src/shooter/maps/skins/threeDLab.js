import { DEFAULT_THREE_D_LAB_SETTINGS } from "../../threed/threeDLabProjection.js";

export const THREE_D_LAB_MAP_SKIN = Object.freeze({
  id: "dev-three-d-lab",
  kind: "perspective3d",
  renderer: "perspective3d",
  devOnly: true,
  label: "입체 실험실",
  description: "Perspective Camera · Billboard Sprite · Guitar Slash 테스트",
  referenceViewport: Object.freeze({
    width: 390,
    height: 756,
    deviceWidth: 390,
    deviceHeight: 844,
  }),
  threeD: Object.freeze({ ...DEFAULT_THREE_D_LAB_SETTINGS }),
  performance: Object.freeze({
    mobileGameplay: Object.freeze({ mode: "webgl-lite" }),
  }),
});
