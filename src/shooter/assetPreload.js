export function collectShooterEntryImageSources({
  effectLayers = [],
  emblemAssetSrc = "",
  enemyAssetSources = [],
  guitarAssetSrc = "",
  guitarProjectileAssetSrc = "",
  mapBackgroundSrc = "",
  mapPreviewSrc = "",
  pickAssetSrc = "",
} = {}) {
  return [...new Set([
    guitarAssetSrc,
    guitarProjectileAssetSrc,
    pickAssetSrc,
    mapBackgroundSrc,
    mapPreviewSrc,
    emblemAssetSrc,
    ...effectLayers.map((layer) => layer?.asset),
    ...enemyAssetSources,
  ].filter((src) => typeof src === "string" && src.trim()))];
}

export function preloadShooterEntryImages(options, preloadImage) {
  const sources = collectShooterEntryImageSources(options);
  return Promise.all(sources.map((src) => preloadImage(src))).then(() => undefined);
}
