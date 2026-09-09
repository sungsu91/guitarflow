const ENV = import.meta.env ?? {};

export const DESKTOP_HORIZONTAL_SHOOTER_FEATURE = Object.freeze({
  devMapId: "dev-three-d-lab",
  enabled: ENV.VITE_DESKTOP_HORIZONTAL_SHOOTER !== "false",
  id: "desktopHorizontalShooter",
});

export const SHOOTER_RENDERER_MODES = Object.freeze({
  DESKTOP_HORIZONTAL: "desktop-horizontal",
  DESKTOP_PORTRAIT: "desktop-portrait",
  MAP_EDITOR: "map-editor",
  MOBILE_HORIZONTAL: "mobile-horizontal",
  MOBILE_VERTICAL: "mobile-vertical",
});

const TARGET_PROGRESS_START_Y = 8;
const TARGET_PROGRESS_DISTANCE = 80;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function getShooterRendererMode({
  devMapActive = false,
  featureEnabled = DESKTOP_HORIZONTAL_SHOOTER_FEATURE.enabled,
  isMobileLayout = false,
  mapEditorEnabled = false,
  mobileLandscapeActive = false,
} = {}) {
  if (mapEditorEnabled) return SHOOTER_RENDERER_MODES.MAP_EDITOR;
  if (isMobileLayout && mobileLandscapeActive) return SHOOTER_RENDERER_MODES.MOBILE_HORIZONTAL;
  if (isMobileLayout) return SHOOTER_RENDERER_MODES.MOBILE_VERTICAL;
  return featureEnabled && devMapActive
    ? SHOOTER_RENDERER_MODES.DESKTOP_HORIZONTAL
    : SHOOTER_RENDERER_MODES.DESKTOP_PORTRAIT;
}

export function getShooterTargetProgress(target) {
  if (Number.isFinite(target?.progress)) return clamp(target.progress);
  return clamp(((Number(target?.y) || TARGET_PROGRESS_START_Y) - TARGET_PROGRESS_START_Y) / TARGET_PROGRESS_DISTANCE);
}

export function compareShooterTargetsFrontFirst(left, right) {
  return getShooterTargetProgress(right) - getShooterTargetProgress(left)
    || (Number(left?.bornAt) || 0) - (Number(right?.bornAt) || 0)
    || (Number(left?.id) || 0) - (Number(right?.id) || 0);
}

export function getFrontShooterTarget(targets, { excludePending = false } = {}) {
  return [...(targets ?? [])]
    .filter((target) => (
      target
      && !target.defeated
      && target.hitboxActive !== false
      && (!excludePending || !target.pendingProjectileId)
    ))
    .sort(compareShooterTargetsFrontFirst)[0] ?? null;
}

export function projectDesktopHorizontalTarget(target) {
  const progress = getShooterTargetProgress(target);
  const perspectiveProgress = progress ** 1.3;
  const smoothProgress = progress * progress * (3 - 2 * progress);
  const laneSeed = clamp((Number(target?.x) - 18) / 64);

  return {
    progress,
    scale: clamp(0.58 + smoothProgress * 0.56, 0.58, 1.14),
    x: 90 - perspectiveProgress * 68,
    y: 30 + laneSeed * 42,
  };
}
