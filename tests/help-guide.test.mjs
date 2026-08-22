import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const desktopCss = readFileSync(new URL("../src/layouts/desktop-layout.css", import.meta.url), "utf8");

test("help guide exposes the complete FRETIVA LAB manual", () => {
  const sectionTitles = [
    "Welcome to FRETIVA LAB",
    "01 · 단일음",
    "02 · 스케일 · 펜타토닉",
    "03 · 리듬코드",
    "04 · 미니반주",
    "METRONOME",
    "SHOOTING GAME",
    "TUNER",
    "지판 보기",
    "SOUND & RHYTHM",
    "알아두면 좋은 공통 기능",
    "💬 피드백 보내기",
  ];

  for (const title of sectionTitles) assert.match(appSource, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(appSource, /badge: "CORE"/);
  assert.match(appSource, /badge: "HOT"/);
  assert.match(appSource, /Play · Practice · Enjoy/);
});

test("desktop help guide widens without changing the shared mobile panel", () => {
  assert.match(desktopCss, /\.desktopLayout \.helpGuidePanel \{\s*width: min\(620px, calc\(100vw - 64px\)\) !important;/);
});
