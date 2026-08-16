export const APP_LAUNCH_TIMINGS = Object.freeze({
  minimumIntroMs: 1050,
  fallbackMs: 5500,
  exitMs: 480,
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
