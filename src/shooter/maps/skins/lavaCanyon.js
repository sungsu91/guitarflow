import { LAVA_CANYON_ENVIRONMENT_ASSETS } from "../assets/lavaCanyonAssets.js";
import lavaCanyonLayout from "./lava-canyon-layout.json" with { type: "json" };

const LAVA_CANYON_BACKGROUND_SRC = "/assets/maps/lava-canyon/lava-canyon-background.png";
const LAVA_CANYON_EVENT_ROOT = "/assets/maps/lava-canyon/events";

const LAVA_CANYON_BOUNDARY_PATHS = Object.freeze([
  Object.freeze({
    id: "lava-bank-left",
    phase: 0,
    strength: 1,
    d: "M318 0 L291 20 L269 40 L277 60 L277 80 L258 100 L240 120 L252 140 L268 160 L279 180 L297 200 L305 220 L309 240 L310 260 L289 280 L272 300 L248 320 L235 340 L256 360 L269 380 L267 400 L263 420 L259 440 L239 460 L226 480 L229 500 L245 520 L249 540 L240 560 L212 580 L204 600 L222 620 L243 640 L262 660 L248 680 L226 700 L205 720 L199 740 L213 760 L229 780 L226 800 L232 820 L259 840 L264 860 L235 880 L205 900 L207 920 L211 940 L201 960 L183 980 L167 1000 L172 1020 L202 1040 L231 1060 L240 1080 L241 1100 L239 1120 L241 1140 L242 1160 L218 1180 L186 1200 L175 1220 L170 1240 L172 1260 L185 1280 L188 1300 L177 1320 L179 1340 L209 1360 L221 1380 L212 1400 L216 1420 L202 1440 L175 1460 L176 1480 L187 1500 L194 1520 L213 1540 L235 1560 L241 1580 L258 1600 L296 1620 L304 1640 L260 1660 L222 1680 L201 1700 L171 1720 L171 1740 L187 1760 L219 1780 L262 1800 L258 1820 L233 1840 L228 1846",
  }),
  Object.freeze({
    id: "lava-bank-right",
    phase: 1,
    strength: 1,
    d: "M568 0 L561 20 L544 40 L539 60 L565 80 L591 100 L584 120 L570 140 L559 160 L566 180 L605 200 L631 220 L612 240 L579 260 L565 280 L566 300 L564 320 L563 340 L589 360 L620 380 L647 400 L676 420 L674 440 L653 460 L641 480 L626 500 L601 520 L595 540 L600 560 L607 580 L619 600 L626 620 L631 640 L646 660 L664 680 L664 700 L660 720 L651 740 L648 760 L656 780 L669 800 L673 820 L647 840 L617 860 L600 880 L602 900 L600 920 L598 940 L610 960 L641 980 L675 1000 L691 1020 L694 1040 L690 1060 L683 1080 L669 1100 L634 1120 L610 1140 L608 1160 L613 1180 L614 1200 L617 1220 L630 1240 L640 1260 L662 1280 L688 1300 L708 1320 L711 1340 L695 1360 L685 1380 L674 1400 L656 1420 L630 1440 L611 1460 L608 1480 L614 1500 L625 1520 L624 1540 L596 1560 L583 1580 L616 1600 L645 1620 L643 1640 L633 1660 L626 1680 L624 1700 L618 1720 L614 1740 L633 1760 L642 1780 L619 1800 L607 1820 L612 1840 L613 1846",
  }),
]);

export const LAVA_CANYON_MAP_SKIN = Object.freeze({
  id: "lava-canyon",
  kind: "layered",
  label: "용암 계곡",
  description: "넓은 용암 통로를 중심으로 조립하는 모듈형 협곡 맵",
  previewImage: LAVA_CANYON_BACKGROUND_SRC,
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
  boundaryGlowOverlay: Object.freeze({
    id: "lava-canyon-boundary-glow",
    enabled: true,
    viewBox: Object.freeze([0, 0, 852, 1846]),
    preserveAspectRatio: "xMidYMid slice",
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    opacity: 0.9,
    intensity: 1,
    duration: 9.4,
    colors: Object.freeze({
      outer: "#ff2a00",
      middle: "#ff8a00",
      core: "#fff4a8",
    }),
    blur: Object.freeze({
      outer: 11,
      middle: 4.2,
      core: 0.7,
    }),
    paths: LAVA_CANYON_BOUNDARY_PATHS,
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
