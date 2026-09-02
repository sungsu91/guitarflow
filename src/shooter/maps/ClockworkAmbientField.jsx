import { memo, useEffect, useRef } from "react";

import { subscribeSharedMapAnimation } from "./sharedSpriteClock.js";

const LANTERN_GLOWS = Object.freeze([
  Object.freeze({ x: 0.165, y: 0.238, radius: 0.044, phase: 0.2 }),
  Object.freeze({ x: 0.827, y: 0.238, radius: 0.044, phase: 2.4 }),
  Object.freeze({ x: 0.267, y: 0.326, radius: 0.032, phase: 4.1 }),
]);

const STEAM_EMITTERS = Object.freeze([
  Object.freeze({ x: 0.176, y: 0.642, rise: 0.075, drift: 0.016, speed: 0.055 }),
  Object.freeze({ x: 0.835, y: 0.438, rise: 0.068, drift: 0.014, speed: 0.061 }),
  Object.freeze({ x: 0.828, y: 0.637, rise: 0.078, drift: 0.017, speed: 0.052 }),
]);

const STEAM_PARTICLES = Object.freeze(STEAM_EMITTERS.flatMap((emitter, emitterIndex) => (
  Array.from({ length: 6 }, (_, particleIndex) => Object.freeze({
    emitter,
    phase: ((emitterIndex * 11 + particleIndex * 17) % 37) / 37,
    size: 1.6 + ((emitterIndex * 5 + particleIndex * 3) % 7) * 0.34,
    swayPhase: emitterIndex * 1.9 + particleIndex * 1.37,
  }))
)));

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function syncCanvasSize(canvas) {
  const width = Math.round(canvas.clientWidth);
  const height = Math.round(canvas.clientHeight);
  if (!width || !height) return null;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { height, width };
}

function drawLanternGlows(context, width, height, elapsedSeconds) {
  context.save();
  context.globalCompositeOperation = "screen";
  LANTERN_GLOWS.forEach((lantern) => {
    const irregularPulse = 0.62
      + Math.sin(elapsedSeconds * 0.86 + lantern.phase) * 0.11
      + Math.sin(elapsedSeconds * 1.73 + lantern.phase * 1.7) * 0.06;
    const radius = lantern.radius * Math.min(width, height) * (0.96 + irregularPulse * 0.08);
    const gradient = context.createRadialGradient(
      lantern.x * width,
      lantern.y * height,
      0,
      lantern.x * width,
      lantern.y * height,
      radius,
    );
    gradient.addColorStop(0, `rgba(255, 244, 184, ${0.34 * irregularPulse})`);
    gradient.addColorStop(0.24, `rgba(255, 178, 66, ${0.2 * irregularPulse})`);
    gradient.addColorStop(1, "rgba(255, 116, 24, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(lantern.x * width, lantern.y * height, radius, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

function drawSteam(context, width, height, elapsedSeconds) {
  context.save();
  STEAM_PARTICLES.forEach((particle) => {
    const travel = modulo(particle.phase + elapsedSeconds * particle.emitter.speed, 1);
    const fade = Math.sin(travel * Math.PI);
    const x = (
      particle.emitter.x
      + Math.sin(elapsedSeconds * 0.72 + particle.swayPhase) * particle.emitter.drift * travel
    ) * width;
    const y = (particle.emitter.y - travel * particle.emitter.rise) * height;
    const radiusX = particle.size * (0.72 + travel * 0.8);
    const radiusY = particle.size * (1 + travel * 1.45);
    context.globalAlpha = Math.max(0, fade * 0.2);
    context.fillStyle = particle.phase > 0.5 ? "#d7e1dc" : "#f1e8d5";
    context.beginPath();
    context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

function drawClockworkAmbientField(canvas, timestampMs) {
  const size = syncCanvasSize(canvas);
  if (!size) return;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;
  context.clearRect(0, 0, size.width, size.height);
  const elapsedSeconds = Math.max(0, Number(timestampMs) || 0) / 1000;
  drawLanternGlows(context, size.width, size.height, elapsedSeconds);
  drawSteam(context, size.width, size.height, elapsedSeconds);
}

function ClockworkAmbientField({ active = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    drawClockworkAmbientField(canvas, 0);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (!active || reducedMotion) return undefined;

    return subscribeSharedMapAnimation(canvas, (timestampMs) => {
      const arena = canvas.closest(".shooterArena");
      if (arena?.classList.contains("paused") || arena?.classList.contains("shooterArena--animationsPaused")) {
        return;
      }
      drawClockworkAmbientField(canvas, timestampMs);
    }, { framesPerSecond: 20 });
  }, [active]);

  return (
    <canvas
      aria-hidden="true"
      className="shooterMapClockworkAmbient"
      data-lantern-count={LANTERN_GLOWS.length}
      data-particle-count={STEAM_PARTICLES.length}
      ref={canvasRef}
    />
  );
}

export default memo(ClockworkAmbientField);
