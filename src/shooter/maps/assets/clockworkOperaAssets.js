import ko from "../../../i18n/locales/ko.js";
const CLOCKWORK_OPERA_ROOT = "/assets/maps/clockwork-opera-citadel";

export const CLOCKWORK_OPERA_ASSETS = Object.freeze([
  Object.freeze({
    id: "clockwork-gear-large",
    label: ko["shooter.largeUpperLeftGear"],
    src: `${CLOCKWORK_OPERA_ROOT}/gear_large_rgba.png`,
    slot: "animated-environment",
    baseWidth: 0.27,
    anchorX: 50,
    anchorY: 50,
  }),
  Object.freeze({
    id: "clockwork-gear-small",
    label: ko["shooter.smallGear"],
    src: `${CLOCKWORK_OPERA_ROOT}/gear_small_rgba.png`,
    slot: "animated-environment",
    baseWidth: 0.155,
    anchorX: 50,
    anchorY: 50,
  }),
  Object.freeze({
    id: "clockwork-gear-medium",
    label: ko["shooter.lowerRightGear"],
    src: `${CLOCKWORK_OPERA_ROOT}/gear_medium_rgba.png`,
    slot: "animated-environment",
    baseWidth: 0.22,
    anchorX: 50,
    anchorY: 50,
  }),
  Object.freeze({
    id: "clockwork-pendulum",
    label: ko["shooter.topMountedPendulum"],
    src: `${CLOCKWORK_OPERA_ROOT}/pendulum_rgba.png`,
    slot: "animated-environment",
    baseWidth: 0.145,
    anchorX: 48,
    anchorY: 7.7,
  }),
  Object.freeze({
    id: "clockwork-gatekeeper",
    label: ko["shooter.clockworkGatekeeper"],
    src: `${CLOCKWORK_OPERA_ROOT}/gatekeeper_rgba.png`,
    slot: "animated-environment",
    baseWidth: 0.22,
    anchorX: 50,
    anchorY: 100,
  }),
]);
