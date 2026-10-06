import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ART_MAP_CATALOG, ART_MAP_SKINS } from '../src/shooter/maps/artMapCatalog.js';
import { getShooterMapsForLayout, getShooterMapAssetSources, isEditableShooterMap } from '../src/shooter/maps/registry.js';
import { resolveShooterMapForLayout } from '../src/shooter/maps/tabletMapPresentation.js';
import { localizeUi, setLanguage } from '../src/i18n/core.js';

test('art maps append to phone and both tablet orientation catalogs with independent artwork', () => {
  const ids = ART_MAP_CATALOG.map(map => map.id);
  for (const isTabletLayout of [false, true]) {
    for (const isPortraitLayout of (isTabletLayout ? [false, true] : [true])) {
      const maps = getShooterMapsForLayout(true, { isTabletLayout, isPortraitLayout });
      assert.deepEqual(maps.slice(-3).map(map => map.id), ids);
      for (const map of maps.slice(-3)) {
        const scene = ART_MAP_CATALOG.find(scene => scene.id === map.id);
        assert.equal(map.background.src, scene.artwork[isTabletLayout ? 'tablet' : 'mobile']);
        assert.equal(map.pickerPreviewImage, map.background.src);
        assert.deepEqual(getShooterMapAssetSources(map), [map.background.src]);
        assert.equal(isEditableShooterMap(map), false);
        assert.equal(map.referenceViewport.width / map.referenceViewport.height, isTabletLayout ? 16 / 9 : 1 / 2);
      }
    }
  }
  for (const map of ART_MAP_SKINS) {
    const before = JSON.stringify(map);
    resolveShooterMapForLayout(map, { isTabletLayout: true });
    assert.equal(JSON.stringify(map), before, 'tablet adaptation must not mutate the phone scene');
  }
});

test('all nine authored compositions ship as distinct, bounded WebP assets', async () => {
  const fingerprints = new Set();
  let total = 0;
  for (const map of ART_MAP_CATALOG) {
    assert.equal(new Set(Object.values(map.artwork)).size, 3);
    for (const source of Object.values(map.artwork)) {
      const bytes = await readFile(new URL(`../public${source}`, import.meta.url));
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
      assert.ok(bytes.length > 20000 && bytes.length < 900000, `${source}: unexpected asset size ${bytes.length}`);
      fingerprints.add(createHash('sha256').update(bytes).digest('hex'));
      total += bytes.length;
    }
  }
  assert.equal(fingerprints.size, 9, 'each device receives its own composition');
  assert.ok(total < 6_000_000, 'collection must remain inexpensive to deliver over mobile data');
});

test('art map picker names translate on shared mobile/tablet UI', () => {
  try {
    setLanguage('en');
    for (const map of ART_MAP_CATALOG) assert.equal(localizeUi(map.nameKo), map.nameEn);
  } finally { setLanguage('ko'); }
});
