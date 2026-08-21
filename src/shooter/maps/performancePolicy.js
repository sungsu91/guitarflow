export const SHOOTER_MAP_MOBILE_RENDER_BUDGET = Object.freeze({
  activeCssAnimations: 8,
  ambientEventLayers: 0,
  filteredElements: 10,
  particleElements: 0,
  sharedSpriteSubscribers: 8,
});

const MOBILE_GAMEPLAY_MODES = Object.freeze({
  FULL: "full",
  REDUCED: "reduced",
});

const mapFingerprintCache = new WeakMap();

function isFiniteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

export function isShooterMapMobileAuditWithinBudget(audit) {
  if (!audit || audit.completed !== true) return false;

  return Object.entries(SHOOTER_MAP_MOBILE_RENDER_BUDGET).every(([metric, maximum]) => (
    isFiniteNonNegative(audit[metric]) && audit[metric] <= maximum
  ));
}

function hashPerformanceSource(source) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function getShooterMapPerformanceFingerprint(map) {
  if (!map || typeof map !== "object") return "00000000";
  const cached = mapFingerprintCache.get(map);
  if (cached) return cached;

  const source = JSON.stringify({
    ambientEvents: map.ambientEvents ?? [],
    assetCatalog: map.assetCatalog ?? [],
    id: map.id ?? "",
    kind: map.kind ?? "",
    layers: map.layers ?? [],
    layout: map.layout ?? [],
  });
  const fingerprint = hashPerformanceSource(source);
  mapFingerprintCache.set(map, fingerprint);
  return fingerprint;
}

export function getShooterMapPerformancePolicy(map) {
  const mobileGameplay = map?.performance?.mobileGameplay;
  const fullEffectsApproved = mobileGameplay?.mode === MOBILE_GAMEPLAY_MODES.FULL
    && isShooterMapMobileAuditWithinBudget(mobileGameplay.audit)
    && mobileGameplay.audit.contentFingerprint === getShooterMapPerformanceFingerprint(map);

  return {
    mobileGameplayEffects: fullEffectsApproved
      ? MOBILE_GAMEPLAY_MODES.FULL
      : MOBILE_GAMEPLAY_MODES.REDUCED,
    mobileGameplayAuditPassed: fullEffectsApproved,
  };
}

export function getShooterMapRuntimePerformance({
  animationsAllowed = true,
  isEditing = false,
  isMobileLayout = false,
  isPlaying = false,
  map,
} = {}) {
  const policy = getShooterMapPerformancePolicy(map);
  const reduceEffects = Boolean(
    map?.kind === "layered"
      && isMobileLayout
      && isPlaying
      && !isEditing
      && policy.mobileGameplayEffects === MOBILE_GAMEPLAY_MODES.REDUCED,
  );

  return {
    ambientEventsActive: animationsAllowed,
    animationsActive: animationsAllowed,
    enhancedEffectsActive: !reduceEffects,
    reduceEffects,
  };
}
