import { memo, useEffect, useRef } from "react";

import {
  ABYSSAL_WHALE_FIGURE8_VIEWPORT,
  ABYSSAL_WHALE_FIGURE8_STATES,
  advanceAbyssalWhaleFigure8,
  createAbyssalWhaleFigure8DebugState,
  createAbyssalWhaleFigure8State,
  getAbyssalWhaleFigure8Render,
} from "./abyssalWhaleFigure8.js";
import {
  ABYSSAL_WHALE_FIGURE8_FRAMES,
  ABYSSAL_WHALE_FIGURE8_PHASES,
} from "./abyssalWhaleFigure8Frames.js";
import { subscribeSharedMapAnimation } from "./sharedSpriteClock.js";

const TAU = Math.PI * 2;
const FIGURE8_FRAME_IMAGE_CACHE = new Map();

const LIGHTS = Object.freeze([
  Object.freeze({ x: 0.095, y: 0.485, radius: 0.055, phase: 0.2, period: 3.4 }),
  Object.freeze({ x: 0.905, y: 0.485, radius: 0.055, phase: 2.1, period: 4.7 }),
  Object.freeze({ x: 0.12, y: 0.68, radius: 0.04, phase: 3.4, period: 5.2 }),
  Object.freeze({ x: 0.88, y: 0.68, radius: 0.04, phase: 4.8, period: 3.1 }),
  Object.freeze({ x: 0.12, y: 0.82, radius: 0.04, phase: 1.3, period: 4.2 }),
  Object.freeze({ x: 0.88, y: 0.82, radius: 0.04, phase: 5.7, period: 5.4 }),
]);

const SEAHORSE_GLOWS = Object.freeze([
  Object.freeze({ x: 0.22, y: 0.405, period: 22.1, phase: 11.4, radius: 0.014 }),
  Object.freeze({ x: 0.78, y: 0.405, period: 13.7, phase: 7.6, radius: 0.014 }),
]);

const BUBBLE_EMITTERS = Object.freeze([
  Object.freeze({ x: 0.07, y: 0.86, rise: 0.22, drift: 0.018 }),
  Object.freeze({ x: 0.16, y: 0.72, rise: 0.2, drift: 0.015 }),
  Object.freeze({ x: 0.84, y: 0.73, rise: 0.21, drift: 0.016 }),
  Object.freeze({ x: 0.93, y: 0.87, rise: 0.23, drift: 0.019 }),
]);

const BUBBLES = Object.freeze(Array.from({ length: 32 }, (_, index) => Object.freeze({
  emitter: BUBBLE_EMITTERS[index % BUBBLE_EMITTERS.length],
  phase: ((index * 29) % 97) / 97,
  speed: 0.018 + ((index * 7) % 13) * 0.0017,
  size: 0.9 + ((index * 11) % 9) * 0.22,
  sway: index * 1.31,
})));

const DUST = Object.freeze(Array.from({ length: 18 }, (_, index) => Object.freeze({
  x: ((index * 37) % 101) / 101,
  y: ((index * 53) % 103) / 103,
  phase: index * 0.91,
  size: 0.45 + (index % 4) * 0.22,
})));

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function seededState(seed) {
  return { seed: seed >>> 0 };
}

function randomUnit(state) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

function range(state, min, max) {
  return min + (max - min) * randomUnit(state);
}

function createTraveler(seed, durationRange, delayRange, initialProgress = 0) {
  const random = seededState(seed);
  return {
    random,
    active: initialProgress > 0,
    direction: randomUnit(random) > 0.5 ? 1 : -1,
    duration: range(random, durationRange[0], durationRange[1]),
    elapsed: 0,
    hiddenApplied: false,
    hiddenFor: initialProgress > 0 ? 0 : range(random, delayRange[0] * 0.12, delayRange[0] * 0.38),
    durationRange,
    delayRange,
    initialProgress,
  };
}

function beginTravel(traveler) {
  traveler.active = true;
  traveler.elapsed = 0;
  traveler.hiddenApplied = false;
  traveler.duration = range(traveler.random, traveler.durationRange[0], traveler.durationRange[1]);
  traveler.direction = randomUnit(traveler.random) > 0.5 ? 1 : -1;
}

