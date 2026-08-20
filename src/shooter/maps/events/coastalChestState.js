export const COASTAL_CHEST_FRAME_SEQUENCE = Object.freeze([0, 1, 2, 1, 2, 3, 4]);
export const COASTAL_CHEST_STEP_DURATIONS_MS = Object.freeze([90, 145, 145, 145, 165, 230, 280]);
export const COASTAL_MIMIC_HITS_TO_DEFEAT = 5;
export const COASTAL_MIMIC_IDLE_FRAME_COUNT = 6;
export const COASTAL_MIMIC_HIT_FRAME_COUNT = 4;
export const COASTAL_MIMIC_DEFEAT_FRAME_COUNT = 8;
export const COASTAL_MIMIC_IDLE_FRAME_DURATION_MS = 88;
export const COASTAL_MIMIC_HIT_FRAME_DURATION_MS = 72;
export const COASTAL_MIMIC_DEFEAT_FRAME_DURATION_MS = 78;

export function createCoastalChestState(variant = "treasure") {
  return {
    frameIndex: 0,
    hitCount: 0,
    motionFrameIndex: 0,
    pendingHitCount: 0,
    phase: "closed",
    stepIndex: 0,
    variant: variant === "mimic" ? "mimic" : "treasure",
  };
}

export function isCoastalChestAnimating(phase = "") {
  return phase === "opening" || phase === "revealing";
}

export function canHitCoastalMimic(state) {
  return state?.variant === "mimic"
    && ["active", "hit-reacting"].includes(state.phase)
    && state.hitCount < COASTAL_MIMIC_HITS_TO_DEFEAT;
}

export function reduceCoastalChestState(state, action) {
  switch (action?.type) {
    case "click": {
      if (state.phase === "closed") {
        return {
          ...state,
          frameIndex: COASTAL_CHEST_FRAME_SEQUENCE[0],
          phase: state.variant === "mimic" ? "revealing" : "opening",
          stepIndex: 0,
        };
      }
      if (!canHitCoastalMimic(state)) return state;
      const hitCount = state.hitCount + 1;
      if (state.phase === "hit-reacting") {
        return {
          ...state,
          hitCount,
          pendingHitCount: state.pendingHitCount + 1,
        };
      }
      return {
        ...state,
        hitCount,
        motionFrameIndex: 0,
        phase: "hit-reacting",
      };
    }
    case "advance": {
      if (!isCoastalChestAnimating(state.phase)) return state;
      const nextStepIndex = state.stepIndex + 1;
      if (nextStepIndex < COASTAL_CHEST_FRAME_SEQUENCE.length) {
        return {
          ...state,
          frameIndex: COASTAL_CHEST_FRAME_SEQUENCE[nextStepIndex],
          stepIndex: nextStepIndex,
        };
      }
      return {
        ...state,
        frameIndex: 4,
        motionFrameIndex: 0,
        pendingHitCount: 0,
        phase: state.variant === "mimic" ? "active" : "opened",
      };
    }
    case "idle-tick":
      if (state.phase !== "active") return state;
      return {
        ...state,
        motionFrameIndex: (state.motionFrameIndex + 1) % COASTAL_MIMIC_IDLE_FRAME_COUNT,
      };
    case "hit-advance": {
      if (state.phase !== "hit-reacting") return state;
      const nextFrameIndex = state.motionFrameIndex + 1;
      if (nextFrameIndex < COASTAL_MIMIC_HIT_FRAME_COUNT) {
        return { ...state, motionFrameIndex: nextFrameIndex };
      }
      if (state.hitCount >= COASTAL_MIMIC_HITS_TO_DEFEAT) {
        return {
          ...state,
          motionFrameIndex: 0,
          pendingHitCount: 0,
          phase: "defeating",
        };
      }
      if (state.pendingHitCount > 0) {
        return {
          ...state,
          motionFrameIndex: 0,
          pendingHitCount: state.pendingHitCount - 1,
        };
      }
      return {
        ...state,
        motionFrameIndex: 0,
        phase: "active",
      };
    }
    case "defeat-advance": {
      if (state.phase !== "defeating") return state;
      const nextFrameIndex = state.motionFrameIndex + 1;
      if (nextFrameIndex < COASTAL_MIMIC_DEFEAT_FRAME_COUNT) {
        return { ...state, motionFrameIndex: nextFrameIndex };
      }
      return { ...state, phase: "removed" };
    }
    default:
      return state;
  }
}

function getSpawnPool(groupPools, actor) {
  const spawnPoints = Array.isArray(actor?.spawnPoints) ? actor.spawnPoints : [];
  if (spawnPoints.length === 0) return null;
  const group = actor.spawnGroup || actor.type || "map-event";
  if (!groupPools.has(group)) groupPools.set(group, [...spawnPoints]);
  return { group, pool: groupPools.get(group) };
}

export function assignRandomEventActorPlacements(layers = [], random = Math.random) {
  const groupPools = new Map();
  const variantSides = new Map();
  return layers.map((layer) => {
    const spawnPool = getSpawnPool(groupPools, layer.eventActor);
    const pool = spawnPool?.pool;
    if (!pool?.length) return layer;
    const variant = layer.eventActor?.variant || layer.eventActor?.type || "map-event";
    const variantKey = `${spawnPool.group}:${variant}`;
    const usedSides = variantSides.get(variantKey) ?? new Set();
    let candidates = pool;
    if (usedSides.size === 1) {
      const [usedSide] = usedSides;
      const oppositePoints = pool.filter((point) => (
        usedSide === "left" ? Number(point?.x) > 0.5 : Number(point?.x) < 0.5
      ));
      if (oppositePoints.length > 0) candidates = oppositePoints;
    }
    const sample = Number(random());
    const normalizedSample = Number.isFinite(sample) ? Math.min(0.999999, Math.max(0, sample)) : 0;
    const candidateIndex = Math.floor(normalizedSample * candidates.length);
    const point = candidates[candidateIndex];
    if (!point) return layer;
    pool.splice(pool.indexOf(point), 1);
    if (Number(point.x) < 0.5) usedSides.add("left");
    if (Number(point.x) > 0.5) usedSides.add("right");
    variantSides.set(variantKey, usedSides);
    return {
      ...layer,
      placement: {
        ...layer.placement,
        x: Number.isFinite(point.x) ? point.x : layer.placement?.x,
        y: Number.isFinite(point.y) ? point.y : layer.placement?.y,
        scale: Number.isFinite(point.scale) ? point.scale : layer.placement?.scale,
        rotation: Number.isFinite(point.rotation) ? point.rotation : layer.placement?.rotation,
      },
    };
  });
}
