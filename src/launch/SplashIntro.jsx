import { useEffect, useState } from "react";
import { APP_LAUNCH_TIMINGS } from "./appLaunch";

const GUITAR_STRING_COUNT = 6;
const BRAND_WORDS = ["JUST", "PLAY"];

export default function SplashIntro({
  exitMs = APP_LAUNCH_TIMINGS.exitMs,
  fallbackMs = APP_LAUNCH_TIMINGS.fallbackMs,
  minimumIntroMs = APP_LAUNCH_TIMINGS.minimumIntroMs,
  onComplete,
  readyPromise,
}) {
  const [phase, setPhase] = useState("entering");

  useEffect(() => {
    let cancelled = false;
    let exitTimerId = null;
    let fallbackTimerId = null;
    let minimumTimerId = null;

    const minimumIntro = minimumIntroMs > 0
      ? new Promise((resolve) => {
        minimumTimerId = window.setTimeout(resolve, minimumIntroMs);
      })
      : Promise.resolve();
    const fallback = new Promise((resolve) => {
      fallbackTimerId = window.setTimeout(() => resolve("fallback"), fallbackMs);
    });
    const appReady = Promise.resolve(readyPromise).then(
      () => "ready",
      () => "ready-error",
    );

    Promise.all([minimumIntro, Promise.race([appReady, fallback])]).then(([, result]) => {
      if (cancelled) return;
      if (result === "fallback") {
        console.warn("JUST PLAY launch fallback released the splash before the app-ready signal.");
      }
      setPhase("exiting");
      exitTimerId = window.setTimeout(onComplete, exitMs);
    });

    return () => {
      cancelled = true;
      if (minimumTimerId !== null) window.clearTimeout(minimumTimerId);
      if (fallbackTimerId !== null) window.clearTimeout(fallbackTimerId);
      if (exitTimerId !== null) window.clearTimeout(exitTimerId);
    };
  }, [exitMs, fallbackMs, minimumIntroMs, onComplete, readyPromise]);

  return (
    <section
      aria-label="JUST PLAY 시작 중"
      aria-live="polite"
      className={`launchSplash launchSplash--${phase}`}
      role="status"
    >
      <div className="launchSplash__stage">
        <div className="launchSplash__strings" aria-hidden="true">
          {Array.from({ length: GUITAR_STRING_COUNT }, (_, index) => (
            <span
              key={index}
              style={{
                "--string-delay": `${420 + index * 28}ms`,
                "--string-opacity": 0.2 + index * 0.045,
              }}
            />
          ))}
        </div>
        <span className="launchSplash__goldLine" aria-hidden="true" />
        <h1 className="launchSplash__wordmark" aria-label="JUST PLAY">
          {BRAND_WORDS.map((word) => (
            <span aria-hidden="true" className="launchSplash__word" key={word}>
              {word}
            </span>
          ))}
        </h1>
      </div>
    </section>
  );
}
