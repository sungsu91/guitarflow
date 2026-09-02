const TAU = Math.PI * 2;

export const ABYSSAL_WHALE_FIGURE8_STATES = Object.freeze({
  HIDDEN: "HIDDEN",
  RIGHT_REVEAL_APPROACH: "RIGHT_REVEAL_APPROACH",
  CENTER_TURN_DIVE: "CENTER_TURN_DIVE",
  DEEP_REAR_CURVE: "DEEP_REAR_CURVE",
  LEFT_RETURN_APPROACH: "LEFT_RETURN_APPROACH",
  CENTER_CROSS_RIGHT_EXIT: "CENTER_CROSS_RIGHT_EXIT",
  DEEP_HOLD: "DEEP_HOLD",
  COOLDOWN: "COOLDOWN",
});

export const ABYSSAL_WHALE_FIGURE8_VIEWPORT = Object.freeze({
  left: 0.17,
  right: 0.83,
  top: 0.055,
  bottom: 0.29,
});

export const ABYSSAL_WHALE_FIGURE8_PATH = Object.freeze([
  Object.freeze({ x: 0.74, y: 0.12, scale: 0.14 }),
  Object.freeze({ x: 0.56, y: 0.17, scale: 0.28 }),
  Object.freeze({ x: 0.505, y: 0.125, scale: 0.14 }),
  Object.freeze({ x: 0.505, y: 0.055, scale: 0.1 }),
]);

export const ABYSSAL_WHALE_FIGURE8_DURATION_RANGES = Object.freeze({
  [ABYSSAL_WHALE_FIGURE8_STATES.HIDDEN]: Object.freeze([1, 2]),
  [ABYSSAL_WHALE_FIGURE8_STATES.RIGHT_REVEAL_APPROACH]: Object.freeze([6.5, 8.5]),
  [ABYSSAL_WHALE_FIGURE8_STATES.CENTER_TURN_DIVE]: Object.freeze([7, 9]),
  [ABYSSAL_WHALE_FIGURE8_STATES.DEEP_REAR_CURVE]: Object.freeze([5.5, 7.5]),
  [ABYSSAL_WHALE_FIGURE8_STATES.LEFT_RETURN_APPROACH]: Object.freeze([7, 9.5]),
  [ABYSSAL_WHALE_FIGURE8_STATES.CENTER_CROSS_RIGHT_EXIT]: Object.freeze([7.5, 10]),
  [ABYSSAL_WHALE_FIGURE8_STATES.DEEP_HOLD]: Object.freeze([0.35, 0.7]),
  [ABYSSAL_WHALE_FIGURE8_STATES.COOLDOWN]: Object.freeze([3.5, 6]),
});

const MOTION_STATES = Object.freeze([
  ABYSSAL_WHALE_FIGURE8_STATES.RIGHT_REVEAL_APPROACH,
  ABYSSAL_WHALE_FIGURE8_STATES.CENTER_TURN_DIVE,
  ABYSSAL_WHALE_FIGURE8_STATES.DEEP_REAR_CURVE,
]);

const STATE_ORDER = Object.freeze([
  ABYSSAL_WHALE_FIGURE8_STATES.HIDDEN,
  ...MOTION_STATES,
  ABYSSAL_WHALE_FIGURE8_STATES.DEEP_HOLD,
  ABYSSAL_WHALE_FIGURE8_STATES.COOLDOWN,
]);

const BASE_DURATIONS = Object.freeze({
  [ABYSSAL_WHALE_FIGURE8_STATES.RIGHT_REVEAL_APPROACH]: 6.8,
  [ABYSSAL_WHALE_FIGURE8_STATES.CENTER_TURN_DIVE]: 7.2,
  [ABYSSAL_WHALE_FIGURE8_STATES.DEEP_REAR_CURVE]: 5.8,
  [ABYSSAL_WHALE_FIGURE8_STATES.LEFT_RETURN_APPROACH]: 7.2,
  [ABYSSAL_WHALE_FIGURE8_STATES.CENTER_CROSS_RIGHT_EXIT]: 7.8,
  [ABYSSAL_WHALE_FIGURE8_STATES.DEEP_HOLD]: 0.5,
});

