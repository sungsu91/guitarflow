import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  WHEEL_PICKER_ITEM_HEIGHT,
  clampWheelIndex,
  getWheelDragPosition,
  getWheelReleaseVelocity,
  getWheelSnapIndex,
  getWheelSnapDuration,
  shouldContinueWheelInertia,
  stepWheelInertia,
} from "../src/metronome/wheelPickerPhysics.js";

test("mouse timer wheel follows short drags immediately with a near 1:1 sensitive ratio", () => {
  const upwardOneRow = getWheelDragPosition(10, 200, 200 - WHEEL_PICKER_ITEM_HEIGHT, 30);
  assert.ok(upwardOneRow > 11, `expected more than one item, received ${upwardOneRow}`);
  assert.ok(upwardOneRow < 11.2, `expected a near 1:1 ratio, received ${upwardOneRow}`);
  assert.equal(getWheelDragPosition(0, 100, 180, 30), 0);
  assert.equal(getWheelDragPosition(29, 100, 0, 30), 29);
});

test("touch timer wheel uses a lighter drag ratio and longer glide than mouse", () => {
  const mouseDragPosition = getWheelDragPosition(10, 200, 188, 60, "mouse");
  const touchDragPosition = getWheelDragPosition(10, 200, 188, 60, "touch");
  assert.ok(touchDragPosition > mouseDragPosition, "the same small touch drag should move farther");

  const releaseSamples = [
    { y: 200, time: 0 },
    { y: 190, time: 20 },
    { y: 180, time: 40 },
  ];
  const mouseVelocity = getWheelReleaseVelocity(releaseSamples, 40, "mouse");
  const touchVelocity = getWheelReleaseVelocity(releaseSamples, 40, "touch");
  assert.ok(touchVelocity > mouseVelocity, "the same touch flick should start with more velocity");

  const glideDistance = (pointerType) => {
    let position = 10;
    let velocity = 0.02;
    let elapsed = 0;
    while (shouldContinueWheelInertia(velocity, elapsed, pointerType)) {
      const next = stepWheelInertia(position, velocity, 16, 60, pointerType);
      position = next.position;
      velocity = next.velocity;
      elapsed += 16;
    }
    return position - 10;
  };

  assert.ok(
    glideDistance("touch") > glideDistance("mouse") + 0.5,
    "touch inertia should coast farther before its one final snap",
  );
});

test("timer wheel release velocity follows flick direction and ignores a held release", () => {
  const upwardVelocity = getWheelReleaseVelocity([
    { y: 200, time: 0 },
    { y: 166, time: 20 },
    { y: 132, time: 40 },
  ], 40);
  assert.equal(upwardVelocity, 0.055, "fast upward flick should use the capped forward velocity");

  const heldVelocity = getWheelReleaseVelocity([
    { y: 200, time: 0 },
    { y: 150, time: 30 },
    { y: 150, time: 120 },
  ], 120);
  assert.equal(heldVelocity, 0, "holding still before release must not create delayed inertia");
});

test("timer wheel inertia advances continuously, decays, and stops at its boundary", () => {
  let position = 10;
  let velocity = 0.03;
  let elapsed = 0;
  let previousPosition = position;

  while (shouldContinueWheelInertia(velocity, elapsed)) {
    const next = stepWheelInertia(position, velocity, 16, 30);
    position = next.position;
    velocity = next.velocity;
    elapsed += 16;
    assert.ok(position >= previousPosition, "positive inertia must not reverse direction");
    previousPosition = position;
  }

  assert.ok(position > 14, `expected a visible glide, received ${position}`);
  assert.ok(position < 18, `expected controlled inertia, received ${position}`);

  const boundary = stepWheelInertia(28.9, 0.055, 32, 30);
  assert.equal(boundary.position, 29);
  assert.equal(boundary.velocity, 0);
});

test("timer wheel snap is short, nearest-index based, and reduced-motion aware", () => {
  assert.equal(clampWheelIndex(12.49, 30), 12);
  assert.equal(clampWheelIndex(12.5, 30), 13);
  assert.ok(getWheelSnapDuration(0.5) <= 180);
  assert.equal(getWheelSnapDuration(0.5, true), 0);
});

