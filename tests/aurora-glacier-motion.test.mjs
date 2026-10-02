import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { AURORA_GLACIER_MOTION, DESKTOP_MAP_MOTION } from '../src/shooter/mapMotionAssets.js';
import { getShooterMapsForLayout, getShooterMapAssetSources, resolveLayeredShooterMap } from '../src/shooter/maps/registry.js';

test('existing aurora choice resolves to approved star-enhanced v2 with portrait preload assets', () => {
  const matches=getShooterMapsForLayout(true).filter(map=>map.id==='aurora-glacier');
  assert.equal(matches.length,1);
  const skin=resolveLayeredShooterMap(matches[0]);
  assert.equal(skin.renderer,'ambient-video');
  assert.equal(skin.background.videoSrc,AURORA_GLACIER_MOTION.mobile.videoSrc);
  assert.deepEqual(getShooterMapAssetSources(skin),[AURORA_GLACIER_MOTION.mobile.posterSrc,'/assets/maps/aurora-glacier/background.png']);
  assert.ok(!getShooterMapsForLayout(true,{isPortraitLayout:false}).includes(matches[0]));
});

test('both approved aurora compositions are shipped separately', async () => {
  assert.equal(DESKTOP_MAP_MOTION['03-aurora-lake'],AURORA_GLACIER_MOTION.desktop);
  assert.notEqual(AURORA_GLACIER_MOTION.mobile.videoSrc,AURORA_GLACIER_MOTION.desktop.videoSrc);
  const allowlist=JSON.parse(await readFile(new URL('../scripts/release-audio-assets.json',import.meta.url),'utf8'));
  for(const asset of Object.values(AURORA_GLACIER_MOTION)){
    assert.ok(asset.videoSrc.endsWith('-v2.mp4'));
    assert.ok(allowlist.includes(asset.videoSrc.slice(1)));
    await Promise.all([asset.videoSrc,asset.posterSrc].map(src=>access(new URL(`../public${src}`,import.meta.url))));
  }
});
