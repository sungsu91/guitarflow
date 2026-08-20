export const AUDIO_BUS_IDS = Object.freeze({
  BACKING: "backing",
  INSTRUMENT: "instrument",
  METRONOME: "metronome",
  SFX: "sfx",
});

const BUS_LEVELS = Object.freeze({
  [AUDIO_BUS_IDS.BACKING]: 0.92,
  [AUDIO_BUS_IDS.INSTRUMENT]: 0.9,
  [AUDIO_BUS_IDS.METRONOME]: 0.82,
  [AUDIO_BUS_IDS.SFX]: 0.72,
});

let sharedAudioContext = null;
let sharedGraph = null;
const mediaElementGraphs = new WeakMap();

const clamp = (value, minimum = 0, maximum = 1) => (
  Math.min(maximum, Math.max(minimum, Number(value) || 0))
);

function getAudioContextApi() {
  if (typeof window === "undefined") return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

function setParamValue(param, value, time = 0) {
  if (!param) return;
  if (typeof param.setValueAtTime === "function") param.setValueAtTime(value, time);
  else param.value = value;
}

export function smoothAudioParam(param, value, context, {
  immediate = false,
  timeConstant = 0.012,
} = {}) {
  if (!param) return;
  const now = Math.max(0, Number(context?.currentTime) || 0);
  const target = Math.max(0, Number(value) || 0);
  try {
    if (typeof param.cancelAndHoldAtTime === "function") param.cancelAndHoldAtTime(now);
    else if (typeof param.cancelScheduledValues === "function") {
      param.cancelScheduledValues(now);
      setParamValue(param, Math.max(0, Number(param.value) || 0), now);
    }
    if (!immediate && typeof param.setTargetAtTime === "function") {
      param.setTargetAtTime(target, now, Math.max(0.003, Number(timeConstant) || 0.012));
    } else {
      setParamValue(param, target, now);
    }
  } catch {
    param.value = target;
  }
}

function createSharedGraph(context) {
  const buses = {};
  Object.entries(BUS_LEVELS).forEach(([id, level]) => {
    const bus = context.createGain();
    setParamValue(bus.gain, level, context.currentTime);
    buses[id] = bus;
  });

  const master = context.createGain();
  const limiter = context.createDynamicsCompressor();
  setParamValue(master.gain, 0.9, context.currentTime);
  // This is a transparent peak guard, not a loudness compressor.
  setParamValue(limiter.threshold, -2, context.currentTime);
  setParamValue(limiter.knee, 0, context.currentTime);
  setParamValue(limiter.ratio, 20, context.currentTime);
  setParamValue(limiter.attack, 0.003, context.currentTime);
  setParamValue(limiter.release, 0.08, context.currentTime);

  Object.values(buses).forEach((bus) => bus.connect(master));
  master.connect(limiter);
  limiter.connect(context.destination);
  return { buses, context, limiter, master };
}

export function getSharedAudioContext() {
  if (sharedAudioContext && sharedAudioContext.state !== "closed") return sharedAudioContext;
  const AudioContextApi = getAudioContextApi();
  if (!AudioContextApi) return null;
  try {
    sharedAudioContext = new AudioContextApi({ latencyHint: "interactive" });
  } catch {
    sharedAudioContext = new AudioContextApi();
  }
  sharedGraph = null;
  return sharedAudioContext;
}

export function getAudioBusGraph(context = getSharedAudioContext()) {
  if (!context) return null;
  if (context !== sharedAudioContext) sharedAudioContext = context;
  if (!sharedGraph || sharedGraph.context !== context) sharedGraph = createSharedGraph(context);
  return sharedGraph;
}

export function getAudioBusInput(busId = AUDIO_BUS_IDS.SFX, context = getSharedAudioContext()) {
  const graph = getAudioBusGraph(context);
  return graph?.buses?.[busId] || graph?.master || context?.destination || null;
}

export async function resumeSharedAudioContext() {
  const context = getSharedAudioContext();
  if (!context) return null;
  getAudioBusGraph(context);
  if (context.state === "suspended" || context.state === "interrupted") {
    await context.resume?.();
  }
  return context;
}

export function connectMediaElementToBus(element, {
  busId = AUDIO_BUS_IDS.BACKING,
  level = 1,
} = {}) {
  if (!element) return null;
  const cached = mediaElementGraphs.get(element);
  if (cached) return cached;
  const context = getSharedAudioContext();
  const output = getAudioBusInput(busId, context);
  if (!context || !output || typeof context.createMediaElementSource !== "function") return null;

  const source = context.createMediaElementSource(element);
  const transportGain = context.createGain();
  const programGain = context.createGain();
  setParamValue(transportGain.gain, 1, context.currentTime);
  setParamValue(programGain.gain, clamp(level), context.currentTime);
  source.connect(transportGain);
  transportGain.connect(programGain);
  programGain.connect(output);

  const graph = {
    context,
    programGain,
    setLevel(nextLevel, options) {
      smoothAudioParam(programGain.gain, clamp(nextLevel), context, options);
    },
    setTransportLevel(nextLevel, options) {
      smoothAudioParam(transportGain.gain, clamp(nextLevel), context, options);
    },
    source,
    transportGain,
  };
  mediaElementGraphs.set(element, graph);
  return graph;
}

export function resetSharedAudioForTests() {
  sharedAudioContext = null;
  sharedGraph = null;
}