function advanceTraveler(traveler, deltaSeconds) {
  if (!traveler.active) {
    traveler.hiddenFor -= deltaSeconds;
    if (traveler.hiddenFor <= 0) beginTravel(traveler);
    return 0;
  }
  traveler.elapsed += deltaSeconds;
  let progress = traveler.elapsed / traveler.duration;
  if (traveler.initialProgress > 0) {
    progress = traveler.initialProgress + progress;
    traveler.initialProgress = 0;
    traveler.elapsed = progress * traveler.duration;
  }
  if (progress >= 1) {
    traveler.active = false;
    traveler.hiddenFor = range(traveler.random, traveler.delayRange[0], traveler.delayRange[1]);
    return 0;
  }
  return progress;
}

function syncCanvasSize(canvas) {
  const width = Math.round(canvas.clientWidth);
  const height = Math.round(canvas.clientHeight);
  if (!width || !height) return null;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height };
}

function setImageTransform(element, transform, opacity = 1, filter = "none") {
  const image = element?.querySelector("img");
  if (!image) return;
  image.style.transform = transform;
  image.style.opacity = String(opacity);
  image.style.filter = filter;
}

function setTravelerHidden(element, direction) {
  setImageTransform(element, `translate3d(${direction > 0 ? -165 : 145}%, 0, 0) scale(0.96)`, 0, "blur(1.2px) brightness(0.82)");
}

function syncWhaleCanvasSize(canvas) {
  const width = Math.round(canvas.clientWidth);
  const height = Math.round(canvas.clientHeight);
  if (!width || !height) return null;
  const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const renderWidth = Math.round(width * pixelRatio);
  const renderHeight = Math.round(height * pixelRatio);
  if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
    canvas.width = renderWidth;
    canvas.height = renderHeight;
  }
  return { height, pixelRatio, width };
}

function preloadFigure8Frame(src) {
  const cached = FIGURE8_FRAME_IMAGE_CACHE.get(src);
  if (cached) return cached;
  const promise = new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    const finish = () => resolve(image.naturalWidth > 0 ? image : null);
    image.addEventListener("load", () => {
      if (typeof image.decode !== "function") {
        finish();
        return;
      }
      image.decode().catch(() => undefined).finally(finish);
    }, { once: true });
    image.addEventListener("error", () => resolve(null), { once: true });
    image.src = src;
  });
  FIGURE8_FRAME_IMAGE_CACHE.set(src, promise);
  return promise;
}

function preloadFigure8Frames() {
  return Promise.all(ABYSSAL_WHALE_FIGURE8_FRAMES.map(async (src) => (
    [src, await preloadFigure8Frame(src)]
  ))).then((entries) => new Map(entries.filter(([, image]) => image)));
}

function drawWhaleFrame(context, image, width, opacity) {
  if (!image || opacity <= 0) return;
  const height = width * image.naturalHeight / image.naturalWidth;
  context.globalAlpha = opacity;
  context.drawImage(image, -width / 2, -height / 2, width, height);
}

function getFigure8FrameImages(images, render) {
  const phase = ABYSSAL_WHALE_FIGURE8_PHASES[render.phaseId];
  const previousPhase = render.previousPhaseId
    ? ABYSSAL_WHALE_FIGURE8_PHASES[render.previousPhaseId]
    : null;
  const frameASource = (previousPhase ?? phase)?.frames[render.frameA];
  const frameBSource = phase?.frames[render.frameB];
  return {
    imageA: images.get(frameASource),
    imageB: images.get(frameBSource),
  };
}

