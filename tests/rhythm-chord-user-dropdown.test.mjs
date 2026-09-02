import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSourceUrl = new URL("../src/App.jsx", import.meta.url);
const appStyleUrl = new URL("../src/style.css", import.meta.url);
const appPolishUrl = new URL("../src/polish.css", import.meta.url);
const desktopStyleUrl = new URL("../src/layouts/desktop-layout.css", import.meta.url);

test("rhythm chord user dropdown exposes bulk selection, locking, and confirmed deletion", async () => {
  const [appSource, appCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(appStyleUrl, "utf8"),
  ]);

  assert.match(appSource, /onDeleteOption=\{requestDeleteStage3StorageItem\}/);
  assert.match(appSource, /onDeleteSelectedOptions=\{requestDeleteSelectedStage3StorageItems\}/);
  assert.match(appSource, /onToggleOptionLock=\{toggleStage3StorageItemLock\}/);
  assert.match(appSource, /onToggleOptionSelection=\{toggleStage3UserSelection\}/);
  assert.match(appSource, /selectedOptionIds=\{stage3UserSelectedIds\}/);
  assert.match(appSource, /deletable: true/);
  assert.match(appSource, /role="checkbox"/);
  assert.match(appSource, /className="metronomeSelectOptionDelete"/);
  assert.match(appSource, /className=\{`metronomeSelectOptionLock/);
  assert.match(appSource, /onDeleteOption\(option\.id\)/);
  assert.match(appSource, /선택 삭제/);
  assert.match(appSource, /삭제하시겠습니까\?/);
  assert.match(appSource, /Stage3SavedProgressionDeleteConfirmDialog/);
  assert.match(appCss, /\.metronomeSelectPortal\.stage3UserLoadSelect \.metronomeSelectOptionRow/);
  assert.match(appCss, /\.metronomeSelectPortal\.stage3UserLoadSelect \.metronomeSelectManagementToolbar/);
  assert.match(appCss, /\.metronomeSelectPortal\.stage3UserLoadSelect \.metronomeSelectOptionLock/);
  assert.match(appCss, /\.metronomeSelectPortal\.stage3UserLoadSelect \.metronomeSelectOptionDelete/);
  assert.match(appCss, /\.stage3SavedDeleteConfirmLayer/);
});

test("user progression management opens on edit and reveals individual actions by swipe", async () => {
  const [appSource, appCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(appStyleUrl, "utf8"),
  ]);
  const pickerStart = appSource.indexOf('className="stage3LoadSelect stage3UserLoadSelect"');
  const pickerEnd = appSource.indexOf('className="stage3StorageMoveButton"', pickerStart);
  const pickerSource = appSource.slice(pickerStart, pickerEnd);

  assert.ok(pickerStart >= 0 && pickerEnd > pickerStart);
  assert.match(pickerSource, /managedListMode/);
  assert.match(pickerSource, /panelDirectionIndicator/);
  assert.match(pickerSource, /onSelectAllOptions=\{selectAllStage3UnlockedUserItems\}/);
  assert.match(appSource, /setStage3UserSelectedIds\(stage3QuickSlots\.filter\(\(slot\) => !slot\.locked\)\.map/);
  assert.match(appSource, /managementEditing \? \(/);
  assert.match(appSource, />\s*편집\s*</);
  assert.match(appSource, />\s*전체 선택\s*</);
  assert.match(appSource, />\s*선택 해제\s*</);
  assert.match(appSource, />\s*선택 삭제\s*</);
  assert.match(appSource, /isBulkSelected \? <span aria-hidden="true">✓<\/span>/);
  assert.match(appSource, /metronomeSelectOptionRow--swipe/);
  assert.match(appSource, /--option-swipe-offset/);
  assert.match(appSource, /metronomeSelectOptionActionRail/);
  assert.match(appCss, /metronomeSelectControl--managedList[\s\S]*\.metronomeSelectManagementToolbar\.editing/);
  assert.match(appCss, /\.metronomeSelectOptionRow--swipe/);
  assert.match(appCss, /\.actionsRevealed, \.swiping/);
  assert.match(
    appCss,
    /@media \(max-width: 767px\)[\s\S]*?\.metronomeSelectOptionActionRail \{[\s\S]*?z-index: 2;[\s\S]*?transform: translateX\(calc\(78px \+ var\(--option-swipe-offset, 0px\)\)\)/,
  );
  assert.match(
    appCss,
    /\.metronomeSelectOptionRowContent \{[\s\S]*?transform: none;[\s\S]*?transition: none;/,
  );
});

test("mobile rhythm practice collapses the empty navigation HUD above the fretboard", async () => {
  const polishCss = await readFile(appPolishUrl, "utf8");

  assert.match(
    polishCss,
    /practiceMode:has\(> \.chordTransitionPanel\) > \.hud \{[\s\S]*?height: 0 !important;[\s\S]*?padding: 0 !important;[\s\S]*?overflow: visible !important;/,
  );
  assert.match(
    polishCss,
    /practiceMode:has\(> \.chordTransitionPanel\) \{[\s\S]*?grid-template-rows: 0 auto !important;[\s\S]*?align-content: start !important;[\s\S]*?gap: 0 !important;/,
  );
});

test("mobile rhythm progression readout fits four complete measures per row", async () => {
  const appCss = await readFile(appStyleUrl, "utf8");

  assert.match(
    appCss,
    /Mobile readout keeps four complete measures[\s\S]*@media \(max-width: 767px\)[\s\S]*?\.chordTransitionChart \.currentProgressionReadout \{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important/,
  );
  assert.match(
    appCss,
    /\.chordTransitionChart \.currentProgressionReadout \.rhythmChordMeasure > button[\s\S]*?flex: var\(--rhythm-chord-beats, 1\) 1 0 !important;[\s\S]*?min-width: 0 !important/,
  );
});

test("desktop rhythm practice shows empty measures while mobile keeps its compact prompt", async () => {
  const [appSource, appCss, desktopCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(appStyleUrl, "utf8"),
    readFile(desktopStyleUrl, "utf8"),
  ]);

  assert.match(
    appSource,
    /<aside className="referenceFretboard chordTransitionChart"[\s\S]*?\{hasChordTransitionProgression \? \([\s\S]*?<div className="referenceHeader stage3ProgressionHeader">/,
  );
  assert.doesNotMatch(appSource, /<small>추천 또는 사용자 진행을 선택해주세요<\/small>/);
  assert.doesNotMatch(appSource, /stage3ProgressionHeader--empty/);
  assert.doesNotMatch(appSource, /className="stage3ProgressionEmptyState"/);
  assert.match(appSource, /\{isMobileLayout && !hasChordTransitionProgression \? \([\s\S]*?className="stage3EmptyFretboardPrompt"/);
  assert.match(
    appSource,
    /\{!hasChordTransitionProgression \? \([\s\S]*?className="currentProgressionReadout stage3EmptyProgressionReadout"[\s\S]*?Array\.from\(\{ length: landscapePlayFocus \? 8 : 4 \}/,
  );
  assert.match(
    desktopCss,
    /\.stage3EmptyProgressionReadout \{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important;[\s\S]*?width: var\(--desktop-stage3-work-width\) !important;/,
  );
  assert.match(
    appCss,
    /\.stage3EmptyProgressionReadout \{[\s\S]*?height: 29px !important;[\s\S]*?\.stage3EmptyProgressionMeasure \{[\s\S]*?min-height: 29px !important;/,
  );
  assert.match(
    appCss,
    /@media \(max-width: 720px\)[\s\S]*?\.stage3StorageDialog \.stage3StorageComposer \{[\s\S]*?align-content: start !important;[\s\S]*?grid-auto-rows: max-content !important;/,
  );
});

test("desktop rhythm practice keeps the fretboard near the progression and opens load menus downward", async () => {
  const [appSource, desktopCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(desktopStyleUrl, "utf8"),
  ]);
  const recommendedStart = appSource.indexOf('className="stage3LoadSelect stage3RecommendedLoadSelect"');
  const recommendedEnd = appSource.indexOf('className="stage3LoadSelect stage3UserLoadSelect"', recommendedStart);
  const userEnd = appSource.indexOf('className="stage3StorageMoveButton"', recommendedEnd);
  const recommendedPicker = appSource.slice(recommendedStart, recommendedEnd);
  const userPicker = appSource.slice(recommendedEnd, userEnd);

  assert.ok(recommendedStart >= 0 && recommendedEnd > recommendedStart && userEnd > recommendedEnd);
  assert.match(recommendedPicker, /dropdownDirection=\{!isMobileLayout \|\| landscapePlayFocus \? "down" : "up"\}/);
  assert.match(userPicker, /dropdownDirection=\{!isMobileLayout \|\| landscapePlayFocus \? "down" : "up"\}/);
  assert.match(
    desktopCss,
    /> \.chordTransitionPanel \.stageChordSharedFretboard \{[\s\S]*?grid-row: 3;[\s\S]*?align-self: stretch;/,
  );
  assert.match(desktopCss, /--desktop-stage3-work-width: 100%/);
  assert.match(desktopCss, /--desktop-stage3-progression-width: 96%/);
  assert.match(desktopCss, /\.stage3ProgressionHeader \{[\s\S]*?width: var\(--desktop-stage3-progression-width\) !important/);
  assert.match(desktopCss, /\.stageChordSharedFretboard \{[\s\S]*?width: var\(--desktop-stage3-work-width\) !important/);
  assert.match(
    desktopCss,
    /\.stage3ProgressHud \{[\s\S]*?grid-template-columns: var\(--desktop-stage3-hud-rail\) minmax\(0, 1fr\) var\(--desktop-stage3-hud-rail\) !important;[\s\S]*?width: var\(--desktop-stage3-work-width\) !important/,
  );
  assert.match(desktopCss, /\.stage3ReferenceBeatMetronomeStrip \{[\s\S]*?grid-column: 2 !important/);
  assert.match(
    desktopCss,
    /\.stage3StandaloneTransportDeck \.stage3StandaloneBpmActionPanel::before \{[\s\S]*?display: none !important;[\s\S]*?content: none !important;/,
  );
  assert.match(
    desktopCss,
    /\.stage3ProgressionHeader \.rhythmChordMeasure::before \{[\s\S]*?color: var\(--riff-text-strong\);[\s\S]*?font-weight: 1000;/,
  );
  assert.match(
    desktopCss,
    /\.stage3ProgressionHeader \.rhythmChordMeasure::after \{[\s\S]*?border-bottom: 2px solid var\(--riff-border-selected\);[\s\S]*?border-right: 2px solid var\(--riff-border-selected\);[\s\S]*?border-radius: 0 0 4px;/,
  );
  assert.match(
    desktopCss,
    /\.stage3ProgressionHeader \.rhythmChordMeasure > button > span \{[\s\S]*?font-weight: 950 !important;/,
  );
});

test("rhythm progression clicks seek the prepared backing clock without rebuilding it", async () => {
  const [appSource, desktopCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(desktopStyleUrl, "utf8"),
  ]);
  const seekStart = appSource.indexOf("const setStage3ProgressIndex = useCallback");
  const seekEnd = appSource.indexOf("const exitStage3StorageRoom", seekStart);
  const seekSource = appSource.slice(seekStart, seekEnd);
  const schedulerStart = appSource.indexOf("const startBackingScheduler = useCallback");
  const schedulerEnd = appSource.indexOf("const stopMetronomeVisualLab", schedulerStart);
  const schedulerSource = appSource.slice(schedulerStart, schedulerEnd);
  const frameStart = appSource.indexOf("const runChordTransitionFrame = useCallback");
  const frameEnd = appSource.indexOf("const runMetronomeFrame", frameStart);
  const frameSource = appSource.slice(frameStart, frameEnd);

  assert.ok(seekStart >= 0 && seekEnd > seekStart && schedulerEnd > schedulerStart && frameEnd > frameStart);
  assert.match(seekSource, /getRhythmChordStartBeat\(chordTransitionBeatTimeline, safeIndex\)/);
  assert.match(seekSource, /gameStateRef\.current === GAME_STATES\.PLAYING && !countInActiveRef\.current/);
  assert.match(seekSource, /stage3PlaybackSeekRef\.current\?\.\(safeIndex\)/);
  assert.match(schedulerSource, /stage3PlaybackSeekRef\.current = seekStage3Playback/);
  assert.match(schedulerSource, /startBackingScheduler\(index, BACKING_SCHEDULER_MODES\.STAGE3\)/);
  assert.match(schedulerSource, /backingDisplayStartTimeRef\.current = audio\.currentTime - safeStartOffset/);
  assert.match(frameSource, /const startBeat = getRhythmChordStartBeat\([\s\S]*?chordPracticeIndexRef\.current/);
  assert.match(frameSource, /gameTimeRef\.current = startBeat \* currentBeatMs/);
  assert.match(
    desktopCss,
    /\.stage3ProgressionHeader \.rhythmChordMeasure \{[\s\S]*?flex: 0 0 calc\([\s\S]*?var\(--desktop-stage3-progression-gap\)[\s\S]*?min-height: 84px !important;/,
  );
});

test("saved rhythm progressions have one shared load path and an explicit storage-room load action", async () => {
  const [appSource, desktopCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(desktopStyleUrl, "utf8"),
  ]);
  const loaderStart = appSource.indexOf("const loadStage3LibraryItem = useCallback");
  const loaderEnd = appSource.indexOf("const stage3DesktopMetronomeSoundToggle", loaderStart);
  const loaderSource = appSource.slice(loaderStart, loaderEnd);

  assert.ok(loaderStart >= 0 && loaderEnd > loaderStart);
  assert.match(loaderSource, /if \(closeStorage\) exitStage3StorageRoom\(\);[\s\S]*?applyStage3LibraryItem\(item\)/);
  assert.match(loaderSource, /applyStage3LibraryItem\(item\)/);
  assert.match(loaderSource, /prepareStage3BackingSession\(/);
  assert.match(appSource, /onClick=\{\(\) => loadStage3LibraryItem\(selectedStage3StorageItem, \{ closeStorage: true \}\)\}/);
  assert.match(appSource, />\s*불러오기\s*</);
  assert.match(appSource, /\{!isDesktopLayout \? stage3StorageComposerActions : null\}/);
  assert.match(appSource, /\{isDesktopLayout \? stage3StorageComposerActions : null\}/);
  assert.match(
    desktopCss,
    /stage3StorageDialogLayer[\s\S]*?grid-template-rows: minmax\(0, 1fr\) auto !important;[\s\S]*?> \.stage3StorageComposerActions/,
  );
});

test("saved progression rows preserve normal clicks until a horizontal swipe starts", async () => {
  const appSource = await readFile(appSourceUrl, "utf8");
  const rowStart = appSource.indexOf("metronomeSelectOptionRow metronomeSelectOptionRow--swipe");
  const rowEnd = appSource.indexOf('style={{ "--option-swipe-offset"', rowStart);
  const rowSource = appSource.slice(rowStart, rowEnd);
  const pointerDownStart = rowSource.indexOf("onPointerDown={(event) => {");
  const pointerMoveStart = rowSource.indexOf("onPointerMove={(event) => {");
  const pointerDownSource = rowSource.slice(pointerDownStart, pointerMoveStart);
  const pointerMoveSource = rowSource.slice(pointerMoveStart);

  assert.ok(rowStart >= 0 && rowEnd > rowStart && pointerDownStart >= 0 && pointerMoveStart > pointerDownStart);
  assert.doesNotMatch(pointerDownSource, /setPointerCapture/);
  assert.match(pointerMoveSource, /gesture\.horizontal = true;[\s\S]*?setPointerCapture/);
});

test("rhythm chord saved-setting lock survives storage migration and blocks destructive paths", async () => {
  const appSource = await readFile(appSourceUrl, "utf8");

  assert.match(appSource, /locked = false/);
  assert.match(appSource, /locked: Boolean\(locked\)/);
  assert.match(appSource, /locked: slot\?\.locked/);
  assert.match(appSource, /!slot\.locked && !isStage3RecommendedItem/);
  assert.match(appSource, /locked: !slot\.locked/);
  assert.match(appSource, /잠금을 해제해야 삭제할 수 있습니다/);
});

test("rhythm storage uses a themed trigger-width dropdown instead of the native select popup", async () => {
  const [appSource, appCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(appStyleUrl, "utf8"),
  ]);
  const storagePickerStart = appSource.indexOf('className="stage3StorageLoadSelect"');
  const storagePickerEnd = appSource.indexOf('<div className="stage3StorageChordBuilder"', storagePickerStart);
  const storagePickerSource = appSource.slice(storagePickerStart, storagePickerEnd);

  assert.ok(storagePickerStart >= 0 && storagePickerEnd > storagePickerStart);
  assert.match(appSource, /matchTriggerWidth = false/);
  assert.match(storagePickerSource, /dropdownDirection="down"/);
  assert.match(storagePickerSource, /matchTriggerWidth/);
  assert.doesNotMatch(storagePickerSource, /<select/);
  assert.match(appCss, /> \.metronomeSelectPortal\.stage3StorageLoadSelect \{[\s\S]*?z-index: 7200 !important/);
  assert.match(appCss, /\.metronomeSelectPortal\.stage3StorageLoadSelect \.metronomeSelectMenu/);
  assert.match(appCss, /\.stage3StorageLoadSelect \.metronomeSelectButton/);
  assert.match(
    appCss,
    /\.stage3StorageTopBar \.stage3StorageLoadSelect\.metronomeSelectControl \{[\s\S]*?border: 0 !important;[\s\S]*?background: transparent !important;[\s\S]*?box-shadow: none !important;/,
  );
  assert.match(
    appCss,
    /Opening the delete control must not visually lift or enlarge the note marker[\s\S]*?\.delete-menu-open \{[\s\S]*?outline: 0 !important;/,
  );
  assert.match(
    appCss,
    /Storage fret cells are invisible hit targets[\s\S]*?fretboardEditCell:is\(:hover, :focus, :focus-visible, :active\)[\s\S]*?outline: 0 !important;[\s\S]*?transform: translate\(-50%, -50%\) !important;/,
  );
  assert.match(
    appCss,
    /Keep note markers geometrically fixed[\s\S]*?:is\(:hover, :focus, :focus-visible, :active, \.delete-menu-open\)[\s\S]*?transition: none !important;[\s\S]*?transform: translate\(-50%, -50%\) !important;/,
  );
  assert.match(
    appCss,
    /stage3ChordMiniReferenceFretboard \.fretboardNoteChip\.root \{[\s\S]*?min-width: 27px !important;[\s\S]*?height: 20px !important;[\s\S]*?outline: 0 !important;/,
  );
  assert.match(
    appCss,
    /stage3ChordMiniReferenceFretboard\.fretboardComponent--editable button\.fretboardNoteDeleteButton \{[\s\S]*?width: 20px !important;[\s\S]*?height: 20px !important;[\s\S]*?font-size: 13px !important;/,
  );
  assert.match(
    appCss,
    /stage3ChordMiniReferenceFretboard \.fretboardNoteChip b \{[\s\S]*?font-size: 10px !important;/,
  );
  assert.match(appCss, /\.fretboardBarre--editable \{[\s\S]*?z-index: 4 !important;[\s\S]*?pointer-events: auto !important;/);
  assert.match(appCss, /\.fretboardBarre--editable \{[\s\S]*?background: rgba\(45, 212, 191, 0\.42\) !important;[\s\S]*?color: #e0f2fe !important;/);
  assert.match(appCss, /button\.fretboardBarreDeleteButton \{[\s\S]*?width: 20px !important;[\s\S]*?height: 20px !important;/);
});

test("rhythm chord saved-setting deletion remains persisted by shared quick-slot state", async () => {
  const appSource = await readFile(appSourceUrl, "utf8");

  assert.match(appSource, /setStage3QuickSlots\(next\)/);
  assert.match(
    appSource,
    /window\.localStorage\.setItem\(STAGE3_QUICK_SLOTS_KEY, JSON\.stringify\(stage3QuickSlots\)\)/,
  );
});

test("recommended rhythm progressions use compact title-only dropdown labels", async () => {
  const appSource = await readFile(appSourceUrl, "utf8");
  const pickerStart = appSource.indexOf('className="stage3LoadSelect stage3RecommendedLoadSelect"');
  const pickerEnd = appSource.indexOf('className="stage3LoadSelect stage3UserLoadSelect"', pickerStart);
  const pickerSource = appSource.slice(pickerStart, pickerEnd);

  assert.ok(pickerStart >= 0 && pickerEnd > pickerStart);
  assert.match(pickerSource, /matchTriggerWidth/);
  assert.match(pickerSource, /label: item\.title \|\| "추천 진행"/);
  assert.doesNotMatch(pickerSource, /getStage3DropdownLabel\(item\)/);
});

test("rhythm storage asks for a save title and falls back to the chord progression", async () => {
  const [appSource, appCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(appStyleUrl, "utf8"),
  ]);

  assert.match(appSource, /function Stage3StorageSaveTitleDialog/);
  assert.match(appSource, /placeholder=\{defaultTitle\}/);
  assert.match(appSource, /입력하지 않으면 흐리게 표시된 코드 진행으로 저장됩니다/);
  assert.match(appSource, /const defaultTitle = getChordProgressionText\(chordIdsForSave\) \|\| "내 진행"/);
  assert.match(appSource, /title: String\(title \|\| ""\)\.trim\(\) \|\| defaultTitle/);
  assert.match(appSource, /onClick=\{requestSaveStage3StorageItem\}/);
  assert.match(appSource, /<Stage3StorageSaveTitleDialog/);
  assert.match(appCss, /\.stage3StorageSaveTitleDialog \{/);
  assert.match(appCss, /\.stage3StorageSaveTitleField input::placeholder \{/);
});

test("rhythm storage starts on C and returns to practice after a completed save", async () => {
  const appSource = await readFile(appSourceUrl, "utf8");
  const openStart = appSource.indexOf("const openStage3Storage = useCallback");
  const openEnd = appSource.indexOf("const getStage3StorageChordIdsWithActiveDraft", openStart);
  const confirmStart = appSource.indexOf("const confirmStage3StorageSave = useCallback");
  const confirmEnd = appSource.indexOf("const addStage3StrumPatternDraft", confirmStart);

  assert.ok(openStart >= 0 && openEnd > openStart);
  assert.ok(confirmStart >= 0 && confirmEnd > confirmStart);
  assert.match(appSource.slice(openStart, openEnd), /applyStage3StorageChordSelection\("C", "natural", "major", "none"\)/);
  assert.match(
    appSource.slice(confirmStart, confirmEnd),
    /const savedItem = saveStage3StorageItem\([\s\S]*?exitStage3StorageRoom\(\);[\s\S]*?applyStage3LibraryItem\(savedItem\)/,
  );
  assert.match(appSource, /const closeStage3StorageRoom = exitStage3StorageRoom/);
});

test("desktop rhythm storage assigns and persists strum patterns by progression row", async () => {
  const [appSource, desktopCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(desktopStyleUrl, "utf8"),
  ]);
  const saveStart = appSource.indexOf("const saveStage3StorageItem = useCallback");
  const saveEnd = appSource.indexOf("const requestSaveStage3StorageItem", saveStart);
  const saveSource = appSource.slice(saveStart, saveEnd);

  assert.ok(saveStart >= 0 && saveEnd > saveStart);
  assert.match(appSource, /const stage3StorageStrumRows = useMemo/);
  assert.match(appSource, /nextGroups\[slotIndex\] = normalizedPattern/);
  assert.match(appSource, /\{isDesktopLayout \? "추가1열" : "추가1"\}/);
  assert.match(appSource, /\{isDesktopLayout \? "추가2열" : "추가2"\}/);
  assert.match(appSource, /aria-label="진행순서 열별 주법"/);
  assert.match(appSource, /data-progression-row=\{rowIndex \+ 1\}/);
  assert.match(appSource, /stage3StorageStrumRows\.some\(\(row\) => row\.length\)/);
  assert.doesNotMatch(appSource, /<small>미지정<\/small>/);
  assert.match(saveSource, /strum_pattern: currentStrumPattern/);
  assert.match(saveSource, /strumPattern: currentStrumPattern/);
  assert.match(saveSource, /strumSlots: currentStrumPattern/);
  assert.match(saveSource, /return saveData/);
  assert.match(
    desktopCss,
    /\.stage3ProgressionStrumAssignments \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important;/,
  );
  assert.match(desktopCss, /\.stage3ProgressionStrumAssignment\[data-progression-row="1"\] \{[\s\S]*?grid-column: 1 !important;/);
  assert.match(desktopCss, /\.stage3ProgressionStrumAssignment\[data-progression-row="2"\] \{[\s\S]*?grid-column: 2 !important;/);
});

test("desktop rhythm storage uses a compact top bar and a taller centered fretboard", async () => {
  const [appSource, desktopCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(desktopStyleUrl, "utf8"),
  ]);

  assert.match(desktopCss, /height: min\(calc\(100dvh - 24px\), 760px\) !important/);
  assert.match(
    appSource,
    /\{!isDesktopLayout \? \([\s\S]*?className="stage3StorageDialogHeading"[\s\S]*?\) : null\}[\s\S]*?className="stage3StorageTopBar"/,
  );
  assert.match(
    appSource,
    /className="stage3StorageTopBar"[\s\S]*?className="stage3StorageLoadSelect"[\s\S]*?\{isDesktopLayout \? \([\s\S]*?className="stage3StorageTopBarClose"/,
  );
  assert.match(
    desktopCss,
    /> \.stage3StorageComposer \{[\s\S]*?align-content: start !important;[\s\S]*?grid-auto-rows: max-content !important;[\s\S]*?padding: 6px 12px !important;[\s\S]*?overflow: hidden !important;/,
  );
  assert.match(
    desktopCss,
    /\.stage3ChordBuilderPanel \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) !important;[\s\S]*?column-gap: 0 !important;/,
  );
  assert.match(desktopCss, /\.stage3StorageTopBar \{[\s\S]*?grid-template-columns: minmax\(240px, 420px\) 30px !important;/);
  assert.match(desktopCss, /\.stage3StorageTopBarClose \{[\s\S]*?width: 30px !important;[\s\S]*?height: 30px !important;/);
  assert.match(desktopCss, /--fretboard-board-height: 174px/);
  assert.match(desktopCss, /width: min\(680px, 78%\) !important/);
  assert.match(desktopCss, /height: 208px !important/);
  assert.match(desktopCss, /min-height: 44px !important/);
});

test("LOAD chord builder follows fretboard options and selects a region with an integrated mini fretboard", async () => {
  const [appSource, appCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(appStyleUrl, "utf8"),
  ]);

  assert.doesNotMatch(appSource, /개의 사용자 진행|새 코드 진행을 만들어 저장해보세요/);
  assert.match(appSource, /className="stage3ChordBuilderPanel"/);
  assert.doesNotMatch(appSource, /className="stage3ChordBuilderPanel chordBuilderPanel chordBuilderPanel--composer"/);
  assert.match(appSource, /className="stage3ChordMiniReference"/);
  assert.match(appSource, /className="stageChordSharedFretboard stage3ChordMiniReferenceFretboard fitRange"/);
  assert.doesNotMatch(appSource, />미니 참고지판</);
  assert.match(appSource, /initialFretboard=\{stage3StorageInitialFretboard\}/);
  assert.match(appSource, /<ChordBuilderOptionSection layout="cols-5" showTitle title="구간">/);
  assert.match(appSource, /<ChordBuilderOptionSection layout="cols-3" showTitle title="변환">/);
  assert.match(appSource, /<ChordBuilderOptionSection layout="cols-4" showTitle title="타입">/);
  assert.match(appSource, /<ChordBuilderOptionSection layout="tensions-2row" showTitle title="확장">/);
  assert.match(appSource, /<ChordBuilderOptionSection layout="cols-7" showTitle title="루트">/);
  assert.match(appSource, /CHORD_VIEWER_POSITIONS\.map\(\(position\) =>/);
  assert.match(
    appSource,
    /title="구간">[\s\S]*?title="루트">[\s\S]*?title="변환">[\s\S]*?title="타입">[\s\S]*?title="확장">/,
  );
  assert.match(appCss, /\.stage3StorageRoom \.stage3ChordBuilderPanel/);
  assert.match(appCss, /\.stage3StorageRoom \.stage3ChordBuilderPanel \.chordBuilderChipGrid/);
  assert.match(appCss, /\.stage3StorageDialog\.stage3StorageRoom \.stage3StorageChordBuilder \{[\s\S]*?background: transparent !important/);
  assert.match(appCss, /max-height: min\(calc\(100dvh - 12px\), 860px\) !important/);
  assert.match(appCss, /height: min\(calc\(100dvh - 12px\), 860px\) !important/);
  assert.match(
    appCss,
    /\.stage3StorageDialog \.stage3StorageComposer \{[\s\S]*?height: 100% !important;[\s\S]*?max-height: none !important;[\s\S]*?scroll-padding-bottom:/,
  );
  assert.match(appCss, /\.stage3StorageRoom \.stage3ChordMiniReferenceFretboard\.fitRange/);
  assert.match(appCss, /--fretboard-label-left: 22px/);
  assert.match(
    appCss,
    /\.stage3ChordMiniReferenceFretboard \.fretboardStringState \{[\s\S]*?left: -10px !important/,
  );
  assert.match(
    appCss,
    /\.stage3ChordBuilderPanel \.chordBuilderOptionSection \{[\s\S]*?background: transparent !important;[\s\S]*?box-shadow: none !important/,
  );
  assert.match(appCss, /@media \(min-width: 1024px\)[\s\S]*\.stage3ChordBuilderPanel/);
});

test("LOAD strum beats use glyph-only warm on and ivory off states", async () => {
  const appCss = await readFile(appStyleUrl, "utf8");

  assert.match(appCss, /LOAD strum language: color the glyph only, like an on\/off indicator/);
  assert.match(appCss, /\.strumPatternStep \{[\s\S]*?border: 0 !important;[\s\S]*?background: transparent !important;[\s\S]*?box-shadow: none !important/);
  assert.match(appCss, /\.strumPatternStep\.hit \{[\s\S]*?background: transparent !important;[\s\S]*?color: #f1ca7a !important/);
  assert.match(appCss, /\.strumPatternStep\.ghost \{[\s\S]*?background: transparent !important;[\s\S]*?color: rgba\(245, 232, 201, 0\.38\) !important/);
  assert.match(appCss, /\.theme-light[\s\S]*?\.strumPatternStep\.hit \{[\s\S]*?color: #a96d18 !important/);
});

test("saved progressions preserve and restore each chord fingering region", async () => {
  const [appSource, appCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(appStyleUrl, "utf8"),
  ]);

  assert.match(appSource, /function getChordEntryPositionId\(entry\)/);
  assert.match(appSource, /positionId: stage3StorageChordPosition/);
  assert.match(appSource, /positionLabel: CHORD_VIEWER_POSITIONS\.find/);
  assert.match(appSource, /notes: position\?\.notes \?\? chord\.notes/);
  assert.match(appSource, /barres: position\?\.barres \?\? chord\.barres/);
  assert.match(appSource, /chordPracticeFretboardView[\s\S]*chordPracticeCurrent\.visibleFrets/);
  assert.match(appSource, /chordPracticeCurrent\.stringStates\?\.\[stringNumber\]/);
  assert.match(appSource, /editStage3StorageChordEntry\(stage3StorageChordIds\[index\], index\)/);
  assert.match(appSource, /onClick=\{\(\) => commitStage3StorageChord\(1\)\}/);
  assert.match(appSource, /onClick=\{\(\) => commitStage3StorageChord\(2\)\}/);
  assert.match(appSource, /onClick=\{\(\) => commitStage3StorageChord\(4\)\}/);
  assert.match(appSource, /onClick=\{addStage3StorageRest\}/);
  assert.match(appSource, />\s*1박 추가\s*</);
  assert.match(appSource, />\s*2박 추가\s*</);
  assert.match(appSource, />\s*4박 추가\s*</);
  assert.match(appSource, />\s*1박 쉼\s*</);
  assert.match(appSource, /id: RHYTHM_CHORD_REST_ID,[\s\S]*isRest: true,[\s\S]*label: "쉼"/);
  assert.match(appCss, /\.stage3BeatLengthActions \{[\s\S]*grid-template-columns: repeat\(5, auto\)/);
  assert.match(appSource, /isAutoRest \? \([\s\S]*stage3AutomaticRestSymbol[\s\S]*𝄽/);
  assert.match(appSource, /chordPracticeTimelineBeat >= startBeat[\s\S]*chordPracticeTimelineBeat < endBeat/);
  assert.match(appSource, /aria-label=\{`자동 쉼 \$\{getRhythmChordBeatLabel\(beatLength\)\}`\}/);
  assert.match(appCss, /\.stage3AutomaticRestButton \{[\s\S]*min-width: 30px !important;[\s\S]*min-height: 25px !important/);
  assert.match(appCss, /\.chordTransitionChart \.currentProgressionReadout button\.stage3AutomaticRestButton \{[\s\S]*width: 32px !important;[\s\S]*height: 29px !important/);
  assert.match(appCss, /\.stage3AutomaticRestSymbol[\s\S]*font-family: "Noto Music"/);
  assert.match(appSource, /<small>\{getRhythmChordBeatLabel\(chord\.beatLength\)\}<\/small>/);
  assert.doesNotMatch(appSource, /<small>\{chord\.positionLabel\}<\/small>/);
});

test("rhythm chord fretboard removes root-note playback highlighting and keeps stable render props", async () => {
  const appSource = await readFile(appSourceUrl, "utf8");
  const viewStart = appSource.indexOf("const chordPracticeFretboardView = useMemo");
  const viewEnd = appSource.indexOf("const getPlayableCategory", viewStart);
  const viewSource = appSource.slice(viewStart, viewEnd);

  assert.ok(viewStart >= 0 && viewEnd > viewStart);
  assert.match(viewSource, /isActive: false/);
  assert.match(viewSource, /isCurrent: false/);
  assert.match(viewSource, /current: false/);
  assert.match(viewSource, /isRoot: false/);
  assert.doesNotMatch(viewSource, /isCurrent: Boolean\(note\.isRoot\)/);
  assert.match(appSource, /notes=\{chordPracticeFretboardView\.notes\}/);
  assert.match(appSource, /stringStates=\{chordPracticeFretboardView\.stringStates\}/);
  assert.match(appSource, /selectedNotes=\{STAGE3_STATIC_FRETBOARD_SELECTION\}/);
});

test("LOAD chord position previews derive a complete fret range from their actual notes", async () => {
  const appSource = await readFile(appSourceUrl, "utf8");

  assert.match(
    appSource,
    /const visibleFrets = getCompactFretRange\([\s\S]*?frettedNotes,[\s\S]*?chord\.barres,[\s\S]*?chord\.visibleFrets\?\.length/,
  );
  assert.match(appSource, /if \(min <= 3\) return \[0, Math\.max\(3, max\)\]/);
});

test("mobile rhythm load toolbar gives the LOAD action more width and emphasis", async () => {
  const appCss = await readFile(appStyleUrl, "utf8");

  assert.match(appCss, /Mobile rhythm load toolbar: reserve more space and emphasis for the LOAD action/);
  assert.match(
    appCss,
    /@media \(max-width: 720px\)[\s\S]*?\.stage3LoadToolbar\.stage3LoadToolbar \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\) 72px !important;[\s\S]*?gap: 4px !important;/,
  );
  assert.match(
    appCss,
    /> button\.stage3StorageMoveButton\.stage3StorageMoveButton \{[\s\S]*?width: 72px !important;[\s\S]*?rgba\(255, 252, 242, 0\.84\)[\s\S]*?#e5d2aa !important;[\s\S]*?font-weight: 1000 !important;/,
  );
});

test("LOAD and its selected chord options reuse the two-beat add button palette", async () => {
  const appCss = await readFile(appStyleUrl, "utf8");

  assert.match(
    appCss,
    /\.stage3StorageRoom \.stage3ChordBuilderPanel \.chordBuilderChip\.selected \{[\s\S]*?border-color: #b38a45 !important;[\s\S]*?#e5d2aa !important;[\s\S]*?color: #22180b !important;/,
  );
  assert.match(
    appCss,
    /\.theme-light \.stage3StorageRoom \.stage3ChordBuilderPanel \.chordBuilderChip\.selected \{[\s\S]*?border-color: #b38a45 !important;[\s\S]*?#e5d2aa !important;[\s\S]*?color: #22180b !important;/,
  );
});

test("mobile rhythm storage keeps save actions visible while compacting vertical space", async () => {
  const appCss = await readFile(appStyleUrl, "utf8");

  assert.match(appCss, /Mobile rhythm storage: keep the primary save action visible on first entry/);
  assert.match(appCss, /height: min\(calc\(100dvh - 20px\), 810px\) !important/);
  assert.match(appCss, /--fretboard-board-height: 124px/);
  assert.match(
    appCss,
    /\.stage3StorageRoom \.stage3StorageComposerActions[\s\S]*?position: sticky !important;[\s\S]*?bottom: 0 !important;/,
  );
});
