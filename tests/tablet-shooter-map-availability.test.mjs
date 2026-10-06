import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LAYERED_SHOOTER_MAP_SKINS, LANDSCAPE_SHOOTER_MAP_SKINS,
  getRandomShooterMapId, getShooterMapsForLayout, getShooterMapAssetSources,
  isShooterMapAvailableForLayout,
} from '../src/shooter/maps/registry.js';
import { resolveShooterMapForLayout, TABLET_DEFAULT_SHOOTER_MAP_ID } from '../src/shooter/maps/tabletMapPresentation.js';

const compatibleIds = ['moonlit-rooftop', 'underwater-blue', 'aurora-glacier', 'above-the-clouds', 'milky-way-desert', 'firefly-forest', 'glass-garden', 'silk-theatre', 'gilded-ink'];

test('tablets only offer scenes with authored wide compositions, in both orientations', () => {
  for (const isPortraitLayout of [true, false]) {
    const options = { isTabletLayout: true, isPortraitLayout };
    const maps = getShooterMapsForLayout(true, options);
    assert.deepEqual(maps.map(map => map.id), compatibleIds);
    assert.ok(maps.some(map => map.id === TABLET_DEFAULT_SHOOTER_MAP_ID));
    for (const map of LAYERED_SHOOTER_MAP_SKINS) {
      assert.equal(isShooterMapAvailableForLayout(map, true, { ...options, includeMobileOnly: true }), compatibleIds.includes(map.id));
      for (let step = 0; step <= 20; step++) {
        const id = getRandomShooterMapId(map.id, step / 20, maps);
        assert.ok(compatibleIds.includes(id));
        assert.notEqual(id, map.id);
      }
    }
  }
});

test('tablet selection, thumbnails, preloads and playback use matching desktop sources', () => {
  for (const map of getShooterMapsForLayout(true, { isTabletLayout: true }).filter(map => !map.tabletPresentation)) {
    assert.equal(map.tabletComposition, 'landscape');
    assert.equal(map.portraitOnly, false);
    assert.deepEqual(map.referenceViewport, { width: 1920, height: 1080 });
    assert.match(map.background.src, /shooter\/desktop-maps\//);
    assert.equal(map.background.src.replace(/\.jpg$/, '.mp4'), map.background.videoSrc);
    assert.equal(map.pickerPreviewImage, map.background.src);
    assert.deepEqual(getShooterMapAssetSources(map), [map.background.src]);
  }
});

test('tablet presentation does not mutate phone sources or desktop availability', () => {
  assert.deepEqual(getShooterMapsForLayout(true), LAYERED_SHOOTER_MAP_SKINS);
  assert.deepEqual(getShooterMapsForLayout(false), LAYERED_SHOOTER_MAP_SKINS.filter(map => !map.mobileOnly));
  for (const map of LAYERED_SHOOTER_MAP_SKINS) {
    const before = JSON.stringify(map);
    resolveShooterMapForLayout(map, { isTabletLayout: true });
    assert.equal(JSON.stringify(map), before);
    assert.equal(resolveShooterMapForLayout(map), map);
    assert.equal(map.tabletComposition, undefined);
    assert.equal(isShooterMapAvailableForLayout(map, true), true);
  }
});

test('procedural battlefields keep tablet orientation restrictions and phone rotate-to-play', () => {
  for (const map of LANDSCAPE_SHOOTER_MAP_SKINS) {
    assert.equal(isShooterMapAvailableForLayout(map, true, { isTabletLayout: true, isPortraitLayout: true }), false);
    assert.equal(isShooterMapAvailableForLayout(map, true, { isTabletLayout: true, isPortraitLayout: false }), true);
    assert.equal(isShooterMapAvailableForLayout(map, true), true);
    assert.equal(isShooterMapAvailableForLayout(map, false), true);
  }
});
