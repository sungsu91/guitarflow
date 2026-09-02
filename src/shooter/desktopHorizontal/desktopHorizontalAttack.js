export const DESKTOP_HORIZONTAL_ATTACK_TIMING = Object.freeze({
  impactDelay: 188,
  slashDelay: 34,
  totalDuration: 410,
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
    ".desktopHorizontalSlashSprite, .desktopHorizontalImpactSprite",
  ).forEach((node) => node.remove());
}

function getGuitarOrigin(arenaRect, player) {
  const guitarAsset = player.querySelector?.(".guitarPlayerAsset") ?? player;
  const guitarRect = guitarAsset.getBoundingClientRect();
  return {
    x: guitarRect.left - arenaRect.left + guitarRect.width * 0.58,
    y: guitarRect.top - arenaRect.top + guitarRect.height * 0.5,
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
  const slash = document.createElement("span");
  slash.className = "desktopHorizontalSlashSprite";
  slash.dataset.frameCount = String(DESKTOP_HORIZONTAL_ATTACK_ASSETS.frameCount);
  slash.style.left = `${source.x.toFixed(2)}px`;
  slash.style.top = `${source.y.toFixed(2)}px`;
  slash.style.setProperty("--desktop-slash-angle", `${Math.atan2(deltaY, deltaX) * 180 / Math.PI}deg`);
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

  arena.append(slash, impact);
  window.setTimeout(() => slash.remove(), totalDuration + 80);
  window.setTimeout(() => impact.remove(), totalDuration + 100);
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
    { offset: 0, transform: "rotate(0deg) scale(1)" },
    {
      easing: "cubic-bezier(0.32, 0.04, 0.68, 0.36)",
      offset: 0.18,
      transform: "rotate(-9deg) scale(0.985)",
    },
    {
      easing: "cubic-bezier(0.12, 0.86, 0.2, 1)",
      offset: 0.47,
      transform: "rotate(17deg) scale(1.045)",
    },
    {
      easing: "cubic-bezier(0.28, 0.62, 0.36, 1)",
      offset: 0.72,
      transform: "rotate(-4deg) scale(1.012)",
    },
    {
      easing: "cubic-bezier(0.2, 0.72, 0.24, 1)",
      offset: 1,
      transform: "rotate(0deg) scale(1)",
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
