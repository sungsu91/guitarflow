import { ABYSSAL_MOON_CATHEDRAL_ASSETS } from "../assets/abyssalMoonCathedralAssets.js";
import abyssalLayout from "./abyssal-moon-cathedral-layout.json" with { type: "json" };

const ABYSSAL_ROOT = "/assets/maps/abyssal-moon-cathedral";

export const ABYSSAL_MOON_CATHEDRAL_MAP_SKIN = Object.freeze({
  id: "abyssalMoonCathedral",
  kind: "layered",
  label: "ABYSSAL",
  nameKo: "심해 월광 대성당",
  nameEn: "Abyssal Moon Cathedral",
  description: "달빛이 내려오는 침몰한 심해 대성당",
  mobileOnly: false,
  previewImage: `${ABYSSAL_ROOT}/00_master_reference.png`,
  pickerPreviewImage: "/assets/maps/previews/abyssal-moon-cathedral-current.jpg",
  architectureMask: Object.freeze({
    src: `${ABYSSAL_ROOT}/architecture_occlusion_foreground.png`,
    sourceWidth: 841,
    sourceHeight: 1870,
    fit: "contain",
    position: "center center",
  }),
  performance: Object.freeze({
    mobileGameplay: Object.freeze({
      mode: "full",
      audit: Object.freeze({
        completed: true,
        contentFingerprint: "3e25d3e3",
        activeCssAnimations: 0,
        ambientEventLayers: 0,
        filteredElements: 3,
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
    id: "abyssal-moon-cathedral-background",
    src: `${ABYSSAL_ROOT}/01_clean_background.png`,
    fit: "contain",
    position: "center center",
    locked: true,
  }),
  assetCatalog: ABYSSAL_MOON_CATHEDRAL_ASSETS,
  layout: Object.freeze(abyssalLayout.map((placement) => Object.freeze(placement))),
  layers: Object.freeze([]),
});
