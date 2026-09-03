import assert from "node:assert/strict";
import test from "node:test";

import {
  MINI_CHORD_EMPTY_SAVED_OPTION_ID,
  createMiniChordLoadLibrary,
  summarizeMiniChordLoadDescription,
} from "../src/mini-chord/loadLibrary.js";

test("load-library indexing stays metadata-only and never walks heavy chord slots", () => {
  const recommended = {
    id: "recommended-1",
    title: "추천 한 곡",
    description: "가벼운 설명",
    libraryType: "recommended-progression",
    builtIn: true,
    key: "G Major",
    barCount: 64,
    bpm: 96,
  };
  Object.defineProperty(recommended, "slots", {
    get() {
      throw new Error("the compact load index must not read full chord slots");
    },
  });

  const library = createMiniChordLoadLibrary([recommended]);

  assert.equal(library.itemsById.get(recommended.id), recommended);
  assert.deepEqual(library.optionTabs.map(({ id, count }) => [id, count]), [
    ["recommended", 1],
    ["saved", 0],
  ]);
  assert.equal(library.options[0].description, "가벼운 설명 · 64마디 · 96 BPM");
  assert.equal(library.options.at(-1).id, MINI_CHORD_EMPTY_SAVED_OPTION_ID);
  assert.equal(library.options.at(-1).disabled, true);
});

test("load-library descriptions stay short and end long summaries with an ellipsis", () => {
  assert.equal(summarizeMiniChordLoadDescription("  짧은   설명  "), "짧은 설명");
  assert.equal(
    summarizeMiniChordLoadDescription("개인 연습용 추천 진행 · 96마디 피아노 발라드"),
    "개인 연습용 추천 진행",
  );
  assert.equal(
    summarizeMiniChordLoadDescription("개인 연습용 추천 진행 · 96마디 피아노 발라드"),
    "개인 연습용 추천 진행",
  );
  assert.equal(
    summarizeMiniChordLoadDescription("오픈 코드 전환과 구간별 밴드 편곡을 함께 익히는 연습", 12),
    "오픈 코드 전환과 구…",
  );
});

test("saved arrangements stay deletable while built-in recommendations do not", () => {
  const library = createMiniChordLoadLibrary([
    {
      id: "recommended-1",
      title: "추천",
      libraryType: "recommended-progression",
      builtIn: true,
      barCount: 8,
      bpm: 80,
    },
    {
      id: "saved-1",
      title: "내 진행",
      libraryType: "user",
      builtIn: false,
      barCount: 4,
      bpm: 72,
    },
  ]);

  assert.equal(library.options.find((option) => option.id === "recommended-1").deletable, false);
  assert.equal(library.options.find((option) => option.id === "saved-1").deletable, true);
  assert.deepEqual(library.userIds, ["saved-1"]);
});
