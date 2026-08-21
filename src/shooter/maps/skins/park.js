import { PARK_ENVIRONMENT_ASSETS } from "../assets/parkAssets.js";
import parkLayout from "./park-layout.json" with { type: "json" };

const PARK_BACKGROUND_SRC = "/assets/maps/park/park-background.png";

export const PARK_MAP_SKIN = Object.freeze({
  id: "park",
  kind: "layered",
  label: "PARK",
  description: "햇살이 드는 잔디 공원을 중심으로 꾸미는 모듈형 공원 맵",
  previewImage: PARK_BACKGROUND_SRC,
  performance: Object.freeze({
    mobileGameplay: Object.freeze({
      mode: "full",
      audit: Object.freeze({
        completed: true,
        contentFingerprint: "30c756a1",
        activeCssAnimations: 3,
        ambientEventLayers: 0,
        filteredElements: 6,
        particleElements: 0,
        sharedSpriteSubscribers: 6,
      }),
    }),
  }),
  referenceViewport: Object.freeze({
    width: 390,
    height: 756,
    deviceWidth: 390,
    deviceHeight: 844,
  }),
  background: Object.freeze({
    id: "park-background",
    src: PARK_BACKGROUND_SRC,
    fit: "cover",
    position: "center center",
    locked: true,
  }),
  assetCatalog: PARK_ENVIRONMENT_ASSETS,
  layout: Object.freeze(parkLayout.map((placement) => Object.freeze(placement))),
  layers: Object.freeze([]),
});
