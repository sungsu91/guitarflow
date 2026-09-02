export function getMapImageFormat(source = "") {
  const normalizedSource = String(source).split(/[?#]/, 1)[0].toLowerCase();
  if (normalizedSource.endsWith(".webp")) return "webp";
  if (normalizedSource.endsWith(".png")) return "png";
  return "unknown";
}

export function markMapImageLoaded(image) {
  if (!image) return "unknown";
  const format = getMapImageFormat(image.currentSrc || image.src);
  if (image.dataset) image.dataset.mapAssetFormat = format;
  return format;
}

export function applyMapImageFallback(image, fallbackSource) {
  if (!image || !fallbackSource || image.dataset?.mapFallbackApplied === "true") return false;
  if (image.dataset) {
    image.dataset.mapFallbackApplied = "true";
    image.dataset.mapAssetFormat = getMapImageFormat(fallbackSource);
  }
  image.src = fallbackSource;
  return true;
}
