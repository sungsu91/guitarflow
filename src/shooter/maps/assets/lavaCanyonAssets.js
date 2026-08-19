const LAVA_CANYON_PLATFORM_ROOT = "/assets/maps/lava-canyon/platforms";
const LAVA_CANYON_EFFECT_ROOT = "/assets/maps/lava-canyon/effects";
const LAVA_CANYON_DRAGON_ROOT = "/assets/maps/lava-canyon/creatures/baby-dragon";
const LAVA_CANYON_EVENT_ROOT = "/assets/maps/lava-canyon/events";
const LAVA_CANYON_DECORATION_ROOT = "/assets/maps/lava-canyon/decorations";

export const LAVA_CANYON_ENVIRONMENT_ASSETS = Object.freeze([
  Object.freeze({
    id: "lava-guitar-platform",
    label: "하단 용암석 기타 발판",
    src: `${LAVA_CANYON_PLATFORM_ROOT}/lava-guitar-platform.png`,
    slot: "midground-environment",
    baseWidth: 1.16,
  }),
  Object.freeze({
    id: "lava-geyser",
    label: "용암 대분출",
    src: `${LAVA_CANYON_EFFECT_ROOT}/lava-geyser.png`,
    slot: "animated-environment",
    baseWidth: 0.5,
    anchorX: 50,
    anchorY: 96,
  }),
  Object.freeze({
    id: "lava-boiling-pool",
    label: "보글거리는 용암 웅덩이",
    src: `${LAVA_CANYON_EFFECT_ROOT}/lava-boiling-pool.png`,
    slot: "animated-environment",
    baseWidth: 0.68,
    anchorX: 50,
    anchorY: 92,
  }),
  Object.freeze({
    id: "ambient-baby-dragon",
    label: "쉬고 있는 아기 용",
    src: `${LAVA_CANYON_DRAGON_ROOT}/dragon-idle.png`,
    slot: "animated-environment",
    baseWidth: 0.34,
    anchorX: 50,
    anchorY: 90,
    creature: Object.freeze({
      type: "baby-dragon",
      frames: Object.freeze({
        idle: `${LAVA_CANYON_DRAGON_ROOT}/dragon-idle.png`,
        blink: `${LAVA_CANYON_DRAGON_ROOT}/dragon-blink.png`,
        rest: `${LAVA_CANYON_DRAGON_ROOT}/dragon-rest.png`,
        sleep: `${LAVA_CANYON_DRAGON_ROOT}/dragon-sleep.png`,
        inhale: `${LAVA_CANYON_DRAGON_ROOT}/dragon-inhale.png`,
        openMouth: `${LAVA_CANYON_DRAGON_ROOT}/dragon-open-mouth.png`,
        breath: `${LAVA_CANYON_DRAGON_ROOT}/dragon-breath.png`,
        smoke: `${LAVA_CANYON_DRAGON_ROOT}/dragon-smoke.png`,
      }),
      defaults: Object.freeze({
        enabled: true,
        idleInterval: 5.8,
        breathChance: 0.14,
        sleepChance: 0.3,
        sleepDuration: 7.2,
        animationSpeed: 1,
      }),
    }),
  }),
  Object.freeze({
    id: "ambient-flying-baby-dragon",
    label: "비행하는 용",
    src: `${LAVA_CANYON_EVENT_ROOT}/baby-dragon-flight-sheet.png`,
    slot: "animated-environment",
    baseWidth: 0.2,
    anchorX: 50,
    anchorY: 90,
    maxInstances: 1,
    spriteSheet: Object.freeze({
      columns: 3,
      rows: 2,
      frameCount: 6,
      previewFrame: 0,
    }),
    eventActor: Object.freeze({
      type: "flying-dragon-crossing",
    }),
  }),
  Object.freeze({
    id: "tattered-dragon-banner",
    label: "펄럭이는 찢어진 용 깃발",
    src: `${LAVA_CANYON_DECORATION_ROOT}/tattered-dragon-banner-cloth-01.png`,
    slot: "animated-environment",
    baseWidth: 0.32,
    anchorX: 18,
    anchorY: 96,
    spriteSheet: Object.freeze({
      columns: 1,
      rows: 1,
      frameCount: 3,
      previewFrame: 0,
      animation: "wind-flag",
      framesPerSecond: 4,
      staticSrc: `${LAVA_CANYON_DECORATION_ROOT}/tattered-dragon-banner-pole.png`,
      frames: Object.freeze([
        Object.freeze({
          src: `${LAVA_CANYON_DECORATION_ROOT}/tattered-dragon-banner-cloth-01.png`,
          scale: 0.9,
          translateX: 13.96,
          translateY: 12.04,
        }),
        Object.freeze({
          src: `${LAVA_CANYON_DECORATION_ROOT}/tattered-dragon-banner-cloth-02.png`,
          scale: 0.78,
          translateX: 22.73,
          translateY: 8.13,
        }),
        Object.freeze({
          src: `${LAVA_CANYON_DECORATION_ROOT}/tattered-dragon-banner-cloth-03.png`,
          scale: 0.82,
          translateX: 19.78,
          translateY: 5.82,
        }),
      ]),
    }),
  }),
]);
