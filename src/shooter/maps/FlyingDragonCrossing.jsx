import { memo, useEffect, useState } from "react";

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function randomBetween(minimum, maximum) {
  return minimum + Math.random() * Math.max(0, maximum - minimum);
}

function getFrameStyle(sheet, frameIndex) {
  const columns = Math.max(1, Number(sheet?.columns) || 1);
  const rows = Math.max(1, Number(sheet?.rows) || 1);
  const frameCount = Math.max(1, Number(sheet?.frameCount) || columns * rows);
  const safeFrame = Math.abs(frameIndex) % frameCount;
  const column = safeFrame % columns;
  const row = Math.floor(safeFrame / columns) % rows;
  const backgroundX = columns === 1 ? 0 : (column / (columns - 1)) * 100;
  const backgroundY = rows === 1 ? 0 : (row / (rows - 1)) * 100;

  return {
    backgroundImage: `url(${sheet.src})`,
    backgroundPosition: `${backgroundX}% ${backgroundY}%`,
    backgroundSize: `${columns * 100}% ${rows * 100}%`,
  };
}

function getActorLayer(event, layers) {
  return layers.find((layer) => layer.instanceId === event.actorInstanceId)
    ?? layers.find((layer) => layer.assetId === event.actorAssetId)
    ?? null;
}

function getFlightOrigin(event, actorLayer) {
  if (!actorLayer) return null;
  const settings = event.settings ?? {};
  const placement = actorLayer.placement ?? {};
  const placedWidth = (Number(placement.width) || 0.2) * Math.abs(Number(placement.scale) || 1);
  const size = clamp(
    placedWidth * (Number(settings.originSizeScale) || 1.25),
    Number(settings.size?.min) || 0.19,
    Number(settings.size?.max) || 0.26,
  );
  const centerX = clamp(Number(placement.x) || 0.18, 0, 1);
  const floorY = clamp(Number(placement.y) || 0.94, 0, 1);

  return {
    instanceId: actorLayer.instanceId,
    left: centerX - size / 2,
    readyStyle: actorLayer.eventActor?.readySrc
      ? {
        backgroundImage: `url(${actorLayer.eventActor.readySrc})`,
        backgroundPosition: "center",
        backgroundSize: "contain",
      }
      : getFrameStyle(
        event.flightSheet,
        event.flightSheet?.readyFrame ?? actorLayer.spriteSheet?.previewFrame ?? 0,
      ),
    size,
    top: floorY - size * 0.9,
  };
}

