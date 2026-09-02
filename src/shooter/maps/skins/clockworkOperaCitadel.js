import { CLOCKWORK_OPERA_ASSETS } from "../assets/clockworkOperaAssets.js";
import clockworkOperaLayout from "./clockwork-opera-citadel-layout.json" with { type: "json" };

const CLOCKWORK_OPERA_ROOT = "/assets/maps/clockwork-opera-citadel";
const CLOCKWORK_OPERA_BACKGROUND_SRC = `${CLOCKWORK_OPERA_ROOT}/clockwork_opera_clean_background.png`;

export const CLOCKWORK_OPERA_CITADEL_MAP_SKIN = Object.freeze({
  id: "clockwork-opera-citadel",
  kind: "layered",
  label: "CLOCKWORK",
  nameKo: "태엽 오페라 성채",
  nameEn: "Clockwork Opera Citadel",
  description: "거대한 오르간과 태엽 장치가 울리는 기계 오페라 성채",
  mobileOnly: false,
  previewImage: `${CLOCKWORK_OPERA_ROOT}/clockwork_opera_master.png`,
  pickerPreviewImage: "/assets/maps/previews/clockwork-opera-citadel-current.jpg",
  performance: Object.freeze({
    mobileGameplay: Object.freeze({
      mode: "full",
      audit: Object.freeze({
        completed: true,
        contentFingerprint: "f2940df9",
        activeCssAnimations: 6,
        ambientEventLayers: 0,
        filteredElements: 6,
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
    id: "clockwork-opera-citadel-background",
    src: CLOCKWORK_OPERA_BACKGROUND_SRC,
    fit: "contain",
    position: "center center",
    locked: true,
  }),
  assetCatalog: CLOCKWORK_OPERA_ASSETS,
  layout: Object.freeze(clockworkOperaLayout.map((placement) => Object.freeze(placement))),
  layers: Object.freeze([]),
});
