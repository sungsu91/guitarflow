import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Audio Studio is a developer-only route and menu entry", async () => {
  const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(appSource, /AUDIO_STUDIO:\s*"audio-studio"/);
  assert.match(appSource, /AUDIO_STUDIO:\s*"#audio-studio"/);
  assert.match(appSource, /function isAudioStudioEnabled\(\)\s*\{\s*return import\.meta\.env\.DEV;/s);
  assert.match(appSource, /case APP_ROUTES\.AUDIO_STUDIO:[\s\S]*?isAudioStudioEnabled\(\)/);
  assert.match(appSource, /\{audioStudioEnabled \? \([\s\S]*?audioStudioMenuItem[\s\S]*?DEV[\s\S]*?MIX &amp; AUDIO LIBRARY/);
  assert.match(appSource, /<AudioStudio active=\{appMode === APP_MODES\.AUDIO_STUDIO\} mobile=\{isMobileLayout\} \/>/);
});

test("Audio Studio keeps one shared timeline inside separate mobile and desktop layouts", async () => {
  const [componentSource, cssSource] = await Promise.all([
    readFile(new URL("../src/audio-studio/AudioStudio.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/audio-studio/audio-studio.css", import.meta.url), "utf8"),
  ]);
  assert.match(componentSource, /MobileAudioStudioLayout/);
  assert.match(componentSource, /DesktopAudioStudioLayout/);
  assert.match(componentSource, /function SimpleAudioTimeline/);
  assert.match(componentSource, /aria-label="모든 음원이 공유하는 시간축"/);
  assert.match(componentSource, /timelineDurationMs=\{timelineDurationMs\}/);
  assert.match(cssSource, /\.audioStudio\s*\{[^}]*max-width:\s*100%[^}]*overflow-x:\s*clip/s);
  assert.match(cssSource, /\.audioStudioSimpleTimeline\s*\{[^}]*min-width:\s*0[^}]*overflow:\s*hidden/s);
  assert.match(cssSource, /\.audioStudioSimpleTrack\s*\{[^}]*grid-template-columns:\s*236px minmax\(0, 1fr\)/s);
  assert.match(cssSource, /@media \(max-width:\s*767px\)/);
  assert.match(cssSource, /@media \(max-width:\s*767px\)[\s\S]*?\.audioStudioSimpleTrack\s*\{[^}]*display:\s*block/s);
});

test("Audio Studio opens a blank editor directly and saves only completed mixes", async () => {
  const [componentSource, hookSource] = await Promise.all([
    readFile(new URL("../src/audio-studio/AudioStudio.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/audio-studio/useAudioStudio.js", import.meta.url), "utf8"),
  ]);
  assert.match(componentSource, /data-audio-studio-screen="library"/);
  assert.doesNotMatch(componentSource, /data-audio-studio-screen="construct"/);
  assert.match(componentSource, /data-audio-studio-screen="edit"/);
  assert.match(componentSource, /multiple[\s\S]*type="file"/);
  assert.match(componentSource, /완성 음원 보관함/);
  assert.match(componentSource, /onClick=\{controller\.openEditor\}[\s\S]*?<span>편집실<\/span>/);
  assert.doesNotMatch(componentSource, /새 편집 시작|빈 편집실|오디오 파일로 시작|ProjectCreateDialog/);
  assert.match(componentSource, /controller\.savedMixes/);
  assert.match(componentSource, /controller\.downloadSavedMix/);
  assert.match(componentSource, /function MixSaveNameDialog/);
  assert.match(componentSource, /완성 음원 이름/);
  assert.match(componentSource, /await onSave\(name\)/);
  const router = componentSource.slice(componentSource.indexOf("function AudioStudioScreenRouter"), componentSource.indexOf("function MobileAudioStudioLayout"));
  assert.match(router, /return <SimpleWaveformEditor controller=\{controller\} mobile=\{mobile\} \/>/);
  assert.doesNotMatch(router, /MixerWorkspace|WorkspaceNavigation/);
  assert.doesNotMatch(componentSource, /연속 배치|개별 트랙 배치|배치 방식/);
  assert.match(hookSource, /AUDIO_STUDIO_IMPORT_MODES\.SEPARATE_TRACKS/);
  assert.match(hookSource, /각 파일은 별도 TRACK에 바로 배치/);
  assert.doesNotMatch(hookSource, /AUDIO_STUDIO_SCREENS\.CONSTRUCT|goToConstruction|finishConstruction/);
  assert.match(hookSource, /useState\(AUDIO_STUDIO_SCREENS\.LIBRARY\)/);
  const library = componentSource.match(/function AudioMixLibrary[\s\S]*?\n}/)?.[0] || "";
  assert.doesNotMatch(library, /trackCount|clipCount|loadProject/);
  assert.match(hookSource, /saveAudioStudioMix/);
  assert.match(hookSource, /getAudioStudioRenderedDurationMs/);
});

