import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {isNoteVfxPreviewRequested} from '../src/shooter/noteVfx/noteVfx.js';

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
 ]) assert.equal(current.slice(current.indexOf(start),current.indexOf(end)),baseline.slice(baseline.indexOf(start),baseline.indexOf(end)));
 const changed=execFileSync('git',['diff','0e79bf3','--name-only','--','src/shooter','src/audio','public'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 const newMapPaths = ['src/shooter/maps/registry.js', 'src/shooter/maps/skins/moonlitRooftop.js', 'public/assets/maps/moonlit-rooftop/moonlit-rooftop.png'];
 newMapPaths.push('src/shooter/maps/MapSkinRenderer.jsx', 'src/shooter/maps/map-skins.css', 'src/shooter/maps/skins/scenicMaps.js', ...['underwater-blue','aurora-glacier','above-the-clouds','milky-way-desert','firefly-forest'].map(id => `public/assets/maps/${id}/background.png`));
 const progressionPaths=['src/shooter/progressionSettings.js','src/shooter/ProgressSettings.jsx','src/shooter/progress-settings.css','src/shooter/desktopHorizontal/DesktopHorizontalBattleView.jsx'];
 // Score playback is independent of shooter judgment and collision audio.
 const scoreAudioPaths=['src/audio/scoreInstrument.js','src/audio/scoreDrums.js','src/audio/scoreExpressions.js','src/audio/fretboardPreviewEngine.js','src/audio/viewerChordSamples.js'];
 // Approved instrument samples were committed with the score-player release.
 const scoreSamplePaths=JSON.parse(readFileSync(new URL('../scripts/release-audio-assets.json',import.meta.url),'utf8')).map(path=>`public/${path}`);
 scoreSamplePaths.push('public/sounds/guitar-chords/ATTRIBUTION.txt');
 const viewportPaths=['src/shooter/mobile-canonical-viewport.css','src/shooter/useShooterMobileViewport.js','src/shooter/mobileViewportFrame.js']; // Authorized iPhone Home Screen layout repair.
 assert.ok(changed.every(path=>path.startsWith('src/shooter/noteVfx/') || path.startsWith('src/shooter/results/') || newMapPaths.includes(path) || progressionPaths.includes(path) || viewportPaths.includes(path) || scoreAudioPaths.includes(path) || scoreSamplePaths.includes(path)),changed.join('\n'));
});
