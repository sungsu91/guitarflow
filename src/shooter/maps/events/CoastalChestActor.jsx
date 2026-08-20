import { memo, useEffect, useReducer } from "react";

import {
  COASTAL_CHEST_STEP_DURATIONS_MS,
  COASTAL_MIMIC_DEFEAT_FRAME_DURATION_MS,
  COASTAL_MIMIC_HIT_FRAME_DURATION_MS,
  COASTAL_MIMIC_HITS_TO_DEFEAT,
  COASTAL_MIMIC_IDLE_FRAME_DURATION_MS,
  canHitCoastalMimic,
  createCoastalChestState,
  isCoastalChestAnimating,
  reduceCoastalChestState,
} from "./coastalChestState.js";

function getActorLabel(state) {
  if (state.phase === "opened") return "열린 보물상자";
  if (["active", "hit-reacting"].includes(state.phase)) {
    return `미믹 공격 ${state.hitCount}/${COASTAL_MIMIC_HITS_TO_DEFEAT}`;
  }
  if (state.phase === "defeating") return "처치된 미믹이 사라지는 중";
  return "닫힌 보물상자 열기";
}

function CoastalChestActor({ editMode = false, eventActor, instanceId, onSound }) {
  const variant = eventActor?.variant === "mimic" ? "mimic" : "treasure";
  const frames = Array.isArray(eventActor?.frames) ? eventActor.frames : [];
  const idleFrames = Array.isArray(eventActor?.idleFrames) ? eventActor.idleFrames : [];
  const hitFrames = Array.isArray(eventActor?.hitFrames) ? eventActor.hitFrames : [];
  const defeatFrames = Array.isArray(eventActor?.defeatFrames) ? eventActor.defeatFrames : [];
  const [state, dispatch] = useReducer(
    reduceCoastalChestState,
    variant,
    createCoastalChestState,
  );

  useEffect(() => {
    if (editMode || typeof window === "undefined") return undefined;
    if (isCoastalChestAnimating(state.phase)) {
      const duration = COASTAL_CHEST_STEP_DURATIONS_MS[state.stepIndex] ?? 160;
      const timeoutId = window.setTimeout(() => dispatch({ type: "advance" }), duration);
      return () => window.clearTimeout(timeoutId);
    }
    if (variant === "mimic" && state.phase === "active") {
      const timeoutId = window.setTimeout(
        () => dispatch({ type: "idle-tick" }),
        COASTAL_MIMIC_IDLE_FRAME_DURATION_MS,
      );
      return () => window.clearTimeout(timeoutId);
    }
    if (variant === "mimic" && state.phase === "hit-reacting") {
      const timeoutId = window.setTimeout(
        () => dispatch({ type: "hit-advance" }),
        COASTAL_MIMIC_HIT_FRAME_DURATION_MS,
      );
      return () => window.clearTimeout(timeoutId);
    }
    if (state.phase === "defeating") {
      const timeoutId = window.setTimeout(
        () => dispatch({ type: "defeat-advance" }),
        COASTAL_MIMIC_DEFEAT_FRAME_DURATION_MS,
      );
      return () => window.clearTimeout(timeoutId);
    }
    return undefined;
  }, [editMode, state.motionFrameIndex, state.phase, state.stepIndex, variant]);

  const readySrc = eventActor?.readySrc || frames[0];
  if (editMode) {
    return (
      <span aria-hidden="true" className="shooterMapChestActor" data-state="preview">
        <img
          alt=""
          className="shooterMapChestArtwork"
          decoding="async"
          draggable="false"
          src={readySrc}
        />
      </span>
    );
  }

  if (state.phase === "removed") {
    return <span aria-hidden="true" className="shooterMapChestActor" data-state="removed" />;
  }

  let displayFrameIndex = state.frameIndex;
  let animationKind = isCoastalChestAnimating(state.phase) ? "reveal" : state.phase;
  let frameSrc = frames[state.frameIndex] || readySrc;
  if (variant === "mimic" && state.phase === "active") {
    displayFrameIndex = state.motionFrameIndex;
    animationKind = "idle";
    frameSrc = idleFrames[state.motionFrameIndex] || frames[4] || readySrc;
  } else if (variant === "mimic" && state.phase === "hit-reacting") {
    displayFrameIndex = state.motionFrameIndex;
    animationKind = "hit";
    frameSrc = hitFrames[state.motionFrameIndex] || idleFrames[0] || frames[4] || readySrc;
  } else if (variant === "mimic" && state.phase === "defeating") {
    displayFrameIndex = state.motionFrameIndex;
    animationKind = "die";
    frameSrc = defeatFrames[state.motionFrameIndex] || defeatFrames.at(-1) || frames[4] || readySrc;
  }
  const revealAnimating = isCoastalChestAnimating(state.phase);
  const animating = revealAnimating || state.phase === "hit-reacting" || state.phase === "defeating";
  const interactionLocked = revealAnimating
    || state.phase === "opened"
    || state.phase === "defeating"
    || (state.phase === "hit-reacting" && state.hitCount >= COASTAL_MIMIC_HITS_TO_DEFEAT);

  return (
    <button
      aria-busy={animating || state.phase === "defeating"}
      aria-label={getActorLabel(state)}
      className="shooterMapChestActor"
      data-animation={animationKind}
      data-frame-index={displayFrameIndex}
      data-hit-count={state.hitCount}
      data-instance-id={instanceId}
      data-interaction-locked={interactionLocked || undefined}
      data-state={state.phase}
      data-variant={variant}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (canHitCoastalMimic(state)) {
          onSound?.("mimic-hit", {
            hitCount: state.hitCount + 1,
            instanceId,
          });
        }
        dispatch({ type: "click" });
      }}
      onPointerDown={(event) => event.stopPropagation()}
      type="button"
    >
      <span className="shooterMapChestArtworkWrap">
        <img
          alt=""
          className="shooterMapChestArtwork"
          decoding="async"
          draggable="false"
          key={frameSrc}
          src={frameSrc}
        />
        {variant === "treasure" && state.phase === "opened" ? (
          <img
            alt=""
            aria-hidden="true"
            className="shooterMapChestRewardBurst"
            decoding="async"
            draggable="false"
            src={frames[4] || frameSrc}
          />
        ) : null}
      </span>
      {variant === "mimic" && ["active", "hit-reacting"].includes(state.phase) ? (
        <span aria-hidden="true" className="shooterMapMimicHitMeter">
          {Array.from({ length: COASTAL_MIMIC_HITS_TO_DEFEAT }, (_, index) => (
            <i className={index < state.hitCount ? "is-hit" : ""} key={index} />
          ))}
        </span>
      ) : null}
    </button>
  );
}

export default memo(CoastalChestActor);
