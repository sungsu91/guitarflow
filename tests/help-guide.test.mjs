import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const desktopCss = readFileSync(new URL("../src/layouts/desktop-layout.css", import.meta.url), "utf8");

test("help guide exposes the complete FRETIVA LAB manual", () => {
  const sectionTitles = [
    "👋 FRETIVA LAB에 오신 것을 환영합니다",
    "🧭 화면과 공통 기능",
    "🎯 01 · 단일음 연습",
    "🎸 02 · 스케일 · 펜타토닉",
    "🔥 03 · 리듬코드",
    "🎼 04 · 미니반주",
    "⏱️ 메트로놈",
    "👾 슈팅게임",
    "🎵 튜너",
    "🗺️ 지판 보기",
    "🎛️ 사운드 & 리듬 설정",
    "💬 피드백 보내기",
  ];

  for (const title of sectionTitles) assert.match(appSource, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(appSource, /badge: "핵심"/);
  assert.match(appSource, /badge: "인기"/);
  assert.match(appSource, /Play · Practice · Enjoy/);
});

test("help guide puts shared navigation immediately after welcome", () => {
  assert.match(
    appSource,
    /const HELP_GUIDE_SECTION_ORDER = \[\s*"welcome",\s*"shared-features",\s*"single-note"/,
  );
  assert.match(appSource, /start: "먼저 보기"/);
  assert.match(appSource, /practice: "기초 연습"/);
  assert.match(appSource, /tools: "핵심 도구"/);
  assert.match(appSource, /settings: "설정과 지원"/);
});

test("desktop help guide widens without changing the shared mobile panel", () => {
  assert.match(desktopCss, /\.desktopLayout \.helpGuidePanel \{\s*width: min\(620px, calc\(100vw - 64px\)\) !important;/);
});
