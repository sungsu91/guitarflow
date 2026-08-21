const FRAME_INTERVAL_MS = 1000 / 30;

const subscriptions = new Map();
let observer = null;
let animationFrameId = 0;
let lastFrameAt = 0;
let visibilityListenerAttached = false;

function isDocumentVisible() {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}

function hasVisibleSubscriber() {
  for (const subscription of subscriptions.values()) {
    if (subscription.visible) return true;
  }
  return false;
}

function cancelClock() {
  if (!animationFrameId || typeof window === "undefined") return;
  window.cancelAnimationFrame?.(animationFrameId);
  animationFrameId = 0;
}

function scheduleClock() {
  if (
    animationFrameId
    || typeof window === "undefined"
    || !isDocumentVisible()
    || !hasVisibleSubscriber()
  ) return;
  animationFrameId = window.requestAnimationFrame(runClock);
}

function runClock(timestampMs) {
  animationFrameId = 0;
  if (!isDocumentVisible() || !hasVisibleSubscriber()) return;

  if (timestampMs - lastFrameAt >= FRAME_INTERVAL_MS) {
    lastFrameAt = timestampMs;
    subscriptions.forEach((subscription) => {
      if (subscription.visible) subscription.onFrame(timestampMs);
    });
  }
  scheduleClock();
}

function handleVisibilityChange() {
  if (isDocumentVisible()) scheduleClock();
  else cancelClock();
}

function ensureVisibilityListener() {
  if (visibilityListenerAttached || typeof document === "undefined") return;
  document.addEventListener("visibilitychange", handleVisibilityChange);
  visibilityListenerAttached = true;
}

function removeVisibilityListenerIfIdle() {
  if (!visibilityListenerAttached || subscriptions.size > 0 || typeof document === "undefined") return;
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  visibilityListenerAttached = false;
}

function getObserver() {
  if (observer || typeof window === "undefined" || typeof window.IntersectionObserver !== "function") {
    return observer;
  }
  observer = new window.IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const subscription = subscriptions.get(entry.target);
      if (!subscription) return;
      subscription.visible = entry.isIntersecting;
      entry.target.dataset.mapAnimationVisible = entry.isIntersecting ? "true" : "false";
    });
    if (hasVisibleSubscriber()) scheduleClock();
    else cancelClock();
  }, { rootMargin: "8%" });
  return observer;
}

export function getLoopFrameIndex(
  timestampMs,
  frameCount,
  framesPerSecond,
  playbackSpeed = 1,
  phaseOffsetSeconds = 0,
) {
  const safeFrameCount = Math.max(1, Math.floor(Number(frameCount) || 1));
  const safeFps = Math.max(0.01, Number(framesPerSecond) || 1);
  const safeSpeed = Math.max(0.01, Number(playbackSpeed) || 1);
  const elapsedSeconds = Math.max(0, Number(timestampMs) || 0) / 1000 + (Number(phaseOffsetSeconds) || 0);
  const rawIndex = Math.floor(elapsedSeconds * safeFps * safeSpeed);
  return ((rawIndex % safeFrameCount) + safeFrameCount) % safeFrameCount;
}

export function subscribeSharedMapAnimation(element, onFrame) {
  if (!element || typeof onFrame !== "function" || typeof window === "undefined") {
    return () => {};
  }

  const sharedObserver = getObserver();
  const subscription = {
    onFrame,
    visible: true,
  };
  subscriptions.set(element, subscription);
  element.dataset.mapAnimationVisible = "true";
  sharedObserver?.observe(element);
  ensureVisibilityListener();
  scheduleClock();

  return () => {
    sharedObserver?.unobserve(element);
    subscriptions.delete(element);
    delete element.dataset.mapAnimationVisible;
    if (!hasVisibleSubscriber()) cancelClock();
    if (subscriptions.size === 0) {
      observer?.disconnect();
      observer = null;
      lastFrameAt = 0;
    }
    removeVisibilityListenerIfIdle();
  };
}
