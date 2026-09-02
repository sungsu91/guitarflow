const CLOCKWORK_OPERA_ROOT = "/assets/maps/clockwork-opera-citadel";

export const CLOCKWORK_OPERA_ASSETS = Object.freeze([
  Object.freeze({
    id: "clockwork-gear-large",
    label: "상단 좌측 대형 톱니바퀴",
    src: `${CLOCKWORK_OPERA_ROOT}/gear_large_rgba.png`,
    slot: "animated-environment",
    baseWidth: 0.27,
    anchorX: 50,
    anchorY: 50,
  }),
  Object.freeze({
    id: "clockwork-gear-small",
    label: "소형 톱니바퀴",
    src: `${CLOCKWORK_OPERA_ROOT}/gear_small_rgba.png`,
    slot: "animated-environment",
    baseWidth: 0.155,
    anchorX: 50,
    anchorY: 50,
  }),
  Object.freeze({
    id: "clockwork-gear-medium",
    label: "우측 중하단 톱니바퀴",
    src: `${CLOCKWORK_OPERA_ROOT}/gear_medium_rgba.png`,
    slot: "animated-environment",
    baseWidth: 0.22,
    anchorX: 50,
    anchorY: 50,
  }),
  Object.freeze({
    id: "clockwork-pendulum",
    label: "상단 연결축 진자",
    src: `${CLOCKWORK_OPERA_ROOT}/pendulum_rgba.png`,
    slot: "animated-environment",
    baseWidth: 0.145,
    anchorX: 48,
    anchorY: 7.7,
  }),
  Object.freeze({
    id: "clockwork-gatekeeper",
    label: "태엽 문지기",
    src: `${CLOCKWORK_OPERA_ROOT}/gatekeeper_rgba.png`,
    slot: "animated-environment",
    baseWidth: 0.22,
    anchorX: 50,
    anchorY: 100,
  }),
]);
