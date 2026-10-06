import { readFileSync } from "./helpers/i18n-source.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';

import {execFileSync} from 'node:child_process';
import {isNoteVfxPreviewRequested} from '../src/shooter/noteVfx/noteVfx.js';
import {MOONLIT_ROOFTOP_MOTION, SCENIC_MAP_MOTION} from '../src/shooter/mapMotionAssets.js';

test('moonlit map preview remains development-only; monster visuals are unconditional',()=>{
 for(const dev of [false,undefined,null]) assert.equal(isNoteVfxPreviewRequested(dev,'?shooterNoteVfx=1'),false);
 assert.equal(isNoteVfxPreviewRequested(true,''),false);
 assert.equal(isNoteVfxPreviewRequested(true,'?shooterNoteVfx=0'),false);
 assert.equal(isNoteVfxPreviewRequested(true,'?shooterNoteVfx=1'),true);
});
test('pitch judgment, projectile scoring and collision geometry remain identical after authorized pacing changes',()=>{
 const baseline=execFileSync('git',['show','0e79bf3:src/App.jsx'],{encoding:'utf8',maxBuffer:8e6}).replaceAll('\r\n','\n');
 const current=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8').replaceAll('\r\n','\n');
 for(const [start,end] of [
   ['  const resolveShooterProjectileHit = useCallback','  const finalizeShooterRecord = useCallback'],
   ['  const getShooterTargetHurtbox = useCallback','  const updateShooterHitboxDebug = useCallback'],
 ]) {
  assert.ok(baseline.indexOf(start)>=0&&baseline.indexOf(end)>baseline.indexOf(start),start);
  assert.ok(current.indexOf(start)>=0&&current.indexOf(end)>current.indexOf(start),start);
  assert.equal(current.slice(current.indexOf(start),current.indexOf(end)),baseline.slice(baseline.indexOf(start),baseline.indexOf(end)));
 }
 // Released microphone attack gating and MIDI judgment remain unchanged.
 // Presentation/media inventories belong to their dedicated asset tests.
 for (const path of ['src/shooter/noteOn.js', 'src/shooter/midiJudgment.js']) {
  const released = execFileSync('git', ['show', '77abea6c:' + path], {encoding:'utf8'}).replaceAll('\r\n','\n');
  const actual = readFileSync(new URL('../' + path, import.meta.url), 'utf8').replaceAll('\r\n','\n');
  assert.equal(actual, released, path);
 }
});
