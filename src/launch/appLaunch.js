export const APP_LAUNCH_TIMINGS = Object.freeze({
  minimumIntroMs: 280,
  autonomousSequenceMs: 1450,
  completeHoldMs: 260,
  readySettleMs: 220,
  fallbackMs: 12000,
  exitMs: 320,
});

export function createAppLaunchController() {
  let ready = false;
  let resolveReady;

  const readyPromise = new Promise((resolve) => {
    resolveReady = resolve;
  });

  return {
    readyPromise,
    markReady(detail = "app-ready") {
      if (ready) return false;
      ready = true;
      resolveReady(detail);
      return true;
    },
    get isReady() {
      return ready;
    },
  };
}