function drawFigure8Whale(element, images, render) {
  const canvas = element?.querySelector(".shooterMapFigure8WhaleCanvas");
  if (!canvas) return;
  const size = syncWhaleCanvasSize(canvas);
  if (!size) return;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;
  context.setTransform(size.pixelRatio, 0, 0, size.pixelRatio, 0, 0);
  context.clearRect(0, 0, size.width, size.height);
  canvas.dataset.whaleFrame = `${render.phaseId}:${render.frameA}-${render.frameB}`;
  canvas.dataset.whaleProgress = render.motionProgress.toFixed(4);
  canvas.dataset.whaleState = render.state;
  canvas.dataset.whaleFrontLayerMix = render.frontLayerMix.toFixed(4);
  if (import.meta.env.DEV) {
    canvas.dataset.whaleRenderCount = String(
      (Number.parseInt(canvas.dataset.whaleRenderCount || "0", 10) || 0) + 1,
    );
    canvas.dataset.whaleX = render.x.toFixed(5);
    canvas.dataset.whaleY = render.y.toFixed(5);
    canvas.dataset.whaleScale = render.scale.toFixed(5);
    canvas.dataset.whaleOpacity = render.opacity.toFixed(5);
    canvas.dataset.whaleBlur = render.blurPx.toFixed(3);
  }
  canvas.style.filter = `blur(${render.blurPx.toFixed(3)}px) brightness(1.08) saturate(1.02)`;
  const frontLayer = canvas.dataset.whaleDepthLayer === "front";
  const layerOpacity = render.opacity * (frontLayer
    ? render.frontLayerMix
    : 1 - render.frontLayerMix);
  if (layerOpacity <= 0.001) return;

  const offsetX = Number(element.dataset.whaleOffsetX) || 0;
  const offsetY = Number(element.dataset.whaleOffsetY) || 0;
  const scaleMultiplier = Math.min(
    1.35,
    Math.max(0.65, Number(element.dataset.whaleScaleMultiplier) || 1),
  );
  const viewportWidth = ABYSSAL_WHALE_FIGURE8_VIEWPORT.right
    - ABYSSAL_WHALE_FIGURE8_VIEWPORT.left;
  const viewportHeight = ABYSSAL_WHALE_FIGURE8_VIEWPORT.bottom
    - ABYSSAL_WHALE_FIGURE8_VIEWPORT.top;
  const whaleX = (render.x + offsetX - ABYSSAL_WHALE_FIGURE8_VIEWPORT.left) / viewportWidth;
  const whaleY = (render.y + offsetY - ABYSSAL_WHALE_FIGURE8_VIEWPORT.top) / viewportHeight;
  const whaleWidth = size.width / viewportWidth * render.scale * scaleMultiplier;
  const { imageA, imageB } = getFigure8FrameImages(images, render);

  context.save();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.translate(whaleX * size.width, whaleY * size.height + render.bobPx);
  context.rotate(render.rotationDegrees * Math.PI / 180);
  drawWhaleFrame(
    context,
    imageA,
    whaleWidth,
    layerOpacity * (1 - render.frameMix),
  );
  drawWhaleFrame(
    context,
    imageB,
    whaleWidth,
    layerOpacity * render.frameMix,
  );
  context.restore();
}

function drawFigure8WhaleLayers(nodes, images, render) {
  drawFigure8Whale(nodes.whaleRear, images, render);
  drawFigure8Whale(nodes.whaleFront, images, render);
}

function updateFish(element, traveler, deltaSeconds, index) {
  const progress = advanceTraveler(traveler, deltaSeconds);
  if (!traveler.active || progress <= 0) {
    if (!traveler.hiddenApplied) {
      setTravelerHidden(element, traveler.direction);
      traveler.hiddenApplied = true;
    }
    return;
  }
  const fade = Math.pow(Math.sin(progress * Math.PI), 1.8);
  const travel = traveler.direction > 0
    ? -180 + progress * 350
    : 170 - progress * 350;
  const bob = Math.sin(progress * TAU * (1.1 + index * 0.17)) * (2.2 + index);
  const facing = traveler.direction > 0 ? 1 : -1;
  setImageTransform(
    element,
    `translate3d(${travel}%, ${bob.toFixed(2)}px, 0) scaleX(${facing})`,
    fade * (index === 0 ? 0.18 : 0.14),
    "blur(0.45px) brightness(0.9) saturate(0.72)",
  );
}

function setRotation(element, degrees) {
  const image = element?.querySelector("img");
  if (image) image.style.transform = `rotate(${degrees.toFixed(4)}deg)`;
}