const STATE_PHASES = Object.freeze({
  [ABYSSAL_WHALE_FIGURE8_STATES.RIGHT_REVEAL_APPROACH]: "rightApproach",
  [ABYSSAL_WHALE_FIGURE8_STATES.CENTER_TURN_DIVE]: "centerTurnDive",
  [ABYSSAL_WHALE_FIGURE8_STATES.DEEP_REAR_CURVE]: "distantRearCurve",
  [ABYSSAL_WHALE_FIGURE8_STATES.LEFT_RETURN_APPROACH]: "leftReturn",
  [ABYSSAL_WHALE_FIGURE8_STATES.CENTER_CROSS_RIGHT_EXIT]: "centerCrossRightExit",
  [ABYSSAL_WHALE_FIGURE8_STATES.DEEP_HOLD]: "distantRearCurve",
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function smootherstep(value) {
  const progress = clamp01(value);
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
}

function lerp(from, to, progress) {
  return from + (to - from) * progress;
}

function randomUnit(state) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

function randomRange(state, minimum, maximum) {
  return minimum + (maximum - minimum) * randomUnit(state);
}

function configureCycle(state) {
  const cycleVariation = randomRange(state, 0.9, 1.1);
  const hiddenRange = ABYSSAL_WHALE_FIGURE8_DURATION_RANGES[ABYSSAL_WHALE_FIGURE8_STATES.HIDDEN];
  const cooldownRange = ABYSSAL_WHALE_FIGURE8_DURATION_RANGES[ABYSSAL_WHALE_FIGURE8_STATES.COOLDOWN];
  const durations = {
    [ABYSSAL_WHALE_FIGURE8_STATES.HIDDEN]: randomRange(state, ...hiddenRange),
    [ABYSSAL_WHALE_FIGURE8_STATES.COOLDOWN]: randomRange(state, ...cooldownRange),
  };
  [...MOTION_STATES, ABYSSAL_WHALE_FIGURE8_STATES.DEEP_HOLD].forEach((animationState) => {
    const [minimum, maximum] = ABYSSAL_WHALE_FIGURE8_DURATION_RANGES[animationState];
    durations[animationState] = clamp(
      BASE_DURATIONS[animationState] * cycleVariation,
      minimum,
      maximum,
    );
  });

  const nodeTimes = [0];
  MOTION_STATES.forEach((animationState) => {
    nodeTimes.push(nodeTimes.at(-1) + durations[animationState]);
  });
  state.cycleVariation = cycleVariation;
  state.durations = durations;
  state.motionDuration = nodeTimes.at(-1);
  state.nodeTimes = nodeTimes;
}

function getTimedDerivative(points, times, index, key) {
  if (index <= 0) {
    return (points[1][key] - points[0][key]) / (times[1] - times[0]);
  }
  if (index >= points.length - 1) {
    const last = points.length - 1;
    return (points[last][key] - points[last - 1][key]) / (times[last] - times[last - 1]);
  }
  return (points[index + 1][key] - points[index - 1][key])
    / (times[index + 1] - times[index - 1]);
}

function sampleTimedCatmullRom(points, times, elapsedSeconds) {
  const elapsed = clamp(elapsedSeconds, times[0], times.at(-1));
  let segment = times.length - 2;
  for (let index = 0; index < times.length - 1; index += 1) {
    if (elapsed <= times[index + 1]) {
      segment = index;
      break;
    }
  }
  const startTime = times[segment];
  const endTime = times[segment + 1];
  const duration = Math.max(1e-6, endTime - startTime);
  const t = clamp01((elapsed - startTime) / duration);
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const result = {};
  ["x", "y", "scale"].forEach((key) => {
    const from = points[segment][key];
    const to = points[segment + 1][key];
    const fromDerivative = getTimedDerivative(points, times, segment, key);
    const toDerivative = getTimedDerivative(points, times, segment + 1, key);
    result[key] = h00 * from
      + h10 * duration * fromDerivative
      + h01 * to
      + h11 * duration * toDerivative;
  });
  return result;
}

function getStateMotionStart(state, animationState) {
  switch (animationState) {
    case ABYSSAL_WHALE_FIGURE8_STATES.RIGHT_REVEAL_APPROACH: return state.nodeTimes[0];
    case ABYSSAL_WHALE_FIGURE8_STATES.CENTER_TURN_DIVE: return state.nodeTimes[1];
    case ABYSSAL_WHALE_FIGURE8_STATES.DEEP_REAR_CURVE: return state.nodeTimes[2];
    case ABYSSAL_WHALE_FIGURE8_STATES.LEFT_RETURN_APPROACH: return state.nodeTimes[3];
    case ABYSSAL_WHALE_FIGURE8_STATES.CENTER_CROSS_RIGHT_EXIT: return state.nodeTimes[4];
    default: return state.motionDuration;
  }
}

function enterState(state, animationState, previousState = state.state) {
  const previousPhase = STATE_PHASES[previousState];
  const nextPhase = STATE_PHASES[animationState];
  state.previousPhaseId = previousPhase && nextPhase && previousPhase !== nextPhase
    ? previousPhase
    : "";
  state.transitionElapsed = 0;
  state.state = animationState;
  state.stateElapsed = 0;
  state.stateDuration = state.durations[animationState];
}

function enterNextState(state) {
  const currentIndex = STATE_ORDER.indexOf(state.state);
  if (currentIndex < STATE_ORDER.length - 1) {
    enterState(state, STATE_ORDER[currentIndex + 1]);
    return;
  }
  // After the hidden cooldown, restart directly from the right-side reveal.
  // The reveal state's own opacity ramp keeps the repeated entrance seamless.
  configureCycle(state);
  state.motionElapsed = 0;
  enterState(state, ABYSSAL_WHALE_FIGURE8_STATES.RIGHT_REVEAL_APPROACH, "");
}

export function createAbyssalWhaleFigure8State(seed = 0x8f17a11e) {
  const state = {
    cycleVariation: 1,
    durations: {},
    motionDuration: 0,
    motionElapsed: 0,
    nodeTimes: [],
    previousPhaseId: "",
    seed: seed >>> 0,
    state: ABYSSAL_WHALE_FIGURE8_STATES.HIDDEN,
    stateDuration: 1.5,
    stateElapsed: 0,
    transitionElapsed: 1,
  };
  configureCycle(state);
  state.stateDuration = state.durations[state.state];
  return state;
}

export function advanceAbyssalWhaleFigure8(state, deltaSeconds) {
  let remaining = Math.min(0.1, Math.max(0, Number(deltaSeconds) || 0));
  while (remaining > 1e-8) {
    const available = Math.max(0, state.stateDuration - state.stateElapsed);
    const consumed = Math.min(remaining, available);
    state.stateElapsed += consumed;
    state.transitionElapsed += consumed;
    if (MOTION_STATES.includes(state.state)) state.motionElapsed += consumed;
    remaining -= consumed;
    if (state.stateElapsed >= state.stateDuration - 1e-8) enterNextState(state);
  }
  return state;
}

function getFrameRender(state, localProgress) {
  const phaseId = STATE_PHASES[state.state] ?? "distantRearCurve";
  if (state.state === ABYSSAL_WHALE_FIGURE8_STATES.DEEP_HOLD) {
    const holdFrames = [8, 9, 10];
    const holdPosition = (state.stateElapsed / 1.15) % holdFrames.length;
    const current = Math.floor(holdPosition);
    return {
      frameA: holdFrames[current],
      frameB: holdFrames[(current + 1) % holdFrames.length],
      frameMix: smootherstep(holdPosition - current),
      phaseId,
    };
  }

  const phaseOffset = STATE_ORDER.indexOf(state.state) * 0.79;
  const frameProgress = clamp01(
    localProgress
      + Math.sin(state.motionElapsed * 0.73 + phaseOffset) * 0.006 * Math.sin(localProgress * Math.PI),
  );
  const framePosition = frameProgress * 15;
  const frameA = Math.floor(framePosition);
  const frameB = Math.min(15, frameA + 1);
  if (state.previousPhaseId && state.transitionElapsed < 0.32) {
    return {
      frameA: 15,
      frameB: Math.min(15, Math.floor(framePosition)),
      frameMix: smootherstep(state.transitionElapsed / 0.32),
      phaseId,
      previousPhaseId: state.previousPhaseId,
    };
  }
  return {
    frameA,
    frameB,
    frameMix: smootherstep(framePosition - frameA),
    phaseId,
    previousPhaseId: "",
  };
}

export function getAbyssalWhaleFigure8Render(state) {
  const hidden = state.state === ABYSSAL_WHALE_FIGURE8_STATES.HIDDEN
    || state.state === ABYSSAL_WHALE_FIGURE8_STATES.COOLDOWN;
  const localProgress = clamp01(state.stateElapsed / Math.max(1e-6, state.stateDuration));
  const atDeepHold = state.state === ABYSSAL_WHALE_FIGURE8_STATES.DEEP_HOLD;
  const motionTime = atDeepHold || hidden ? state.motionDuration : state.motionElapsed;
  let position = hidden && state.motionElapsed <= 0
    ? ABYSSAL_WHALE_FIGURE8_PATH[0]
    : sampleTimedCatmullRom(ABYSSAL_WHALE_FIGURE8_PATH, state.nodeTimes, motionTime);
  const isCeilingExit = state.state === ABYSSAL_WHALE_FIGURE8_STATES.DEEP_REAR_CURVE;
  if (isCeilingExit) {
    const ascent = smootherstep(localProgress);
    const start = ABYSSAL_WHALE_FIGURE8_PATH[2];
    const end = ABYSSAL_WHALE_FIGURE8_PATH[3];
    position = {
      x: start.x,
      y: lerp(start.y, end.y, ascent),
      scale: lerp(start.scale, end.scale, ascent),
    };
  }
  const before = sampleTimedCatmullRom(
    ABYSSAL_WHALE_FIGURE8_PATH,
    state.nodeTimes,
    Math.max(0, motionTime - 0.025),
  );
  const after = sampleTimedCatmullRom(
    ABYSSAL_WHALE_FIGURE8_PATH,
    state.nodeTimes,
    Math.min(state.motionDuration, motionTime + 0.025),
  );
  const depth = clamp01((position.scale - 0.1) / 0.18);
  let opacity = lerp(0.27, 0.56, depth);
  if (state.state === ABYSSAL_WHALE_FIGURE8_STATES.RIGHT_REVEAL_APPROACH) {
    opacity *= smootherstep(localProgress / 0.18);
  }
  if (isCeilingExit) opacity *= 1 - smootherstep((localProgress - 0.12) / 0.88);
  if (atDeepHold) opacity = 0;
  if (hidden) opacity = 0;
  const tangentAngle = Math.atan2(after.y - before.y, Math.abs(after.x - before.x) + 1e-7);
  const frame = getFrameRender(state, localProgress);
  return {
    ...frame,
    blurPx: lerp(0.9, 0.25, depth),
    bobPx: Math.sin(state.motionElapsed * TAU / 10.7) * 1.2
      + Math.sin(state.motionElapsed * TAU / 7.3 + 1.7) * 0.6,
    frontLayerMix: smootherstep((position.scale - 0.18) / 0.045),
    localProgress,
    motionProgress: clamp01(motionTime / Math.max(1e-6, state.motionDuration)),
    opacity,
    rotationDegrees: isCeilingExit
      ? 0
      : clamp(tangentAngle * 180 / Math.PI * 0.18, -2.2, 2.2),
    scale: position.scale,
    state: state.state,
    x: position.x,
    y: position.y,
  };
}

export function createAbyssalWhaleFigure8DebugState(
  animationState = ABYSSAL_WHALE_FIGURE8_STATES.RIGHT_REVEAL_APPROACH,
  progress = 0.65,
) {
  const state = createAbyssalWhaleFigure8State(0x8f17a11e);
  const requestedState = STATE_ORDER.includes(animationState)
    ? animationState
    : ABYSSAL_WHALE_FIGURE8_STATES.RIGHT_REVEAL_APPROACH;
  enterState(state, requestedState, "");
  const localProgress = clamp01(progress);
  state.stateElapsed = state.stateDuration * localProgress;
  state.transitionElapsed = 1;
  state.motionElapsed = getStateMotionStart(state, requestedState)
    + (MOTION_STATES.includes(requestedState) ? state.stateDuration * localProgress : 0);
  return state;
}
