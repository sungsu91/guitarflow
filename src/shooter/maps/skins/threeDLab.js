export const THREE_D_LAB_MAP_SKIN = Object.freeze({
  id: "dev-three-d-lab",
  kind: "perspective3d",
  renderer: "perspective3d",
  landscapeOnly: true,
  label: "입체 실험실",
  description: "휴대폰 가로 화면과 데스크톱용 3D 전장",
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
