function normalizeFrame(frameIndex, frameCount) {
  const safeCount = Math.max(1, Math.floor(Number(frameCount) || 1));
  const integerFrame = Math.floor(Number(frameIndex) || 0);
  return ((integerFrame % safeCount) + safeCount) % safeCount;
}

export function getAutumnSpriteCell(frameIndex, sequence) {
  const frame = normalizeFrame(frameIndex, sequence?.frameCount);
  const framesPerSheet = Math.max(1, sequence?.framesPerSheet ?? 8);
  const columns = Math.max(1, sequence?.columns ?? 4);
  const frameInSheet = frame % framesPerSheet;
  return {
    frame,
    sheetIndex: Math.floor(frame / framesPerSheet),
    column: frameInSheet % columns,
    row: Math.floor(frameInSheet / columns),
  };
}

export function getAutumnLoopFrame(elapsedMs, sequence) {
  const elapsedFrames = Math.floor(
    Math.max(0, Number(elapsedMs) || 0) * Math.max(0.01, sequence?.framesPerSecond ?? 1) / 1000,
  );
  return normalizeFrame(elapsedFrames + (sequence?.phaseOffsetFrames ?? 0), sequence?.frameCount);
}

export function getAutumnGroundGustDelay(randomDelayMs, randomValue = Math.random()) {
  const minimum = Math.max(0, Number(randomDelayMs?.[0]) || 7000);
  const maximum = Math.max(minimum, Number(randomDelayMs?.[1]) || 12000);
  const normalizedRandom = Number.isFinite(randomValue)
    ? Math.min(0.999999, Math.max(0, randomValue))
    : 0;
  return minimum + (maximum - minimum) * normalizedRandom;
}

export function getAutumnSequencesForLayout(sequences = [], layout = "mobile") {
  return sequences.filter((sequence) => layout !== "mobile" || sequence?.mobileEnabled !== false);
}

export function getAutumnPlaybackSequence(sequence = {}, layout = "mobile") {
  return {
    ...sequence,
    ...(sequence.runtimeVariant ?? {}),
    framesPerSecond: layout === "mobile"
      ? sequence.mobileFramesPerSecond ?? sequence.framesPerSecond
      : sequence.framesPerSecond,
  };
}
