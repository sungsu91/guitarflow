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
test('gameplay functions and existing visual assets are identical to the preserved baseline',()=>{
 const baseline=execFileSync('git',['show','0e79bf3:src/App.jsx'],{encoding:'utf8',maxBuffer:8e6}).replaceAll('\r\n','\n');
 const current=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8').replaceAll('\r\n','\n');
 const start='  const flashStage = useCallback';
 const end='  const startShooterMic = useCallback';
 assert.equal(current.slice(current.indexOf(start),current.indexOf(end)),baseline.slice(baseline.indexOf(start),baseline.indexOf(end)));
 const changed=execFileSync('git',['diff','0e79bf3','--name-only','--','src/shooter','src/audio','public'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 assert.ok(changed.every(path=>path.startsWith('src/shooter/noteVfx/')),changed.join('\n'));
});
