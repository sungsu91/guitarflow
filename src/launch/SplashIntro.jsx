import { useEffect, useRef, useState } from "react";
import { APP_LAUNCH_TIMINGS } from "./appLaunch";

export const APP_INTRO_FRAME_SOURCES = Object.freeze({
  shadow: "/assets/branding/fretiva-intro-01.png?v=07ceb7ec",
  light: "/assets/branding/fretiva-intro-02.png?v=13de555d",
  flash: "/assets/branding/fretiva-intro-03.png?v=11895103",
  logo: "/assets/branding/fretiva-intro-04.png?v=11895103",
});

const INTRO_FRAMES = Object.freeze([
  { id: "shadow", src: APP_INTRO_FRAME_SOURCES.shadow },
  { id: "light", src: APP_INTRO_FRAME_SOURCES.light },
  { id: "flash", src: APP_INTRO_FRAME_SOURCES.flash },
  { id: "logo", src: APP_INTRO_FRAME_SOURCES.logo },
]);

function normalizeProgress(progress) {
  if (!Number.isFinite(progress)) return null;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

function getProgressStep(progress) {
  if (progress >= 100) return "complete";
  if (progress >= 80) return "logo-hint";
  if (progress >= 55) return "flash";
  if (progress >= 25) return "light";
  return "shadow";
}

function getControlledFrameClass(frameId, progress) {
  if (frameId === "shadow") return " launchSplash__frame--visible";
  if (frameId === "light" && progress >= 25) return " launchSplash__frame--visible";
  if (frameId === "flash" && progress >= 55) return " launchSplash__frame--visible";
  if (frameId === "logo" && progress >= 100) return " launchSplash__frame--visible";
  if (frameId === "logo" && progress >= 80) return " launchSplash__frame--hint";
  return "";
}

export default function SplashIntro({
  ariaLabel = "FRETIVA LAB 준비 중",
  exitMs = APP_LAUNCH_TIMINGS.exitMs,
  fallbackMs = APP_LAUNCH_TIMINGS.fallbackMs,
  minimumIntroMs = APP_LAUNCH_TIMINGS.minimumIntroMs,
  onComplete,
  progress = null,
  readySettleMs = APP_LAUNCH_TIMINGS.readySettleMs,
  readyPromise,
  statusText = "FRETIVA LAB 앱을 준비하고 있습니다.",
}) {
  const [phase, setPhase] = useState("entering");
  const launchStartedAtRef = useRef(Date.now());
  const normalizedProgress = normalizeProgress(progress);
  const controlledProgress = normalizedProgress !== null;
  const progressStep = controlledProgress ? getProgressStep(normalizedProgress) : null;
  const readyToExit = phase === "ready" || phase === "exiting";

  useEffect(() => {
    let cancelled = false;
    let exitTimerId = null;
    let fallbackTimerId = null;
    let minimumTimerId = null;
    let readyTimerId = null;

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
        console.warn("FRETIVA LAB launch fallback released the splash before the app-ready signal.");
      }
      setPhase("ready");
      const elapsedMs = Date.now() - launchStartedAtRef.current;
      const autonomousCompletionRemainingMs = Math.max(
        0,
        APP_LAUNCH_TIMINGS.autonomousSequenceMs
          + APP_LAUNCH_TIMINGS.completeHoldMs
          - elapsedMs,
      );
      const settleBeforeExitMs = controlledProgress
        ? readySettleMs
        : Math.max(readySettleMs, autonomousCompletionRemainingMs);
      readyTimerId = window.setTimeout(() => {
        if (cancelled) return;
        setPhase("exiting");
        exitTimerId = window.setTimeout(() => onComplete?.(), exitMs);
      }, settleBeforeExitMs);
    });

    return () => {
      cancelled = true;
      if (minimumTimerId !== null) window.clearTimeout(minimumTimerId);
      if (fallbackTimerId !== null) window.clearTimeout(fallbackTimerId);
      if (exitTimerId !== null) window.clearTimeout(exitTimerId);
      if (readyTimerId !== null) window.clearTimeout(readyTimerId);
    };
  }, [controlledProgress, exitMs, fallbackMs, minimumIntroMs, onComplete, readyPromise, readySettleMs]);

  return (
    <section
      aria-label={ariaLabel}
      aria-live="polite"
      className={`launchSplash launchSplash--${phase} ${
        controlledProgress
          ? `launchSplash--controlled launchSplash--step-${progressStep}`
          : "launchSplash--autonomous"
      }`}
      role="status"
      style={{
        "--launch-exit-ms": `${exitMs}ms`,
      }}
    >
      <div className="launchSplash__content">
        <div aria-hidden="true" className="launchSplash__stage">
          <div className="launchSplash__frameStack">
            {INTRO_FRAMES.map((frame) => (
              <img
                alt=""
                className={`launchSplash__frame launchSplash__frame--${frame.id}${
                  controlledProgress ? getControlledFrameClass(frame.id, normalizedProgress) : ""
                }`}
                decoding="async"
                draggable="false"
                fetchPriority={frame.id === "shadow" ? "high" : "auto"}
                height="1840"
                key={frame.id}
                loading="eager"
                src={frame.src}
                width="768"
              />
            ))}
            <span className="launchSplash__lightSweep" />
            <span className="launchSplash__centerFlash" />
            <span className="launchSplash__completionLight" />
            <span className="launchSplash__brand">
              <strong>FRETIVA</strong>
              <span className="launchSplash__brandSubline">
                <i />
                <span>LAB</span>
                <i />
              </span>
              <span className="launchSplash__brandMark" />
            </span>
          </div>
        </div>

        {controlledProgress ? (
          <div
            aria-label={readyToExit ? "테마 준비 완료" : `테마 준비 ${normalizedProgress}%`}
            aria-valuemax="100"
            aria-valuemin="0"
            aria-valuenow={readyToExit ? 100 : normalizedProgress}
            className="launchSplash__progress"
            role="progressbar"
          >
            <span aria-hidden="true" className="launchSplash__progressTrack">
              <span
                className="launchSplash__progressValue"
                style={{ "--launch-progress-scale": normalizedProgress / 100 }}
              />
            </span>
            <strong>{readyToExit ? "READY" : `LOADING ${normalizedProgress}%`}</strong>
          </div>
        ) : null}
      </div>
      <span className="launchSplash__statusText">{statusText}</span>
    </section>
  );
}