function createGuardianReaction(seed) {
  const random = seededState(seed);
  return {
    active: false,
    amount: 0,
    duration: 0,
    elapsed: 0,
    headDirection: 1,
    random,
    type: "none",
    wait: range(random, 10, 25),
  };
}

function updateGuardianReaction(element, reaction, deltaSeconds) {
  if (!reaction.active) {
    reaction.wait -= deltaSeconds;
    if (reaction.wait <= 0) {
      reaction.active = true;
      reaction.duration = range(reaction.random, 1.45, 2.35);
      reaction.elapsed = 0;
      reaction.headDirection = randomUnit(reaction.random) > 0.5 ? 1 : -1;
      reaction.type = ["eyes", "head", "chest"][Math.floor(randomUnit(reaction.random) * 3)];
    }
  }

  if (reaction.active) {
    reaction.elapsed += deltaSeconds;
    const progress = Math.min(1, reaction.elapsed / reaction.duration);
    reaction.amount = Math.sin(progress * Math.PI);
    if (progress >= 1) {
      reaction.active = false;
      reaction.amount = 0;
      reaction.type = "none";
      reaction.wait = range(reaction.random, 10, 25);
    }
  }

  const headAngle = reaction.type === "head"
    ? reaction.amount * reaction.headDirection * 1.65
    : 0;
  element?.style.setProperty("--abyssal-guardian-head", `${headAngle.toFixed(3)}deg`);
  return reaction;
}

function drawRadialGlow(context, x, y, radius, coreAlpha, bloomAlpha, scale = 1) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius * scale);
  gradient.addColorStop(0, `rgba(198, 248, 255, ${coreAlpha})`);
  gradient.addColorStop(0.28, `rgba(42, 197, 255, ${coreAlpha * 0.62})`);
  gradient.addColorStop(0.68, `rgba(28, 126, 255, ${bloomAlpha * 0.45})`);
  gradient.addColorStop(1, `rgba(16, 92, 255, ${bloomAlpha * 0})`);
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius * scale, 0, TAU);
  context.fill();
}

function drawCanvasEffects(canvas, elapsedSeconds, gatekeeperReaction = null) {
  const size = syncCanvasSize(canvas);
  if (!size) return;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;
  context.clearRect(0, 0, size.width, size.height);
  context.save();
  context.globalCompositeOperation = "screen";

  LIGHTS.forEach((light) => {
    const pulse = 0.5 + Math.sin((elapsedSeconds / light.period) * TAU + light.phase) * 0.5;
    const core = 0.78 + pulse * 0.22;
    const bloom = 0.1 + pulse * 0.14;
    drawRadialGlow(
      context,
      light.x * size.width,
      light.y * size.height,
      light.radius * Math.min(size.width, size.height),
      core * 0.34,
      bloom,
      0.97 + pulse * 0.06,
    );
  });

  SEAHORSE_GLOWS.forEach((guardian) => {
    const local = modulo(elapsedSeconds + guardian.phase, guardian.period);
    const reaction = local < 2.4 ? Math.sin((local / 2.4) * Math.PI) : 0;
    if (reaction <= 0) return;
    drawRadialGlow(
      context,
      guardian.x * size.width,
      guardian.y * size.height,
      guardian.radius * Math.min(size.width, size.height),
      reaction * 0.45,
      reaction * 0.18,
      1,
    );
  });

  if (gatekeeperReaction?.amount > 0) {
    const eyeReaction = gatekeeperReaction.type === "eyes" ? gatekeeperReaction.amount : 0;
    const chestReaction = gatekeeperReaction.type === "chest" ? gatekeeperReaction.amount : 0;
    if (eyeReaction > 0) {
      drawRadialGlow(
        context,
        0.16 * size.width,
        0.515 * size.height,
        0.013 * Math.min(size.width, size.height),
        eyeReaction * 0.5,
        eyeReaction * 0.2,
        1,
      );
    }
    if (chestReaction > 0) {
      drawRadialGlow(
        context,
        0.16 * size.width,
        0.565 * size.height,
        0.021 * Math.min(size.width, size.height),
        chestReaction * 0.28,
        chestReaction * 0.16,
        1,
      );
    }
  }

  BUBBLES.forEach((bubble) => {
    const travel = modulo(bubble.phase + elapsedSeconds * bubble.speed, 1);
    const opacity = Math.sin(travel * Math.PI) * 0.34;
    const x = (
      bubble.emitter.x
      + Math.sin(elapsedSeconds * 0.62 + bubble.sway) * bubble.emitter.drift * travel
    ) * size.width;
    const y = (bubble.emitter.y - travel * bubble.emitter.rise) * size.height;
    context.globalAlpha = Math.max(0, opacity);
    context.strokeStyle = "rgba(184, 239, 255, 0.82)";
    context.lineWidth = 0.65;
    context.beginPath();
    context.arc(x, y, bubble.size * (0.8 + travel * 0.7), 0, TAU);
    context.stroke();
  });

  DUST.forEach((particle) => {
    const y = modulo(particle.y - elapsedSeconds * 0.0035, 1);
    const x = particle.x + Math.sin(elapsedSeconds * 0.19 + particle.phase) * 0.008;
    context.globalAlpha = 0.1 + Math.sin(elapsedSeconds * 0.41 + particle.phase) * 0.04;
    context.fillStyle = "#b7eaff";
    context.beginPath();
    context.arc(x * size.width, y * size.height, particle.size, 0, TAU);
    context.fill();
  });
  context.restore();
}