test("mobile Audio Studio fixes track controls left of aligned waveform lanes", async () => {
  const [componentSource, cssSource, runtimeSource] = await Promise.all([
    readFile(new URL("../src/audio-studio/AudioStudio.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/audio-studio/audio-studio.css", import.meta.url), "utf8"),
    readFile(new URL("../src/AppRuntime.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(componentSource, /audioStudioSimpleTopbar/);
  assert.match(componentSource, /audioStudioSimpleTrackLane/);
  assert.match(componentSource, /audioStudioSimplePlayer/);
  assert.match(componentSource, /createPortal\(dialog, document\.body\)/);
  assert.match(componentSource, /audio-studio-focus-mode/);
  assert.match(cssSource, /\.audioStudio--mobile\[data-audio-studio-focus="true"\]\s*\{[^}]*position:\s*fixed[^}]*height:\s*100dvh[^}]*overflow:\s*hidden/s);
  assert.match(cssSource, /body\.audio-studio-focus-mode main\.app\.audioStudioMode > \.hud\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(cssSource, /@media \(max-width:\s*767px\)[\s\S]*?\.audioStudioSimplePlayer\s*\{[^}]*position:\s*sticky[^}]*bottom:\s*0/s);
  assert.match(cssSource, /Mobile editor keeps track identity and controls in a fixed left column/);
  assert.match(cssSource, /\.audioStudioSimpleTopbar\s*\{[^}]*min-height:\s*50px[^}]*padding:\s*5px 7px/s);
  assert.match(cssSource, /\.audioStudioSimpleBack\s*\{[^}]*width:\s*38px[^}]*min-height:\s*38px/s);
  assert.match(cssSource, /\.audioStudioSimpleAdd\s*\{[^}]*min-height:\s*38px/s);
  assert.match(cssSource, /\.audioStudioSimpleRuler\s*\{[^}]*grid-template-columns:\s*clamp\(104px, 31vw, 122px\) minmax\(0, 1fr\)/s);
  assert.match(cssSource, /\.audioStudioSimpleRuler\s*\{[^}]*min-height:\s*28px/s);
  assert.match(cssSource, /\.audioStudioSimpleTrack\s*\{[^}]*display:\s*grid[^}]*min-height:\s*96px[^}]*grid-template-columns:\s*clamp\(104px, 31vw, 122px\) minmax\(0, 1fr\)/s);
  assert.match(cssSource, /\.audioStudioSimpleTrackHeader\s*\{[^}]*min-height:\s*96px[^}]*flex-direction:\s*column[^}]*justify-content:\s*flex-start[^}]*gap:\s*2px[^}]*border-right:\s*1px solid var\(--simple-line\)/s);
  assert.match(cssSource, /\.audioStudioSimpleTrackName > span\s*\{[^}]*display:\s*none/s);
  assert.match(cssSource, /\.audioStudioSimpleTrackLane\s*\{[^}]*min-height:\s*96px/s);
  assert.match(cssSource, /\.audioStudioSimpleClip > span\s*\{[^}]*width:\s*max-content[^}]*max-width:\s*none[^}]*font-size:\s*10px[^}]*font-weight:\s*850/s);
  assert.match(cssSource, /\.audioStudioSimpleTrackActions button span\s*\{[^}]*display:\s*none/s);
  assert.match(cssSource, /\.audioStudioOverlay\.audioStudioDialogBackdrop\s*\{[^}]*z-index:\s*2147483000/s);
  assert.match(cssSource, /\.audioStudioOverlay \.audioStudioDialog\.audioStudioSimpleTrimDialog\s*\{[^}]*max-height:\s*calc\(100dvh - 8px\)[^}]*overflow:\s*hidden/s);
  assert.match(cssSource, /\.audioStudioTrimStretchFields\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/s);
  assert.ok(runtimeSource.lastIndexOf("./audio-studio/audio-studio.css") > runtimeSource.lastIndexOf("./polish.css"));
});

