import { COASTAL_COVE_ENVIRONMENT_ASSETS } from "../assets/coastalCoveAssets.js";
import coastalCoveLayout from "./coastal-cove-layout.json" with { type: "json" };

const COASTAL_COVE_BACKGROUND_SRC = "/assets/maps/coastal-cove/coastal-cove-background.png";

export const COASTAL_COVE_MAP_SKIN = Object.freeze({
  id: "coastal-cove",
  kind: "layered",
  label: "COAST",
  description: "맑은 얕은 바다와 모래사장을 중심으로 조립하는 모듈형 해안 맵",
  previewImage: COASTAL_COVE_BACKGROUND_SRC,
  performance: Object.freeze({
    mobileGameplay: Object.freeze({
      mode: "full",
      audit: Object.freeze({
        completed: true,
        contentFingerprint: "7ab54eed",
        activeCssAnimations: 3,
        ambientEventLayers: 0,
        filteredElements: 9,
        particleElements: 0,
        sharedSpriteSubscribers: 4,
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
    id: "coastal-cove-background",
    src: COASTAL_COVE_BACKGROUND_SRC,
    fit: "cover",
    position: "center center",
    locked: true,
  }),
  assetCatalog: COASTAL_COVE_ENVIRONMENT_ASSETS,
  layout: Object.freeze(coastalCoveLayout.map((placement) => Object.freeze(placement))),
  layers: Object.freeze([]),
});