function applyStaticPreview(
  nodes,
  frameImages,
  whaleState = ABYSSAL_WHALE_FIGURE8_STATES.RIGHT_REVEAL_APPROACH,
  whaleProgress = 0.72,
) {
  drawFigure8WhaleLayers(
    nodes,
    frameImages,
    getAbyssalWhaleFigure8Render(
      createAbyssalWhaleFigure8DebugState(whaleState, whaleProgress),
    ),
  );
  nodes.fish.forEach((element, index) => {
    setImageTransform(element, "translate3d(0, 0, 0)", index === 0 ? 0.32 : 0.26, "blur(0.45px) brightness(0.94) saturate(0.72)");
  });
  setRotation(nodes.bellBody, 0);
  setRotation(nodes.clapper, 0);
  setRotation(nodes.orreryOuter, 0);
  setRotation(nodes.orreryMiddle, 0);
  setRotation(nodes.orreryInner, 0);
  nodes.gatekeeper?.style.setProperty("--abyssal-guardian-head", "0deg");
  nodes.banners.forEach((element) => {
    element.style.setProperty("--abyssal-banner-mid", "0deg");
    element.style.setProperty("--abyssal-banner-tail", "0deg");
  });
}

function AbyssalMoonRuntimeField({ active = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = canvas?.closest(".shooterMapSkinStage");
    if (!canvas || !stage) return undefined;
    const find = (animation) => stage.querySelector(`[data-animation="${animation}"]`);
    const nodes = {
      whaleRear: find("abyssal-whale-figure8-v8"),
      whaleFront: find("abyssal-whale-figure8-v8-front"),
      fish: [...stage.querySelectorAll('[data-animation="abyssal-fish-school"]')],
      bellBody: find("abyssal-bell-body"),
      clapper: find("abyssal-bell-clapper"),
      orreryOuter: find("abyssal-orrery-outer"),
      orreryMiddle: find("abyssal-orrery-middle"),
      orreryInner: find("abyssal-orrery-inner"),
      kelp: [...stage.querySelectorAll('[data-animation="abyssal-kelp"]')],
      banners: [...stage.querySelectorAll('[data-animation="abyssal-banner"]')],
      gatekeeper: stage.querySelector('[data-asset-id="abyssal-gatekeeper"]'),
    };
    const debugParams = import.meta.env.DEV
      ? new URLSearchParams(window.location.search)
      : null;
    const debugWhaleStateValue = debugParams?.get("abyssalWhaleV8State") ?? "";
    const debugWhaleProgressValue = debugParams?.get("abyssalWhaleV8Progress") ?? null;
    const parsedDebugWhaleProgress = Number(debugWhaleProgressValue);
    const debugWhaleProgress = debugWhaleProgressValue !== null && Number.isFinite(parsedDebugWhaleProgress)
      ? Math.min(1, Math.max(0, parsedDebugWhaleProgress))
      : null;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    drawCanvasEffects(canvas, 0);
    let cancelled = false;
    let unsubscribe = () => {};
    void preloadFigure8Frames().then((frameImages) => {
      if (cancelled) return;
      const debugMode = Boolean(debugWhaleStateValue) || debugWhaleProgress !== null;
      if (debugMode || !active || reducedMotion) {
        applyStaticPreview(
          nodes,
          frameImages,
          debugWhaleStateValue || ABYSSAL_WHALE_FIGURE8_STATES.RIGHT_REVEAL_APPROACH,
          debugWhaleProgress ?? 0.72,
        );
        return;
      }

      const whale = createAbyssalWhaleFigure8State(0x8f17a11e);
      drawFigure8WhaleLayers(nodes, frameImages, getAbyssalWhaleFigure8Render(whale));
      const fish = [
        createTraveler(0xf153001, [18, 26], [18, 42], 0.2),
        createTraveler(0xf153002, [21, 31], [24, 52], 0),
      ];
      const gatekeeperReaction = createGuardianReaction(0x6a7e5eed);
      let elapsedSeconds = 0;
      let lastTimestamp = 0;

      unsubscribe = subscribeSharedMapAnimation(canvas, (timestampMs) => {
        const arena = canvas.closest(".shooterArena");
        const paused = arena?.classList.contains("paused")
          || arena?.classList.contains("shooterArena--animationsPaused");
        if (!lastTimestamp) lastTimestamp = timestampMs;
        const deltaSeconds = Math.min(0.1, Math.max(0, (timestampMs - lastTimestamp) / 1000));
        lastTimestamp = timestampMs;
        if (paused) return;
        elapsedSeconds += deltaSeconds;

        advanceAbyssalWhaleFigure8(whale, deltaSeconds);
        drawFigure8WhaleLayers(nodes, frameImages, getAbyssalWhaleFigure8Render(whale));
        nodes.fish.forEach((element, index) => updateFish(element, fish[index], deltaSeconds, index));

        const bellPeriod = 6.4;
        const bellWave = Math.sin((elapsedSeconds / bellPeriod) * TAU);
        setRotation(nodes.bellBody, bellWave * 3.5);
        setRotation(nodes.clapper, Math.sin((elapsedSeconds / bellPeriod) * TAU - 0.42) * -6);
        setRotation(nodes.orreryOuter, (elapsedSeconds / 34) * 360);
        setRotation(nodes.orreryMiddle, -(elapsedSeconds / 26) * 360);
        setRotation(nodes.orreryInner, (elapsedSeconds / 18) * 360);

        nodes.kelp.forEach((element, index) => {
          const speed = 4.2 + (index % 5) * 0.72;
          const wave = Math.sin((elapsedSeconds / speed) * TAU + index * 0.93);
          element.style.setProperty("--abyssal-kelp-mid", `${(wave * (1.1 + index % 3 * 0.25)).toFixed(3)}deg`);
          element.style.setProperty("--abyssal-kelp-tip", `${(wave * (2.5 + index % 4 * 0.34)).toFixed(3)}deg`);
        });
        nodes.banners.forEach((element, index) => {
          const period = index === 0 ? 5.4 : 6.7;
          const wave = Math.sin((elapsedSeconds / period) * TAU + index * 2.3);
          element.style.setProperty("--abyssal-banner-mid", `${(wave * 0.8).toFixed(3)}deg`);
          element.style.setProperty("--abyssal-banner-tail", `${(wave * 2.2).toFixed(3)}deg`);
        });
        updateGuardianReaction(nodes.gatekeeper, gatekeeperReaction, deltaSeconds);
        drawCanvasEffects(canvas, elapsedSeconds, gatekeeperReaction);
      }, { framesPerSecond: 30 });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [active]);

  return (
    <canvas
      aria-hidden="true"
      className="shooterMapAbyssalRuntime"
      data-bubble-pool-size={BUBBLES.length}
      data-fish-pool-size="2"
      data-light-count={LIGHTS.length}
      ref={canvasRef}
    />
  );
}

export default memo(AbyssalMoonRuntimeField);
