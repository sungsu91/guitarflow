function positiveInteger(value, fallback) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function getForwardSpriteSheetFrameIndex(elapsedMs, frameDurationMs, frameCount = 8) {
  const duration = positiveInteger(frameDurationMs, 1);
  const count = positiveInteger(frameCount, 1);
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  return Math.floor(elapsed / duration) % count;
}

export function getSpriteSheetFrameRect(frameIndex, spriteSheet = {}) {
  const columns = positiveInteger(spriteSheet.columns, 1);
  const rows = positiveInteger(spriteSheet.rows, 1);
  const frameCount = positiveInteger(spriteSheet.frameCount, columns * rows);
  const frameWidth = positiveInteger(spriteSheet.frameWidth, 1);
  const frameHeight = positiveInteger(spriteSheet.frameHeight, 1);
  const normalizedFrame = ((Math.floor(Number(frameIndex) || 0) % frameCount) + frameCount) % frameCount;
  const column = normalizedFrame % columns;
  const row = Math.floor(normalizedFrame / columns) % rows;

  return {
    frameIndex: normalizedFrame,
    column,
    row,
    sx: column * frameWidth,
    sy: row * frameHeight,
    sw: frameWidth,
    sh: frameHeight,
  };
}
