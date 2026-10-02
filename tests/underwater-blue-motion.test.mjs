import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { UNDERWATER_BLUE_MOTION, DESKTOP_MAP_MOTION } from '../src/shooter/mapMotionAssets.js';
import { getShooterMapsForLayout, getShooterMapAssetSources, resolveLayeredShooterMap } from '../src/shooter/maps/registry.js';

test('existing underwater selection uses approved v4 without duplicating the selection', () => {
  const maps = getShooterMapsForLayout(true);
  const matches = maps.filter(map => map.id === 'underwater-blue');
  assert.equal(matches.length, 1);
  const underwater = resolveLayeredShooterMap(matches[0]);
  assert.equal(underwater.renderer, 'ambient-video');
  assert.equal(underwater.background.videoSrc, UNDERWATER_BLUE_MOTION.mobile.videoSrc);
  assert.deepEqual(getShooterMapAssetSources(underwater), [
    UNDERWATER_BLUE_MOTION.mobile.posterSrc,
    '/assets/maps/underwater-blue/background.png',
  ]);
  assert.ok(!getShooterMapsForLayout(true, { isPortraitLayout: false }).includes(matches[0]));
});

test('both underwater formats ship as separate approved videos with posters and a desktop choice', async () => {
  const allowlist = JSON.parse(await readFile(new URL('../scripts/release-audio-assets.json', import.meta.url), 'utf8'));
  assert.equal(DESKTOP_MAP_MOTION['06-underwater-blue'], UNDERWATER_BLUE_MOTION.desktop);
  assert.notEqual(UNDERWATER_BLUE_MOTION.mobile.videoSrc, UNDERWATER_BLUE_MOTION.desktop.videoSrc);
  for (const asset of Object.values(UNDERWATER_BLUE_MOTION)) {
    assert.ok(asset.videoSrc.endsWith('-v4.mp4'));
    assert.ok(allowlist.includes(asset.videoSrc.slice(1)));
    await Promise.all([asset.videoSrc, asset.posterSrc].map(src => access(new URL(`../public${src}`, import.meta.url))));
  }
  const gallery = await readFile(new URL('../src/shooter/DesktopShooterMaps.jsx', import.meta.url), 'utf8');
  assert.ok(gallery.includes("['06-underwater-blue','푸른 바닷속','Underwater Blue']"));
  await access(new URL('../public/assets/shooter/desktop-maps/06-underwater-blue.png', import.meta.url));
});
