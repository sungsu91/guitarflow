import { RIVER_ENVIRONMENT_ASSETS } from "../assets/riverAssets.js";
import riverLayout from "./river-layout.json" with { type: "json" };

const RIVER_BACKGROUND_SRC = "/assets/maps/river/river-background.png";

export const RIVER_MAP_SKIN = Object.freeze({
  id: "river-garden",
  kind: "layered",
  label: "리버 가든",
  description: "맑은 강물부터 조립하는 모듈형 강가 맵",
  previewImage: "/assets/maps/river/exports/river-garden-full-map.png",
  referenceViewport: Object.freeze({
    width: 390,
    height: 756,
    deviceWidth: 390,
    deviceHeight: 844,
  }),
  background: Object.freeze({
    id: "river-background",
    src: RIVER_BACKGROUND_SRC,
    fit: "cover",
    position: "center center",
  }),
  assetCatalog: RIVER_ENVIRONMENT_ASSETS,
  layout: Object.freeze(riverLayout.map((placement) => Object.freeze(placement))),
  layers: Object.freeze([]),
});
