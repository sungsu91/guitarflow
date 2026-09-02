import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const desktopCss = readFileSync(new URL("../src/layouts/desktop-layout.css", import.meta.url), "utf8");
const appCss = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");

test("help guide exposes the complete FRETIVA LAB manual", () => {
  const sectionTitles = [
    "👋 FRETIVA LAB에 오신 것을 환영합니다",
    "🧭 화면 이동과 공통 기능",
    "🎯 ① 단일 음 위치 익히기",
    "🎸 ② 스케일 · 펜타토닉",
    "🔥 ③ 리듬 코드 전환",
    "🎼 미니반주",
    "⏱️ 메트로놈",
    "🎛️ 오디오 스튜디오",
    "👾 슈팅게임",
    "🎵 튜너",
    "🗺️ 지판 보기",
    "🎛️ 사운드 & 리듬 설정",
    "ℹ️ 이용 안내",
  ];

  for (const title of sectionTitles) assert.match(appSource, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(appSource, /badge: "핵심"/);
  assert.match(appSource, /badge: "인기"/);
  assert.match(appSource, /badge: "초보 ★"/);
  assert.match(appSource, /badge: "SOLO"/);
  assert.match(appSource, /badge: "HOT •"/);
  assert.match(appSource, /badge: "진행 구성"/);
  assert.match(appSource, /badge: "간편 편집"/);
  assert.match(appSource, /Play · Practice · Enjoy/);
});

test("help guide reflects the current controls and local-only data policy", () => {
  const requiredCopy = [
    "1박·2박·4박",
    "1박 쉼",
    "편집한 운지도 진행과 함께 저장",
    "AUTOMATOR",
    "TRACKER",
    "전체 반복·한 곡 반복·셔플",
    "AUTO",
    "MANUAL",
    "목표 음을 실제 기타로 연주",
    "현재 기기의 브라우저 저장공간에만 보관",
    "Instagram @sungsu91_",
  ];

  for (const copy of requiredCopy) assert.match(appSource, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(appSource, /화면 하단의 구분 영역을 위로 올리면/);
});

test("help guide puts shared navigation immediately after welcome", () => {
  assert.match(
    appSource,
    /const HELP_GUIDE_SECTION_ORDER = \[\s*"welcome",\s*"shared-features",\s*"single-note"/,
  );
  assert.match(appSource, /start: "빠른 시작"/);
  assert.match(appSource, /practice: "연습 코스"/);
  assert.match(appSource, /arrangement: "반주 · 편집"/);
  assert.match(appSource, /tools: "주요 도구"/);
  assert.match(appSource, /settings: "설정과 이용 안내"/);
  assert.match(appSource, /"sound-rhythm",\s*"usage-info",\s*\];/);
});

test("help guide stays viewport-bound and scrollable on mobile and desktop", () => {
  assert.match(desktopCss, /\.desktopLayout \.helpGuidePanel \{\s*width: min\(620px, calc\(100vw - 64px\)\) !important;/);
  assert.match(appCss, /\.helpGuidePanel \{[\s\S]*?max-height: min\(760px, calc\(100dvh - 42px\)\);[\s\S]*?overflow: hidden;/);
  assert.match(appCss, /\.helpAccordion \{[\s\S]*?min-height: 0;[\s\S]*?overflow-y: auto;/);
  assert.match(appCss, /@media \(max-width: 430px\)[\s\S]*?\.helpGuidePanel\.helpGuidePanel \{[\s\S]*?max-height: calc\(100dvh - 20px\);/);
});
