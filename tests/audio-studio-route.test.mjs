import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Audio Studio is a developer-only route and menu entry", async () => {
  const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(appSource, /AUDIO_STUDIO:\s*"audio-studio"/);
  assert.match(appSource, /AUDIO_STUDIO:\s*"#audio-studio"/);
  assert.match(appSource, /function isAudioStudioEnabled\(\)\s*\{\s*return import\.meta\.env\.DEV;/s);
  assert.match(appSource, /case APP_ROUTES\.AUDIO_STUDIO:[\s\S]*?isAudioStudioEnabled\(\)/);
  assert.match(appSource, /\{audioStudioEnabled \? \([\s\S]*?audioStudioMenuItem[\s\S]*?DEV[\s\S]*?TRACK CONSTRUCTION/);
  assert.match(appSource, /<AudioStudio active=\{appMode === APP_MODES\.AUDIO_STUDIO\} mobile=\{isMobileLayout\} \/>/);
});

test("Audio Studio owns horizontal timeline scrolling without widening the page", async () => {
  const [componentSource, cssSource] = await Promise.all([
    readFile(new URL("../src/audio-studio/AudioStudio.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/audio-studio/audio-studio.css", import.meta.url), "utf8"),
  ]);
  assert.match(componentSource, /MobileAudioStudioLayout/);
  assert.match(componentSource, /DesktopAudioStudioLayout/);
  assert.match(cssSource, /\.audioStudio\s*\{[^}]*max-width:\s*100%[^}]*overflow-x:\s*clip/s);
  assert.match(cssSource, /\.audioStudioTimelineScroller\s*\{[^}]*max-width:\s*100%[^}]*overflow-x:\s*auto/s);
  assert.match(cssSource, /\.audioStudioTrackHeader\s*\{[^}]*position:\s*sticky/s);
  assert.match(cssSource, /@media \(max-width:\s*767px\)/);
  assert.match(cssSource, /\.audioStudioWorkspaceNav\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(cssSource, /\.audioStudioRangeSelection[\s\S]*pointer-events:\s*none/);
  assert.match(cssSource, /\.audioStudioClipName\s*\{[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis[^}]*white-space:\s*nowrap/s);
  assert.match(cssSource, /\.audioStudioSourceName strong\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(componentSource, /AUDIO_STUDIO_SCREENS\.CONSTRUCT/);
  assert.match(componentSource, /AUDIO_STUDIO_SCREENS\.EDIT/);
  assert.match(componentSource, /function MobileAudioStudioLayout/);
});

test("Audio Studio separates the library, construction, and waveform editor roles", async () => {
  const [componentSource, hookSource] = await Promise.all([
    readFile(new URL("../src/audio-studio/AudioStudio.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/audio-studio/useAudioStudio.js", import.meta.url), "utf8"),
  ]);
  assert.match(componentSource, /data-audio-studio-screen="library"/);
  assert.match(componentSource, /data-audio-studio-screen="construct"/);
  assert.match(componentSource, /data-audio-studio-screen="edit"/);
  assert.match(componentSource, /multiple[\s\S]*type="file"/);
  assert.match(componentSource, /Project Library|프로젝트 보관함/);
  assert.match(componentSource, /파형 편집 시작/);
  assert.doesNotMatch(componentSource, /연속 배치|개별 트랙 배치|배치 방식/);
  assert.match(componentSource, /각 파일은 독립 Track과 Clip/);
  assert.match(hookSource, /useState\(AUDIO_STUDIO_SCREENS\.LIBRARY\)/);
  assert.match(hookSource, /setTimeout\([\s\S]*?700\)/);
  const workspaceNavigation = componentSource.match(/function WorkspaceNavigation[\s\S]*?\n}/)?.[0] || "";
  assert.doesNotMatch(workspaceNavigation, />믹서</);
});

test("mobile Audio Studio prioritizes the Timeline and owns focus-mode layers", async () => {
  const [componentSource, cssSource, runtimeSource] = await Promise.all([
    readFile(new URL("../src/audio-studio/AudioStudio.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/audio-studio/audio-studio.css", import.meta.url), "utf8"),
    readFile(new URL("../src/AppRuntime.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(componentSource, /audioStudioMobileTimelineToolbar/);
  assert.match(componentSource, /audioStudioMobileTimelineStage/);
  assert.match(componentSource, /audioStudioMobileContextToolbar/);
  assert.match(componentSource, /audioStudioInspectorSheetLayer/);
  assert.match(componentSource, /createPortal\(dialog, document\.body\)/);
  assert.match(componentSource, /audio-studio-focus-mode/);
  assert.match(cssSource, /\.audioStudio--mobile\[data-audio-studio-focus="true"\]\s*\{[^}]*position:\s*fixed[^}]*height:\s*100dvh[^}]*overflow:\s*hidden/s);
  assert.match(cssSource, /body\.audio-studio-focus-mode main\.app\.audioStudioMode > \.hud\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(cssSource, /\.audioStudioMobileTimelineStage\s*\{[^}]*flex:\s*1 1 auto[^}]*overflow:\s*hidden/s);
  assert.match(cssSource, /\.audioStudioInspectorSheet\s*\{[^}]*max-height:\s*min\(72dvh, 620px\)[^}]*overflow-y:\s*auto/s);
  assert.match(cssSource, /\.audioStudioOverlay\.audioStudioDialogBackdrop\s*\{[^}]*z-index:\s*2147483000/s);
  assert.ok(runtimeSource.lastIndexOf("./audio-studio/audio-studio.css") > runtimeSource.lastIndexOf("./polish.css"));
});

test("Audio Studio keeps clips waveform-first instead of inheriting solid control surfaces", async () => {
  const [componentSource, cssSource] = await Promise.all([
    readFile(new URL("../src/audio-studio/AudioStudio.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/audio-studio/audio-studio.css", import.meta.url), "utf8"),
  ]);
  assert.match(cssSource, /button\.audioStudioClip\s*\{[^}]*background:\s*rgb\(104 133 84 \/ 16%\)\s*!important/s);
  assert.match(cssSource, /\.audioStudioWaveform::before\s*\{[^}]*top:\s*50%[^}]*height:\s*1px/s);
  assert.match(cssSource, /\.audioStudioWaveform\s*\{[^}]*height:\s*43px[^}]*opacity:\s*1/s);
  assert.match(componentSource, /function getDisplayWaveformPeaks\(peaks = \[\], bucketCount = 96\)/);
  assert.match(componentSource, /const waveformBucketCount = Math\.max\(8, Math\.min\(mobile \? 64 : 128,[\s\S]*?getDisplayWaveformPeaks\(source\?\.waveformPeaks, waveformBucketCount\)/);
  assert.match(componentSource, /audioStudioTrackLaneEmpty[\s\S]*오디오가 없습니다/);
  assert.match(componentSource, /<b>TRACK \{trackIndex \+ 1\}<\/b>/);
  assert.match(componentSource, /<span>VOL<\/span>/);
  assert.match(cssSource, /\.audioStudioMobileContextToolbar > div\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s);
  assert.match(cssSource, /--studio-bg:\s*#241f1a/);
  assert.doesNotMatch(cssSource, /--studio-bg:\s*#0c0f12/);
});

test("Audio Studio import fits the project, closes add UI, and keeps the performance editor practical", async () => {
  const [componentSource, hookSource, cssSource] = await Promise.all([
    readFile(new URL("../src/audio-studio/AudioStudio.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/audio-studio/useAudioStudio.js", import.meta.url), "utf8"),
    readFile(new URL("../src/audio-studio/audio-studio.css", import.meta.url), "utf8"),
  ]);
  assert.match(hookSource, /setFitProjectRequestId\(\(value\) => value \+ 1\)/);
  assert.match(hookSource, /pixelsPerSecond:\s*Math\.max\(0\.02, Math\.min\(320/);
  assert.match(componentSource, /querySelectorAll\("details\[open\]"\)[\s\S]*removeAttribute\("open"\)/);
  assert.match(componentSource, /addMenuRef\.current\?\.removeAttribute\("open"\)/);
  assert.match(componentSource, /파형 분석 중\.\.\./);
  assert.match(componentSource, /const availableWidth = Math\.max\(80, scroller\.clientWidth - headerWidth - 4\)/);
  assert.match(componentSource, /anchorTimeMs[\s\S]*scroller\.scrollLeft/);
  assert.match(componentSource, /파일 가져오기[\s\S]*바로 녹음하기/);
  assert.match(componentSource, /PROJECT BPM/);
  assert.doesNotMatch(componentSource, /<span>PAN<\/span>/);
  assert.doesNotMatch(componentSource, /Ripple \{/);
});

test("Audio Studio exposes overdub recording and direct waveform range editing", async () => {
  const [componentSource, hookSource] = await Promise.all([
    readFile(new URL("../src/audio-studio/AudioStudio.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/audio-studio/useAudioStudio.js", import.meta.url), "utf8"),
  ]);
  assert.match(componentSource, /beginWaveformRangeSelection/);
  assert.match(componentSource, /선택 구간 시작 조절/);
  assert.match(componentSource, /controller\.trimRangeSelection/);
  assert.match(componentSource, /controller\.deleteRangeSelection/);
  assert.match(componentSource, /controller\.duplicateRangeSelection/);
  assert.match(componentSource, /controller\.loopRangeSelection/);
  assert.match(hookSource, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(hookSource, /new window\.MediaRecorder/);
  assert.match(hookSource, /startPlayback\(recordingTimelineStartRef\.current\)/);
  assert.match(hookSource, /countInBars/);
  assert.match(hookSource, /playSavedProject/);
});
