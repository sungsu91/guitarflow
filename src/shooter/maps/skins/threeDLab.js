import ko from "../../../i18n/locales/ko.js";
export const THREE_D_LAB_MAP_SKIN = Object.freeze({
  id: "dev-three-d-lab",
  kind: "perspective3d",
  renderer: "perspective3d",
  landscapeOnly: true,
  label: ko["shooter.3dLab"],
  description: ko["shooter.a3dBattlefieldForLandscapePhonesAndDesktop"],
  referenceViewport: Object.freeze({
    width: 390,
    height: 756,
    deviceWidth: 390,
    deviceHeight: 844,
  }),
  performance: Object.freeze({
    mobileGameplay: Object.freeze({ mode: "webgl-lite" }),
  }),
});
