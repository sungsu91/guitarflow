import ko from "../../../i18n/locales/ko.js";
import { COASTAL_COVE_ENVIRONMENT_ASSETS } from "../assets/coastalCoveAssets.js";
import coastalCoveLayout from "./coastal-cove-layout.json" with { type: "json" };

const COASTAL_COVE_BACKGROUND_SRC = "/assets/maps/coastal-cove/coastal-cove-background.png";

export const COASTAL_COVE_MAP_SKIN = Object.freeze({
  id: "coastal-cove",
  kind: "layered",
  label: ko["shooter.coastalCove"],
  description: ko["shooter.aModularCoastalMapBuiltAroundClearShallowsAndASandyBeach"],
  previewImage: COASTAL_COVE_BACKGROUND_SRC,
  pickerPreviewImage: "/assets/maps/previews/coastal-cove-current.jpg",
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
