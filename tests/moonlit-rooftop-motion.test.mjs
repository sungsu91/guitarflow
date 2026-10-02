import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { MOONLIT_ROOFTOP_MOTION, DESKTOP_MAP_MOTION } from '../src/shooter/mapMotionAssets.js';
import { MOONLIT_ROOFTOP_MAP_SKIN as moon } from '../src/shooter/maps/skins/moonlitRooftop.js';
import { getShooterMapsForLayout, getShooterMapAssetSources, resolveLayeredShooterMap } from '../src/shooter/maps/registry.js';

test('existing portrait moonlit selection resolves to the approved motion asset', () => {
  const selected = getShooterMapsForLayout(true).find(map => map.id === 'moonlit-rooftop');
  const resolved = resolveLayeredShooterMap(selected);
  assert.equal(resolved.renderer, 'ambient-video');
  assert.equal(resolved.background.videoSrc, '/assets/maps/moonlit-rooftop/moonlit-rooftop-motion-v2.mp4');
  assert.equal(resolved.background.position, '50% 0%');
  assert.ok(!getShooterMapsForLayout(true, { isPortraitLayout: false }).includes(selected));
});

test('moonlit preloading uses images and the approved video is included in release assets', async () => {
  assert.deepEqual(getShooterMapAssetSources(moon), [moon.background.src, moon.background.fallbackSrc]);
  const allowlist = JSON.parse(await readFile(new URL('../scripts/release-audio-assets.json', import.meta.url), 'utf8'));
  assert.ok(allowlist.includes(moon.background.videoSrc.slice(1)));
  await Promise.all([moon.background.src, moon.background.videoSrc].map(src => access(new URL(`../public${src}`, import.meta.url))));
});

test('desktop moonlit uses its approved widescreen composition', async () => {
  const wide = DESKTOP_MAP_MOTION['01-moonlit-rooftop'];
  assert.equal(wide, MOONLIT_ROOFTOP_MOTION.desktop);
  assert.notEqual(wide.videoSrc, moon.background.videoSrc);
  const allowlist = JSON.parse(await readFile(new URL('../scripts/release-audio-assets.json', import.meta.url), 'utf8'));
  assert.ok(allowlist.includes(wide.videoSrc.slice(1)));
  await Promise.all([wide.posterSrc, wide.videoSrc].map(src => access(new URL(`../public${src}`, import.meta.url))));
});
