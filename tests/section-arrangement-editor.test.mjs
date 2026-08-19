import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

function getSourceRange(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker, start + 1);
  assert.notEqual(start, -1, `${startMarker} should exist`);
  assert.notEqual(end, -1, `${endMarker} should follow ${startMarker}`);
  return appSource.slice(start, end);
}

test("section arrangement editor goes directly from section fields to instrument rhythms", () => {
  const editorSource = getSourceRange(
    "function MiniChordArrangementEditorDialog",
    "function MetronomeTransportCard",
  );

  assert.match(editorSource, /Section 종류/);
  assert.match(editorSource, /Section 이름/);
  assert.match(editorSource, /Section 시작 마디/);
  assert.match(editorSource, /Section 끝 마디/);
  assert.match(editorSource, /MINI_CHORD_ARRANGEMENT_OPTION_GROUPS/);
  assert.match(editorSource, /miniChordArrangementTempoRow/);
  assert.doesNotMatch(
    editorSource,
    /적용 리듬|저장된 리듬 재사용|현재 Section 전용|리듬 이름|독립 리듬 만들기/,
  );
});

test("instrument changes are section-owned and selected editing sits before part preview", () => {
  const editorSource = getSourceRange(
    "function MiniChordArrangementEditorDialog",
    "function MetronomeTransportCard",
  );

  assert.match(editorSource, /patternShared: false/);
  assert.match(editorSource, /clearSectionRhythmOverride/);
  assert.match(editorSource, /선택 편집/);
  assert.match(editorSource, /onEditPattern\?\.\(part, selectedPresetId\)/);
  assert.doesNotMatch(editorSource, /if \(isCustom\) onEditPattern/);
  assert.ok(
    editorSource.indexOf("miniChordArrangementEditPatternButton")
      < editorSource.indexOf("miniChordArrangementSoloButton"),
    "selected editing should appear between the preset choices and preview",
  );
});

test("new, edited, and duplicated sections detach legacy shared rhythm records", () => {
  const draftSource = getSourceRange(
    "const createMiniChordArrangementDraftForRange",
    "const openMiniChordArrangementEditor",
  );
  const applySource = getSourceRange(
    "const applyMiniChordArrangementDraft",
    "const clearMiniChordSelectedRangeArrangement",
  );

  assert.match(draftSource, /patternShared: false/);
  assert.match(applySource, /miniChordArrangementReselectTarget\?\.duplicate/);
  assert.match(applySource, /nextPatternId/);
});
