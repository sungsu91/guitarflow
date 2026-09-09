export const DESKTOP_HORIZONTAL_ATTACK_TIMING = Object.freeze({
  impactDelay: 258,
  slashDelay: 92,
  totalDuration: 520,
});

export const DESKTOP_HORIZONTAL_ATTACK_ASSETS = Object.freeze({
  frameCount: 8,
  impact: "/assets/maps/three-d-lab/moonlit-canal/water-impact-8x.png",
  slash: "/assets/maps/three-d-lab/moonlit-canal/gold-slash-8x.png",
});

function cancelMotionAnimations(motion) {
  motion?.getAnimations?.().forEach((animation) => animation.cancel());
}

function removeAttackEffects(arena) {
  arena?.querySelectorAll?.(
    ".desktopHorizontalStrumArc, .desktopHorizontalSlashTrail, .desktopHorizontalSlashSprite, .desktopHorizontalCutMark, .desktopHorizontalImpactSprite",
  ).forEach((node) => node.remove());
  arena?.classList.remove("desktopHorizontalAttackKick");
}

function getGuitarOrigin(arenaRect, player) {
  const guitarAsset = player.querySelector?.(".guitarPlayerAsset") ?? player;
  const guitarRect = guitarAsset.getBoundingClientRect();
  return {
    x: guitarRect.left - arenaRect.left + guitarRect.width * 0.58,
    y: guitarRect.top - arenaRect.top + guitarRect.height * 0.38,
  };
}

function createSpriteEffects({ arena, arenaRect, impactDelay, projection, source, totalDuration }) {
  const target = {
    x: arenaRect.width * projection.x / 100,
    y: arenaRect.height * projection.y / 100,
  };
  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;
  const visualDistance = Math.min(
    arenaRect.width * 0.78,
    Math.max(112, Math.hypot(deltaX, deltaY)),
  );
  const slashHeight = Math.min(122, Math.max(78, arenaRect.height * 0.18));
  const slashAngle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

  const strumArc = document.createElement("span");
  strumArc.className = "desktopHorizontalStrumArc";
  strumArc.style.left = `${source.x.toFixed(2)}px`;
  strumArc.style.top = `${source.y.toFixed(2)}px`;

  const trail = document.createElement("span");
  trail.className = "desktopHorizontalSlashTrail";
  trail.style.left = `${source.x.toFixed(2)}px`;
  trail.style.top = `${source.y.toFixed(2)}px`;
  trail.style.width = `${visualDistance.toFixed(2)}px`;
  trail.style.setProperty("--desktop-slash-angle", `${slashAngle}deg`);
  trail.style.setProperty("--desktop-slash-delay", `${DESKTOP_HORIZONTAL_ATTACK_TIMING.slashDelay}ms`);

  const slash = document.createElement("span");
  slash.className = "desktopHorizontalSlashSprite";
  slash.dataset.frameCount = String(DESKTOP_HORIZONTAL_ATTACK_ASSETS.frameCount);
  slash.style.left = `${source.x.toFixed(2)}px`;
  slash.style.top = `${source.y.toFixed(2)}px`;
  slash.style.setProperty("--desktop-slash-angle", `${slashAngle}deg`);
  slash.style.setProperty("--desktop-slash-delay", `${Math.max(0, DESKTOP_HORIZONTAL_ATTACK_TIMING.slashDelay)}ms`);
  slash.style.setProperty("--desktop-slash-distance", `${visualDistance.toFixed(2)}px`);
  slash.style.setProperty("--desktop-slash-height", `${slashHeight.toFixed(2)}px`);
  slash.style.setProperty("--desktop-slash-playback", `${Math.max(120, totalDuration - 92)}ms`);

  const impact = document.createElement("span");
  impact.className = "desktopHorizontalImpactSprite";
  impact.dataset.frameCount = String(DESKTOP_HORIZONTAL_ATTACK_ASSETS.frameCount);
  impact.style.left = `${target.x.toFixed(2)}px`;
  impact.style.top = `${target.y.toFixed(2)}px`;
  impact.style.setProperty("--desktop-impact-delay", `${impactDelay}ms`);
  impact.style.setProperty("--desktop-impact-scale", String(Math.max(0.82, projection.scale)));

  const cutMark = document.createElement("span");
  cutMark.className = "desktopHorizontalCutMark";
  cutMark.style.left = `${target.x.toFixed(2)}px`;
  cutMark.style.top = `${target.y.toFixed(2)}px`;
  cutMark.style.setProperty("--desktop-cut-delay", `${Math.max(0, impactDelay - 42)}ms`);
  cutMark.style.setProperty("--desktop-cut-scale", String(Math.max(0.9, projection.scale)));

  arena.classList.remove("desktopHorizontalAttackKick");
  void arena.offsetWidth;
  arena.classList.add("desktopHorizontalAttackKick");
  arena.append(strumArc, trail, slash, cutMark, impact);
  window.setTimeout(() => strumArc.remove(), totalDuration);
  window.setTimeout(() => trail.remove(), totalDuration + 40);
  window.setTimeout(() => slash.remove(), totalDuration + 80);
  window.setTimeout(() => cutMark.remove(), totalDuration + 100);
  window.setTimeout(() => impact.remove(), totalDuration + 100);
  window.setTimeout(() => arena.classList.remove("desktopHorizontalAttackKick"), totalDuration + 40);
}

