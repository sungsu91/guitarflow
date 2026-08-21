import { LAVA_CANYON_ENVIRONMENT_ASSETS } from "../assets/lavaCanyonAssets.js";
import lavaCanyonLayout from "./lava-canyon-layout.json" with { type: "json" };

const LAVA_CANYON_BACKGROUND_SRC = "/assets/maps/lava-canyon/lava-canyon-background.png";
const LAVA_CANYON_EVENT_ROOT = "/assets/maps/lava-canyon/events";

export const LAVA_CANYON_MAP_SKIN = Object.freeze({
  id: "lava-canyon",
  kind: "layered",
  label: "LAVA",
  description: "넓은 용암 통로를 중심으로 조립하는 모듈형 협곡 맵",
  previewImage: LAVA_CANYON_BACKGROUND_SRC,
  performance: Object.freeze({
    mobileGameplay: Object.freeze({
      mode: "reduced",
      audit: Object.freeze({
        completed: true,
        contentFingerprint: "a87432e3",
        activeCssAnimations: 17,
        ambientEventLayers: 1,
        filteredElements: 15,
        particleElements: 0,
        sharedSpriteSubscribers: 1,
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
    id: "lava-canyon-background",
    src: LAVA_CANYON_BACKGROUND_SRC,
    fit: "cover",
    position: "center center",
    locked: true,
  }),
  ambientEvents: Object.freeze([
    Object.freeze({
      id: "lava-canyon-baby-dragon-crossing",
      type: "flying-dragon-crossing",
      actorAssetId: "ambient-flying-baby-dragon",
      actorInstanceId: "lava-flying-baby-dragon-01",
      flightSheet: Object.freeze({
        src: `${LAVA_CANYON_EVENT_ROOT}/baby-dragon-flight-sheet.png`,
        columns: 3,
        rows: 2,
        frameCount: 6,
        readyFrame: 0,
        frameDurationMs: 98,
      }),
      breathSheet: Object.freeze({
        src: `${LAVA_CANYON_EVENT_ROOT}/baby-dragon-breath-sheet.png`,
        columns: 3,
        rows: 2,
        frameCount: 6,
        frameDurationMs: 155,
      }),
      settings: Object.freeze({
        firstDelaySeconds: Object.freeze({ min: 2, max: 3 }),
        homeIntervalSeconds: Object.freeze({ min: 2, max: 3 }),
        takeoffDurationSeconds: 1.15,
        outboundDurationSeconds: Object.freeze({ min: 6.5, max: 8 }),
        awayDelaySeconds: Object.freeze({ min: 2, max: 3 }),
        returnDurationSeconds: Object.freeze({ min: 6.4, max: 7.8 }),
        landingDurationSeconds: 0.72,
        breathProgress: Object.freeze({ min: 0.44, max: 0.58 }),
        cruiseTopRange: Object.freeze({ min: 0.26, max: 0.44 }),
        originSizeScale: 1.25,
        size: Object.freeze({ min: 0.19, max: 0.26 }),
      }),
    }),
  ]),
  assetCatalog: LAVA_CANYON_ENVIRONMENT_ASSETS,
  layout: Object.freeze(lavaCanyonLayout.map((placement) => Object.freeze(placement))),
  layers: Object.freeze([]),
});
