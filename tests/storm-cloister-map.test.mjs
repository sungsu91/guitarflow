import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { STORM_CLOISTER_MAP_SKIN as storm } from '../src/shooter/maps/skins/stormCloister.js';
import { getShooterMapsForLayout, getShooterMapAssetSources, resolveLayeredShooterMap } from '../src/shooter/maps/registry.js';

test('storm is selectable on portrait mobile without entering desktop or landscape catalogs', () => {
  const containsStorm = (maps) => maps.some(map => map.id === storm.id);
  assert.equal(containsStorm(getShooterMapsForLayout(true)), true);
  assert.equal(containsStorm(getShooterMapsForLayout(false)), false);
  assert.equal(containsStorm(getShooterMapsForLayout(true, { isPortraitLayout: false })), false);
});

test('resolved storm retains video while the image preloader only fetches its poster', () => {
  const resolved = resolveLayeredShooterMap(storm);
  assert.equal(resolved.background.videoSrc, storm.background.videoSrc);
  assert.deepEqual(getShooterMapAssetSources(resolved), [storm.background.src]);
});

test('storm media ships with a poster and an explicitly permitted release video', async () => {
  const allowlist = JSON.parse(await readFile(new URL('../scripts/release-audio-assets.json', import.meta.url), 'utf8'));
  assert.ok(allowlist.includes(storm.background.videoSrc.slice(1)));
  await Promise.all([storm.background.src, storm.background.videoSrc].map(src => access(new URL(`../public${src}`, import.meta.url))));
});