export function cleanupDesktopHorizontalAttack(arena, motion) {
  cancelMotionAnimations(motion);
  motion?.classList.remove("desktopHorizontalGuitarMotion--attacking");
  removeAttackEffects(arena);
}

export function playDesktopHorizontalGuitarSlash({
  arena,
  arenaSize,
  motion,
  player,
  projection,
  reducedMotion = false,
}) {
  const totalDuration = reducedMotion ? 180 : DESKTOP_HORIZONTAL_ATTACK_TIMING.totalDuration;
  const impactDelay = reducedMotion ? 72 : DESKTOP_HORIZONTAL_ATTACK_TIMING.impactDelay;
  if (!arena || !motion || !player || !arenaSize?.width || !arenaSize?.height) return impactDelay;

  cleanupDesktopHorizontalAttack(arena, motion);
  const arenaRect = arena.getBoundingClientRect();
  const source = getGuitarOrigin(arenaRect, player);
  motion.classList.add("desktopHorizontalGuitarMotion--attacking");
  createSpriteEffects({ arena, arenaRect, impactDelay, projection, source, totalDuration });

  const attackAnimation = motion.animate([
    { offset: 0, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
    {
      easing: "cubic-bezier(0.26, 0.02, 0.66, 0.34)",
      offset: 0.2,
      transform: "translate3d(-2px, -15px, 0) rotate(-18deg) scale(0.98)",
    },
    {
      easing: "cubic-bezier(0.08, 0.88, 0.14, 1)",
      offset: 0.46,
      transform: "translate3d(6px, 19px, 0) rotate(25deg) scale(1.06)",
    },
    {
      easing: "cubic-bezier(0.18, 0.7, 0.3, 1)",
      offset: 0.62,
      transform: "translate3d(7px, 22px, 0) rotate(28deg) scale(1.035)",
    },
    {
      easing: "cubic-bezier(0.3, 0.68, 0.38, 1)",
      offset: 0.8,
      transform: "translate3d(-1px, -3px, 0) rotate(-5deg) scale(1.01)",
    },
    {
      easing: "cubic-bezier(0.2, 0.72, 0.24, 1)",
      offset: 1,
      transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)",
    },
  ], {
    duration: totalDuration,
    fill: "none",
  });
  attackAnimation.finished
    .catch(() => {})
    .finally(() => motion.classList.remove("desktopHorizontalGuitarMotion--attacking"));

  return impactDelay;
}
