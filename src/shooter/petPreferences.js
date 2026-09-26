export const PET_PREFERENCES_KEY = "fretiva.shooter.spritePets.v1";
export const DEFAULT_PET_PREFERENCES = Object.freeze({ speed: 0.5, facing: "left", positions: Object.freeze({}) });
export const PET_LAYOUTS = ["mobile-portrait", "mobile-landscape", "desktop-portrait", "desktop-landscape"];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function getPetLayoutKey(mobile, horizontal) {
  return `${mobile ? "mobile" : "desktop"}-${horizontal ? "landscape" : "portrait"}`;
}

export function normalizePetPreferences(value = {}) {
  const positions = {};
  for (const key of PET_LAYOUTS) {
    const position = value?.positions?.[key];
    if (Number.isFinite(position?.x) && Number.isFinite(position?.y)) {
      positions[key] = Object.freeze({ x: clamp(position.x, 0, 1), y: clamp(position.y, 0, 1) });
    }
  }
  return Object.freeze({
    speed: Number.isFinite(value?.speed) ? clamp(value.speed, 0.25, 1) : DEFAULT_PET_PREFERENCES.speed,
    facing: value?.facing === "right" ? "right" : "left",
    positions: Object.freeze(positions),
  });
}

export function clampPetPosition(point, width, height, size) {
  return {
    x: Math.round(clamp(point.x, Math.min(8, Math.max(0, width - size)), Math.max(0, width - size - 8))),
    y: Math.round(clamp(point.y, Math.min(8, Math.max(0, height - size)), Math.max(0, height - size - 8))),
  };
}

export function getPetPlacement({ position, width, height, size, hearts, mobile, horizontal }) {
  const point = position
    ? { x: position.x * Math.max(0, width - size), y: position.y * Math.max(0, height - size) }
    : hearts && !horizontal
      ? { x: hearts.x + (hearts.width - size) / 2, y: hearts.y - size - 8 }
      : { x: width - size - (mobile ? 24 : 32), y: height - size - (horizontal ? 28 : 72) };
  return clampPetPosition(point, width, height, size);
}

export function normalizePetPosition(point, width, height, size) {
  const bounded = clampPetPosition(point, width, height, size);
  return { x: bounded.x / Math.max(1, width - size), y: bounded.y / Math.max(1, height - size) };
}
