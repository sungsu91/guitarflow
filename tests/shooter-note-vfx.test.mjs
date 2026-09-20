import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {isNoteVfxEnabled} from '../src/shooter/noteVfx/noteVfx.js';

test('neon visuals require an explicit development-only opt in',()=>{
 for(const dev of [false,undefined,null]) assert.equal(isNoteVfxEnabled(dev,'?shooterNoteVfx=1'),false);
 assert.equal(isNoteVfxEnabled(true,''),false);
 assert.equal(isNoteVfxEnabled(true,'?shooterNoteVfx=0'),false);
 assert.equal(isNoteVfxEnabled(true,'?shooterNoteVfx=1'),true);
});
test('pitch judgment, projectile scoring and collision geometry remain identical after authorized pacing changes',()=>{
 const baseline=execFileSync('git',['show','0e79bf3:src/App.jsx'],{encoding:'utf8',maxBuffer:8e6}).replaceAll('\r\n','\n');
 const current=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8').replaceAll('\r\n','\n');
 for(const [start,end] of [
   ['  const resolveShooterProjectileHit = useCallback','  const finalizeShooterRecord = useCallback'],
   ['  const getShooterTargetHurtbox = useCallback','  const updateShooterHitboxDebug = useCallback'],
 ]) assert.equal(current.slice(current.indexOf(start),current.indexOf(end)),baseline.slice(baseline.indexOf(start),baseline.indexOf(end)));
 const changed=execFileSync('git',['diff','0e79bf3','--name-only','--','src/shooter','src/audio','public'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 const newMapPaths = ['src/shooter/maps/registry.js', 'src/shooter/maps/skins/moonlitRooftop.js', 'public/assets/maps/moonlit-rooftop/moonlit-rooftop.png'];
 const progressionPaths=['src/shooter/progressionSettings.js','src/shooter/ProgressSettings.jsx','src/shooter/progress-settings.css','src/shooter/desktopHorizontal/DesktopHorizontalBattleView.jsx'];
 assert.ok(changed.every(path=>path.startsWith('src/shooter/noteVfx/') || newMapPaths.includes(path) || progressionPaths.includes(path)),changed.join('\n'));
});
