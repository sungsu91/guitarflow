import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSourceUrl = new URL("../src/App.jsx", import.meta.url);
const appStyleUrl = new URL("../src/style.css", import.meta.url);

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
    /stage3ChordMiniReferenceFretboard\.fretboardComponent--editable button\.fretboardNoteDeleteButton \{[\s\S]*?width: 14px !important;[\s\S]*?height: 14px !important;[\s\S]*?font-size: 10px !important;/,
  );
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
  const appSource = await readFile(appSourceUrl, "utf8");

  assert.match(appSource, /function getChordEntryPositionId\(entry\)/);
  assert.match(appSource, /positionId: stage3StorageChordPosition/);
  assert.match(appSource, /positionLabel: CHORD_VIEWER_POSITIONS\.find/);
  assert.match(appSource, /notes: position\?\.notes \?\? chord\.notes/);
  assert.match(appSource, /barres: position\?\.barres \?\? chord\.barres/);
  assert.match(appSource, /chordPracticeFretboardView[\s\S]*chordPracticeCurrent\.visibleFrets/);
  assert.match(appSource, /chordPracticeCurrent\.stringStates\?\.\[stringNumber\]/);
  assert.match(appSource, /editStage3StorageChordEntry\(stage3StorageChordIds\[index\], index\)/);
  assert.match(appSource, /onClick=\{\(\) => commitStage3StorageChord\(2\)\}/);
  assert.match(appSource, /onClick=\{\(\) => commitStage3StorageChord\(4\)\}/);
  assert.match(appSource, />\s*2박 추가\s*</);
  assert.match(appSource, />\s*4박 추가\s*</);
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
