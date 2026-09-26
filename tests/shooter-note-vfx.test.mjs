import { readFileSync } from "./helpers/i18n-source.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';

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
 ]) {
  assert.ok(baseline.indexOf(start)>=0&&baseline.indexOf(end)>baseline.indexOf(start),start);
  assert.ok(current.indexOf(start)>=0&&current.indexOf(end)>current.indexOf(start),start);
  assert.equal(current.slice(current.indexOf(start),current.indexOf(end)),baseline.slice(baseline.indexOf(start),baseline.indexOf(end)));
 }
 const changed=execFileSync('git',['diff','0e79bf3','--name-only','--','src/shooter','src/audio','public'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 // Build metadata moved out of public so Vite can import it; the manifest data is unchanged.
 const manifestPaths=['public/assets/shooter/instruments/fretiva_pink_instrument_skin_pack_v1/skin_manifest.json','public/assets/pets/fretiva_pet_sprite_pack_v1/pets.manifest.json','src/shooter/pets.manifest.json','src/shooter/instruments/fretivaPinkInstrumentSkinPackV1.manifest.json'];
 const newMapPaths = ['src/shooter/maps/registry.js', 'src/shooter/maps/skins/moonlitRooftop.js', 'public/assets/maps/moonlit-rooftop/moonlit-rooftop.png'];
 newMapPaths.push('src/shooter/maps/MapSkinRenderer.jsx', 'src/shooter/maps/map-skins.css', 'src/shooter/maps/skins/scenicMaps.js', ...['underwater-blue','aurora-glacier','above-the-clouds','milky-way-desert','firefly-forest'].map(id => `public/assets/maps/${id}/background.png`));
 const progressionPaths=['src/shooter/progressionSettings.js','src/shooter/ProgressSettings.jsx','src/shooter/progress-settings.css','src/shooter/desktopHorizontal/DesktopHorizontalBattleView.jsx'];
 // Score playback is independent of shooter judgment and collision audio.
 const scoreAudioPaths=['src/audio/scoreInstrument.js','src/audio/scoreDrums.js','src/audio/scoreExpressions.js','src/audio/fretboardPreviewEngine.js','src/audio/viewerChordSamples.js'];
 // Approved instrument samples were committed with the score-player release.
 const scoreSamplePaths=JSON.parse(readFileSync(new URL('../scripts/release-audio-assets.json',import.meta.url),'utf8')).map(path=>`public/${path}`);
 scoreSamplePaths.push('public/sounds/guitar-chords/ATTRIBUTION.txt', 'public/sounds/rhythm-count/README.md');
 // Authorized external input adapters; collision/scoring slices above stay unchanged.
 const externalInputPaths=['src/audio/micInputEngine.js','src/audio/micForegroundRecovery.js','src/shooter/midiJudgment.js','src/shooter/ShooterPitchMonitor.jsx'];
 const viewportPaths=['src/shooter/mobile-canonical-viewport.css','src/shooter/useShooterMobileViewport.js','src/shooter/mobileViewportFrame.js']; // Authorized iPhone Home Screen layout repair.
 // Released audio mixing/clock and recording UI updates (44fd315, 7d7cc2a).
 // Keep the permission list explicit: new gameplay modules still fail this guard.
 const releasedPaths=['src/audio/audioBus.js','src/audio/grooveMastering.js','src/audio/grooveVolumeStore.js','src/audio/pluckedString.js','src/audio/transportClock.js','src/shooter/ShooterSettingsPopover.jsx','src/shooter/settings-popover.css','src/shooter/maps/ShootingMapRenderer.jsx','src/shooter/recording/ShooterRecording.jsx','src/shooter/recording/recordingMedia.js','src/shooter/recording/sceneCapture.js','src/shooter/recording/shooter-recording.css'];
 // Presentation-only i18n extraction; gameplay slices above remain protected.
 const i18nPresentationPaths=["src/audio/mediaPermissionGuide.js","src/audio/metronomePreview.js","src/audio/scoreDrums.js","src/audio/scoreInstrument.js","src/shooter/desktopHorizontal/DesktopHorizontalBattleView.jsx","src/shooter/difficultDifficultyScenario.js","src/shooter/easyDifficultyScenario.js","src/shooter/easyRandomDifficulty.js","src/shooter/guitarCabinet.js","src/shooter/instruments/fretivaArtisanInstrumentSkinPackV2.js","src/shooter/instruments/fretivaCreativeInstrumentPackV3.js","src/shooter/instruments/fretivaGuitarAddonV2.js","src/shooter/instruments/fretivaInstrumentSkinPackV1.js","src/shooter/instruments/fretivaPinkInstrumentSkinPackV1.js","src/shooter/instruments/fretivaPomeranianInstrumentPackV1.js","src/shooter/maps/assets/abyssalMoonCathedralAssets.js","src/shooter/maps/assets/clockworkOperaAssets.js","src/shooter/maps/assets/coastalCoveAssets.js","src/shooter/maps/assets/lavaCanyonAssets.js","src/shooter/maps/assets/parkAssets.js","src/shooter/maps/assets/riverAssets.js","src/shooter/maps/editor/editorState.js","src/shooter/maps/editor/MapEditPanel.jsx","src/shooter/maps/editor/useMapEditMode.js","src/shooter/maps/events/CoastalChestActor.jsx","src/shooter/maps/MapSkinRenderer.jsx","src/shooter/maps/skins/abyssalMoonCathedral.js","src/shooter/maps/skins/autumnMoonTemplePath.js","src/shooter/maps/skins/celestialEclipseClocktower.js","src/shooter/maps/skins/clockworkOperaCitadel.js","src/shooter/maps/skins/coastalCove.js","src/shooter/maps/skins/gachaArcade.js","src/shooter/maps/skins/lavaCanyon.js","src/shooter/maps/skins/moonlitRooftop.js","src/shooter/maps/skins/park.js","src/shooter/maps/skins/pseudo3dTest.js","src/shooter/maps/skins/river.js","src/shooter/maps/skins/scenicMaps.js","src/shooter/maps/skins/threeDLab.js","src/shooter/normalDifficultyScenario.js","src/shooter/noteMonsterAssets.js","src/shooter/noteVfx/NeonNote.jsx","src/shooter/pets.js","src/shooter/playHelp.js","src/shooter/ProgressSettings.jsx","src/shooter/pseudo3d/Pseudo3DRenderer.jsx","src/shooter/recording/cameraBeauty.js","src/shooter/recording/canvasPaintTexture.js","src/shooter/recording/recordingMedia.js","src/shooter/recording/sceneCapture.js","src/shooter/recording/ShooterRecording.jsx","src/shooter/results/shareResult.js","src/shooter/results/ShooterGameOver.jsx","src/shooter/results/ShooterShareButton.jsx","src/shooter/ShooterPitchMonitor.jsx","src/shooter/ShooterSettingsPopover.jsx","src/shooter/threed/archive/ThreeDLabPortraitRenderer.jsx","src/shooter/threed/ThreeDLabHorizontalRenderer.jsx"];
 assert.ok(changed.every(path=>path.startsWith('src/shooter/noteVfx/') || path.startsWith('src/shooter/results/') || manifestPaths.includes(path) || newMapPaths.includes(path) || progressionPaths.includes(path) || externalInputPaths.includes(path) || viewportPaths.includes(path) || scoreAudioPaths.includes(path) || scoreSamplePaths.includes(path) || releasedPaths.includes(path) || i18nPresentationPaths.includes(path)),changed.join('\n'));
});