test("timer wheel release snap never reverses the completed drag or inertia direction", () => {
  assert.equal(getWheelSnapIndex(12.2, 1, 30), 13);
  assert.equal(getWheelSnapIndex(12.8, -1, 30), 12);
  assert.equal(getWheelSnapIndex(12.49, 0, 30), 12);
  assert.equal(getWheelSnapIndex(12.5, 0, 30), 13);
  assert.equal(getWheelSnapIndex(29, 1, 30), 29);
  assert.equal(getWheelSnapIndex(0, -1, 30), 0);
});

test("Automator and Tracker share live detent sound and haptic feedback", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const wheelUsages = source.match(/<MetronomeWheelPicker[\s\S]*?\/>/g) ?? [];

  assert.equal(wheelUsages.length, 2);
  for (const usage of wheelUsages) {
    assert.match(usage, /onDetent=\{triggerMetronomeWheelDetent\}/);
    assert.match(usage, /onInteractionStart=\{primeMetronomeWheelTick\}/);
  }
  assert.match(source, /navigator\.vibrate\(2\)/);
  assert.match(source, /getAudioBusInput\(AUDIO_BUS_IDS\.METRONOME, audio\)/);
  assert.match(source, /const getMetronomeDialTickBuffer[\s\S]*audio\.createBuffer/);
  assert.match(source, /source\.buffer = getMetronomeDialTickBuffer\(audio\)/);
  assert.match(source, /scheduledAt - now > 0\.024/);
});

test("moving the wheel updates only its track and commits once after exact settlement", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/style.css", import.meta.url), "utf8"),
  ]);
  const liveDetentBlock = source.slice(
    source.indexOf("const updateDetentIndex"),
    source.indexOf("const renderWheelPosition"),
  );
  const wheelComponentBlock = source.slice(
    source.indexOf("const WheelPickerColumn"),
    source.indexOf("function TrainingPanelHeader"),
  );
  const fixedWheelCssBlock = css.slice(css.indexOf("/* Timer wheel: the values move underneath"));

  assert.doesNotMatch(liveDetentBlock, /onChange|classList|setAttribute/);
  assert.doesNotMatch(wheelComponentBlock, /onScroll|scrollTo|scrollIntoView/);
  assert.match(source, /getCoalescedEvents/);
  assert.match(wheelComponentBlock, /getWheelDragPosition\([\s\S]*?drag\.pointerType/);
  assert.match(wheelComponentBlock, /startWheelInertia\(currentPosition, releaseVelocity, releaseDirection, drag\.pointerType\)/);
  assert.doesNotMatch(fixedWheelCssBlock, /scroll-snap/);
  assert.match(wheelComponentBlock, /animateToIndex\(position, getWheelSnapIndex\(position, motionDirection, options\.length\)\)/);
  assert.match(source, /const settleWheelAtIndex[\s\S]*renderWheelPosition\(safeIndex, true\);[\s\S]*finishInteraction\(\);[\s\S]*setSettledIndex\(safeIndex\);[\s\S]*onChange\(Number\(nextValue\)\)/);
  assert.doesNotMatch(source, /className=\{optionIndex === selectedIndex/);
  assert.match(source, /<div aria-hidden="true" className="metronomeWheelSelectionOverlay" \/>/);
  assert.match(css, /metronomeWheelSelectionOverlay[\s\S]*top: 60px !important;[\s\S]*z-index: 20 !important;[\s\S]*height: 36px !important;[\s\S]*pointer-events: none !important;/);
  assert.match(css, /metronomeTimerWheelPicker\.metronomeTimerWheelPicker::after[\s\S]*display: none !important;[\s\S]*content: none !important;/);
  assert.match(css, /rgba\(205, 135, 145, 0\.2\)/);
  assert.match(css, /border-top-color: rgba\(185, 105, 120, 0\.52\)/);
});