test("Audio Studio presents each imported file as a movable waveform with the essential controls", async () => {
  const [componentSource, cssSource] = await Promise.all([
    readFile(new URL("../src/audio-studio/AudioStudio.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/audio-studio/audio-studio.css", import.meta.url), "utf8"),
  ]);
  const simpleSurface = componentSource.slice(componentSource.indexOf("function getSimpleClipWaveform"), componentSource.indexOf("function AudioStudioScreenRouter"));
  const trackSurface = componentSource.slice(componentSource.indexOf("function SimpleTrackRow"), componentSource.indexOf("function SimpleAudioTimeline"));
  const trimSurface = componentSource.slice(componentSource.indexOf("function SimpleTrimDialog"), componentSource.indexOf("function SimpleTrackRow"));
  assert.match(cssSource, /\.audioStudioSimpleClip\s*\{[^}]*position:\s*absolute[^}]*cursor:\s*grab/s);
  assert.match(cssSource, /\.audioStudioSimpleWaveform i,[\s\S]*?background:\s*#d8b47a/s);
  assert.match(componentSource, /function getDisplayWaveformPeaks\(peaks = \[\], bucketCount = 96\)/);
  assert.match(simpleSurface, />TRIM</);
  assert.match(simpleSurface, />삭제</);
  assert.match(simpleSurface, />VOL</);
  assert.doesNotMatch(trackSurface, /onStretch|>STRETCH</);
  assert.match(trackSurface, /Volume2/);
  assert.match(trackSurface, /VolumeX/);
  assert.match(trimSurface, /TIME STRETCH/);
  assert.match(trimSurface, /BPM 분석/);
  assert.match(simpleSurface, /좌우로 이동/);
  assert.match(simpleSurface, /controller\.updateTrack\(track\.id, \{ volume:/);
  assert.match(simpleSurface, /controller\.updateTrack\(track\.id, \{ mute:/);
  assert.match(simpleSurface, /onDelete=\{controller\.deleteTrack\}/);
});

test("Audio Studio keeps trim boundaries separate from timeline placement", async () => {
  const [componentSource, hookSource, cssSource] = await Promise.all([
    readFile(new URL("../src/audio-studio/AudioStudio.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/audio-studio/useAudioStudio.js", import.meta.url), "utf8"),
    readFile(new URL("../src/audio-studio/audio-studio.css", import.meta.url), "utf8"),
  ]);
  const simpleSurface = componentSource.slice(componentSource.indexOf("function SimpleTrimDialog"), componentSource.indexOf("function AudioStudioScreenRouter"));
  const trimApply = simpleSurface.slice(simpleSurface.indexOf("const applyTrim"), simpleSurface.indexOf("const dialog"));
  assert.match(trimApply, /sourceStartMs:\s*startMs/);
  assert.match(trimApply, /sourceEndMs:\s*endMs/);
  assert.match(trimApply, /durationMs:/);
  assert.doesNotMatch(trimApply, /timelineStartMs/);
  assert.match(simpleSurface, /const updatePosition[\s\S]*timelineStartMs:\s*nextStartMs/);
  assert.match(simpleSurface, /pointermove[\s\S]*setDragStartMs/);
  assert.match(simpleSurface, /양쪽 손잡이로 실제 사용할 구간을 정하세요/);
  assert.match(simpleSurface, /원본 구간으로 복원/);
  assert.match(simpleSurface, /선택 구간 미리듣기/);
  assert.match(hookSource, /AUDIO_STUDIO_IMPORT_MODES\.SEPARATE_TRACKS/);
  assert.match(cssSource, /\.audioStudioSimpleTrimHandle::after/);
});

test("Audio Studio renders only the simple shared player and final save flow", async () => {
  const [componentSource, hookSource] = await Promise.all([
    readFile(new URL("../src/audio-studio/AudioStudio.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/audio-studio/useAudioStudio.js", import.meta.url), "utf8"),
  ]);
  const simpleSurface = componentSource.slice(componentSource.indexOf("function getSimpleClipWaveform"), componentSource.indexOf("function AudioStudioScreenRouter"));
  assert.match(simpleSurface, /처음으로/);
  assert.match(simpleSurface, /playing \? controller\.pausePlayback : \(\) => controller\.startPlayback\(\)/);
  assert.match(simpleSurface, /전체 재생 위치/);
  assert.match(simpleSurface, /하나로 저장/);
  assert.doesNotMatch(simpleSurface, /COUNT-IN|REC|LOOP|SOLO|WorkspaceNavigation|MixerWorkspace/);
  assert.match(hookSource, /if \(screen !== AUDIO_STUDIO_SCREENS\.EDIT\) return/);
  assert.doesNotMatch(hookSource.slice(hookSource.indexOf("const onKeyDown = (event) =>"), hookSource.indexOf("window.addEventListener(\"keydown\"")), /copySelection|cutSelection|pasteSelection|duplicateSelection|Delete|Backspace/);
  assert.match(hookSource, /playSavedMix/);
});
