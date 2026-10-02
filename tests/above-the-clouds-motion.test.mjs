import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { ABOVE_THE_CLOUDS_MOTION, DESKTOP_MAP_MOTION } from '../src/shooter/mapMotionAssets.js';
import { getShooterMapsForLayout, getShooterMapAssetSources, resolveLayeredShooterMap } from '../src/shooter/maps/registry.js';

test('existing cloud selection resolves to approved mobile v2 with image-only preload', () => {
  const matches=getShooterMapsForLayout(true).filter(map=>map.id==='above-the-clouds');
  assert.equal(matches.length,1);
  const skin=resolveLayeredShooterMap(matches[0]);
  assert.equal(skin.renderer,'ambient-video');
  assert.equal(skin.background.videoSrc,ABOVE_THE_CLOUDS_MOTION.mobile.videoSrc);
  assert.deepEqual(getShooterMapAssetSources(skin),[ABOVE_THE_CLOUDS_MOTION.mobile.posterSrc,'/assets/maps/above-the-clouds/background.png']);
  assert.ok(!getShooterMapsForLayout(true,{isPortraitLayout:false}).includes(matches[0]));
});

test('cloud mobile v2 and desktop v3 ship independently while the old loop remains recoverable', async () => {
  assert.equal(DESKTOP_MAP_MOTION['02-cloud-sanctuary'],ABOVE_THE_CLOUDS_MOTION.desktop);
  assert.ok(ABOVE_THE_CLOUDS_MOTION.mobile.videoSrc.endsWith('-v2.mp4'));
  assert.ok(ABOVE_THE_CLOUDS_MOTION.desktop.videoSrc.endsWith('-v3.mp4'));
  const allowlist=JSON.parse(await readFile(new URL('../scripts/release-audio-assets.json',import.meta.url),'utf8'));
  for(const asset of Object.values(ABOVE_THE_CLOUDS_MOTION)){
    assert.ok(allowlist.includes(asset.videoSrc.slice(1)));
    await Promise.all([asset.videoSrc,asset.posterSrc].map(src=>access(new URL(`../public${src}`,import.meta.url))));
  }
  const legacy=await readFile(new URL('../public/assets/shooter/desktop-maps/02-cloud-sanctuary-loop.mp4',import.meta.url));
  assert.equal(createHash('sha256').update(legacy).digest('hex'),'93156d0b95fceaa6c76aa7a63bac6f3dcb8cc770087ae386f35eb86c370aef40');
});
