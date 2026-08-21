function positiveNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getMapCoverPlaneSize(containerWidth, containerHeight, referenceViewport) {
  const width = positiveNumber(containerWidth, 390);
  const height = positiveNumber(containerHeight, 756);
  const referenceWidth = positiveNumber(referenceViewport?.width, 390);
  const referenceHeight = positiveNumber(referenceViewport?.height, 756);
  const scale = Math.max(width / referenceWidth, height / referenceHeight);
  const planeWidth = referenceWidth * scale;
  const planeHeight = referenceHeight * scale;

  return {
    height: planeHeight,
    offsetX: (width - planeWidth) / 2,
    offsetY: (height - planeHeight) / 2,
    width: planeWidth,
  };
}