function FlyingDragonCrossing({ active, event, onOriginHiddenChange, origin }) {
  const [run, setRun] = useState(null);
  const [sequence, setSequence] = useState("flight");
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!active || !origin || typeof window === "undefined") {
      setRun(null);
      if (origin?.instanceId) onOriginHiddenChange?.(origin.instanceId, false);
      return undefined;
    }

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reducedMotion) {
      setRun(null);
      onOriginHiddenChange?.(origin.instanceId, false);
      return undefined;
    }

    const settings = event.settings ?? {};
    const timeouts = new Set();
    const intervals = new Set();
    let cancelled = false;
    let cycleNumber = 0;
    let flightInterval = 0;
    let breathInterval = 0;

    const clearRegisteredInterval = (intervalId) => {
      if (!intervalId) return;
      window.clearInterval(intervalId);
      intervals.delete(intervalId);
    };
    const registerTimeout = (callback, delay) => {
      const timeoutId = window.setTimeout(() => {
        timeouts.delete(timeoutId);
        if (!cancelled) callback();
      }, Math.max(0, delay));
      timeouts.add(timeoutId);
      return timeoutId;
    };
    const startFlightFrames = () => {
      clearRegisteredInterval(flightInterval);
      setSequence("flight");
      setFrameIndex(0);
      flightInterval = window.setInterval(() => {
        setFrameIndex((frame) => (frame + 1) % event.flightSheet.frameCount);
      }, Math.max(70, event.flightSheet.frameDurationMs ?? 105));
      intervals.add(flightInterval);
    };
    const stopFrames = () => {
      clearRegisteredInterval(flightInterval);
      clearRegisteredInterval(breathInterval);
      flightInterval = 0;
      breathInterval = 0;
    };
    const playBreath = () => {
      clearRegisteredInterval(flightInterval);
      clearRegisteredInterval(breathInterval);
      setSequence("breath");
      setFrameIndex(0);
      let nextFrame = 0;
      breathInterval = window.setInterval(() => {
        nextFrame += 1;
        if (nextFrame >= event.breathSheet.frameCount) {
          clearRegisteredInterval(breathInterval);
          breathInterval = 0;
          startFlightFrames();
          return;
        }
        setFrameIndex(nextFrame);
      }, Math.max(110, event.breathSheet.frameDurationMs ?? 155));
      intervals.add(breathInterval);
    };

    const scheduleDeparture = (initial = false) => {
      const range = initial
        ? settings.firstDelaySeconds ?? { min: 7, max: 13 }
        : settings.homeIntervalSeconds ?? { min: 24, max: 48 };
      registerTimeout(startDeparture, randomBetween(range.min, range.max) * 1000);
    };

    const finishLanding = () => {
      stopFrames();
      setRun(null);
      onOriginHiddenChange?.(origin.instanceId, false);
      scheduleDeparture(false);
    };

    const startLanding = () => {
      stopFrames();
      setSequence("flight");
      setFrameIndex(0);
      const durationSeconds = Number(settings.landingDurationSeconds) || 0.72;
      setRun({
        cruiseTop: 0,
        durationSeconds,
        id: cycleNumber,
        phase: "landing",
      });
      registerTimeout(finishLanding, durationSeconds * 1000);
    };

    const startReturn = (cruiseTop) => {
      const range = settings.returnDurationSeconds ?? { min: 6.4, max: 7.8 };
      const durationSeconds = randomBetween(range.min, range.max);
      startFlightFrames();
      setRun({
        cruiseTop,
        durationSeconds,
        id: cycleNumber,
        phase: "return",
      });
      registerTimeout(startLanding, durationSeconds * 1000);
    };

    const waitOffscreen = (cruiseTop) => {
      stopFrames();
      setRun(null);
      const range = settings.awayDelaySeconds ?? { min: 5, max: 11 };
      registerTimeout(() => startReturn(cruiseTop), randomBetween(range.min, range.max) * 1000);
    };

    const startOutbound = (cruiseTop) => {
      const range = settings.outboundDurationSeconds ?? { min: 6.5, max: 8 };
      const durationSeconds = randomBetween(range.min, range.max);
      const breathRange = settings.breathProgress ?? { min: 0.44, max: 0.58 };
      startFlightFrames();
      setRun({
        cruiseTop,
        durationSeconds,
        id: cycleNumber,
        phase: "outbound",
      });
      registerTimeout(playBreath, durationSeconds * randomBetween(breathRange.min, breathRange.max) * 1000);
      registerTimeout(() => waitOffscreen(cruiseTop), durationSeconds * 1000);
    };

    const startDeparture = () => {
      const cruiseRange = settings.cruiseTopRange ?? { min: 0.26, max: 0.44 };
      const cruiseTop = randomBetween(cruiseRange.min, cruiseRange.max);
      const durationSeconds = Number(settings.takeoffDurationSeconds) || 1.15;
      cycleNumber += 1;
      onOriginHiddenChange?.(origin.instanceId, true);
      setSequence("flight");
      setFrameIndex(0);
      setRun({
        cruiseTop,
        durationSeconds,
        id: cycleNumber,
        phase: "takeoff",
      });
      registerTimeout(() => startOutbound(cruiseTop), durationSeconds * 1000);
    };

    onOriginHiddenChange?.(origin.instanceId, false);
    scheduleDeparture(true);

    return () => {
      cancelled = true;
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      intervals.forEach((intervalId) => window.clearInterval(intervalId));
      onOriginHiddenChange?.(origin.instanceId, false);
    };
  }, [
    active,
    event,
    onOriginHiddenChange,
    origin?.instanceId,
    origin?.left,
    origin?.size,
    origin?.top,
  ]);

  if (!run || !origin) return null;

  const readyPhase = run.phase === "takeoff" || run.phase === "landing";
  const activeSheet = sequence === "breath" ? event.breathSheet : event.flightSheet;
  const direction = run.phase === "return" ? "right-to-left" : "left-to-right";
  const spriteStyle = readyPhase
    ? origin.readyStyle
    : getFrameStyle(activeSheet, frameIndex);

  return (
    <span
      aria-hidden="true"
      className="shooterMapFlyingDragonRun"
      data-direction={direction}
      data-phase={run.phase}
      data-sequence={sequence}
      key={`${run.id}-${run.phase}`}
      style={{
        "--shooter-flying-dragon-cruise-top": `${run.cruiseTop * 100}%`,
        "--shooter-flying-dragon-duration": `${run.durationSeconds}s`,
        "--shooter-flying-dragon-origin-left": `${origin.left * 100}%`,
        "--shooter-flying-dragon-origin-top": `${origin.top * 100}%`,
        "--shooter-flying-dragon-size": `${origin.size * 100}%`,
      }}
    >
      <span className="shooterMapFlyingDragonBob">
        <span className="shooterMapFlyingDragonFacing">
          <span
            className={`shooterMapFlyingDragonSprite ${readyPhase ? "shooterMapFlyingDragonSprite--ready" : ""}`}
            data-frame={frameIndex}
            style={spriteStyle}
          />
        </span>
      </span>
    </span>
  );
}

function MapAmbientEvents({ active = false, events = [], layers = [], onOriginHiddenChange }) {
  if (events.length === 0) return null;
  return (
    <div aria-hidden="true" className="shooterMapAmbientEvents">
      {events.map((event) => {
        if (event.type !== "flying-dragon-crossing") return null;
        const origin = getFlightOrigin(event, getActorLayer(event, layers));
        return (
          <FlyingDragonCrossing
            active={active}
            event={event}
            key={event.id}
            onOriginHiddenChange={onOriginHiddenChange}
            origin={origin}
          />
        );
      })}
    </div>
  );
}

export default memo(MapAmbientEvents);
