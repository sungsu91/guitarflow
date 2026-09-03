import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  BACKLINE_RESONANCE_PITCH_TEXT,
  BACKLINE_RESONANCE_SHOOTER_NOTE_MONSTER_SKIN_ID,
  DEFAULT_SHOOTER_NOTE_MONSTER_SKIN_ID,
  SHOOTER_NOTE_MONSTER_A_RENDER_SCALE,
  SHOOTER_NOTE_MONSTER_ASSETS,
  SHOOTER_NOTE_MONSTER_ASSET_SOURCES,
  SHOOTER_NOTE_MONSTER_LABEL_ZEROING,
  SHOOTER_NOTE_MONSTER_ROOTS,
  SHOOTER_NOTE_MONSTER_SHARP_RENDER_SCALE,
  SHOOTER_NOTE_MONSTER_SKIN_RENDER_SCALES,
  SHOOTER_NOTE_MONSTER_SKINS,
  getShooterNoteMonsterAssetSources,
  getShooterNoteMonsterFrameSrc,
  getShooterNoteMonsterIdleAssetSources,
  getShooterNoteMonsterLabelLayout,
  getShooterNoteMonsterLabelPalette,
  getShooterNoteMonsterLabelParts,
  getShooterNoteMonsterPitchText,
  getShooterNoteMonsterRenderScale,
  getShooterNoteMonsterRoot,
  getShooterNoteMonsterSkin,
  getShooterNoteMonsterSkinRenderScale,
} from "../src/shooter/noteMonsterAssets.js";

const PROJECT_ROOT = new URL("../", import.meta.url);

test("natural, sharp, and flat pitches share the seven root-note monster families", () => {
  assert.equal(getShooterNoteMonsterRoot("C4"), "C");
  assert.equal(getShooterNoteMonsterRoot("F#4"), "F");
  assert.equal(getShooterNoteMonsterRoot("Bb3"), "B");
  assert.equal(getShooterNoteMonsterFrameSrc("G#4", 0), SHOOTER_NOTE_MONSTER_ASSETS.G[0]);
  assert.equal(getShooterNoteMonsterFrameSrc("G#4", 5), SHOOTER_NOTE_MONSTER_ASSETS.G[5]);
  assert.deepEqual(getShooterNoteMonsterLabelParts("E#3"), {
    accidental: "#",
    octave: "3",
    root: "E",
  });
});

test("gameplay can preload one idle frame per note family before targets appear", async () => {
  const idleSources = getShooterNoteMonsterIdleAssetSources("elemental");
  const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.equal(idleSources.length, SHOOTER_NOTE_MONSTER_ROOTS.length);
  assert.deepEqual(idleSources, SHOOTER_NOTE_MONSTER_ROOTS.map((root) => SHOOTER_NOTE_MONSTER_ASSETS[root][0]));
  assert.match(appSource, /await preloadShooterEnemyIdleAssets\(selectedMonsterSkin\.id\)/);
  assert.match(appSource, /fetchPriority="high"/);
});

test("each of the seven cute-object designs keeps its label in the authored orb center", () => {
  const layouts = Object.fromEntries(
    ["C", "D", "E", "F", "G", "A", "B"].map((noteRoot) => [
      noteRoot,
      getShooterNoteMonsterLabelLayout(`${noteRoot}#3`, "cute-object"),
    ]),
  );
  assert.deepEqual(Object.keys(layouts), ["C", "D", "E", "F", "G", "A", "B"]);
  Object.values(layouts).forEach(({ x, y }) => {
    assert.ok(x >= 39 && x <= 57);
    assert.ok(y >= 38 && y <= 50);
  });
  assert.deepEqual(SHOOTER_NOTE_MONSTER_LABEL_ZEROING, { left: 3, up: 3 });
  assert.deepEqual(layouts.C, { x: 47.5, y: 49.5 });
  assert.deepEqual(layouts.E, { x: 47, y: 43.5 });
  assert.deepEqual(layouts.G, { x: 47, y: 41 });
  assert.deepEqual(layouts.A, { x: 47, y: 43.5 });
  assert.deepEqual(layouts.B, { x: 46, y: 38 });
  assert.notDeepEqual(layouts.C, layouts.B);
});

test("skin-wide growth includes elemental at ten percent and cute objects at five percent", () => {
  assert.equal(SHOOTER_NOTE_MONSTER_SHARP_RENDER_SCALE, 1.08);
  assert.equal(SHOOTER_NOTE_MONSTER_A_RENDER_SCALE, 1.12);
  assert.deepEqual(SHOOTER_NOTE_MONSTER_SKIN_RENDER_SCALES, {
    "cute-object": 1.05,
    elemental: 1.1,
    "backline-resonance": 1,
  });
  assert.equal(getShooterNoteMonsterSkinRenderScale("elemental"), 1.1);
  assert.equal(getShooterNoteMonsterSkinRenderScale("cute-object"), 1.05);
  assert.equal(getShooterNoteMonsterRenderScale("C#4"), 1.08 * 1.1);
  assert.equal(getShooterNoteMonsterRenderScale("F♯3"), 1.08 * 1.1);
  assert.equal(getShooterNoteMonsterRenderScale("A4"), 1.12 * 1.1);
  assert.equal(getShooterNoteMonsterRenderScale("A#4"), 1.12 * 1.1);
  assert.equal(getShooterNoteMonsterRenderScale("C4"), 1.1);
  assert.equal(getShooterNoteMonsterRenderScale("Bb3"), 1.1);
  assert.equal(getShooterNoteMonsterRenderScale("C4", "cute-object"), 1.05);
  assert.equal(getShooterNoteMonsterRenderScale("G#4", "backline-resonance"), 1);
  assert.equal(getShooterNoteMonsterRenderScale("A2", "backline-resonance"), 1);
});

test("label colors follow each monster core's contrast instead of forcing one color", () => {
  const darkCorePalette = getShooterNoteMonsterLabelPalette("A4", "cute-object");
  const brightCorePalette = getShooterNoteMonsterLabelPalette("F#4", "cute-object");
  assert.equal(darkCorePalette.color, "#fff8dc");
  assert.equal(darkCorePalette.outline, "#081536");
  assert.equal(brightCorePalette.color, "#17330b");
  assert.equal(brightCorePalette.outline, "#efffc9");
  assert.notEqual(darkCorePalette.color, brightCorePalette.color);
  const elementalPalettes = Object.fromEntries(
    SHOOTER_NOTE_MONSTER_ROOTS.map((noteRoot) => [
      noteRoot,
      getShooterNoteMonsterLabelPalette(`${noteRoot}4`, "elemental"),
    ]),
  );
  assert.equal(elementalPalettes.D.color, "#efffc7");
  assert.equal(elementalPalettes.D.outline, "#172f08");
  assert.equal(elementalPalettes.G.color, "#fff4bc");
  assert.equal(elementalPalettes.G.outline, "#3d2600");
  assert.deepEqual(
    Object.keys(elementalPalettes).filter((noteRoot) => (
      Number.parseInt(elementalPalettes[noteRoot].color.slice(1, 3), 16) < 0xef
    )),
    [],
  );
});

test("the shared label zeroing also moves the elemental set left and up", () => {
  assert.deepEqual(getShooterNoteMonsterLabelLayout("F#4", "elemental"), { x: 47, y: 47 });
});

test("elemental stays the default while Cute Object and Backline Resonance remain selectable", () => {
  assert.equal(DEFAULT_SHOOTER_NOTE_MONSTER_SKIN_ID, "elemental");
  assert.deepEqual(SHOOTER_NOTE_MONSTER_SKINS.map((skin) => skin.id), [
    "cute-object",
    "elemental",
    BACKLINE_RESONANCE_SHOOTER_NOTE_MONSTER_SKIN_ID,
  ]);
  assert.equal(getShooterNoteMonsterSkin().id, "elemental");
  assert.equal(getShooterNoteMonsterFrameSrc("C4", 0), "/assets/shooter/note-monsters/c/frame-0.png");
  assert.equal(
    getShooterNoteMonsterFrameSrc("Bb4", 0, "elemental"),
    "/assets/shooter/note-monsters/b/frame-0.png",
  );
  assert.equal(
    getShooterNoteMonsterFrameSrc("G#4", 0, BACKLINE_RESONANCE_SHOOTER_NOTE_MONSTER_SKIN_ID),
    "/assets/shooter/note-monsters/backline-resonance/G_PEDAL_CORE.png",
  );
  assert.equal(
    getShooterNoteMonsterFrameSrc("G#4", 5, BACKLINE_RESONANCE_SHOOTER_NOTE_MONSTER_SKIN_ID),
    "/assets/shooter/note-monsters/backline-resonance/G_PEDAL_CORE.png",
  );
});

test("Backline Resonance uses seven 512px RGBA shells while legacy frame sets stay intact", async () => {
  assert.equal(SHOOTER_NOTE_MONSTER_ASSET_SOURCES.length, 42);
  assert.equal(new Set(SHOOTER_NOTE_MONSTER_ASSET_SOURCES).size, 42);
  const sourcesBySkin = Object.fromEntries(SHOOTER_NOTE_MONSTER_SKINS.map((skin) => [
    skin.id,
    getShooterNoteMonsterAssetSources(skin.id),
  ]));
  assert.equal(sourcesBySkin["cute-object"].length, 42);
  assert.equal(sourcesBySkin.elemental.length, 42);
  assert.equal(sourcesBySkin[BACKLINE_RESONANCE_SHOOTER_NOTE_MONSTER_SKIN_ID].length, 7);
  const allSources = Object.values(sourcesBySkin).flat();
  assert.equal(allSources.length, 91);
  assert.equal(new Set(allSources).size, 91);

  for (const source of allSources) {
    const bytes = await readFile(new URL(`public${source}`, PROJECT_ROOT));
    assert.equal(bytes.toString("ascii", 1, 4), "PNG");
    const expectedSize = source.includes("/backline-resonance/") ? 512 : 256;
    assert.equal(bytes.readUInt32BE(16), expectedSize);
    assert.equal(bytes.readUInt32BE(20), expectedSize);
    assert.equal(bytes[25], 6, `${source} must remain RGBA`);
  }
});

test("Backline Resonance centers the full app-rendered target pitch with manifest typography", async () => {
  const skin = getShooterNoteMonsterSkin(BACKLINE_RESONANCE_SHOOTER_NOTE_MONSTER_SKIN_ID);
  assert.equal(skin.label, "Backline Resonance Set");
  assert.deepEqual(skin.pitchText, BACKLINE_RESONANCE_PITCH_TEXT);
  assert.deepEqual(getShooterNoteMonsterLabelLayout("C2", skin.id), { x: 50, y: 50 });
  assert.deepEqual(getShooterNoteMonsterLabelLayout("G#4", skin.id), { x: 50, y: 50 });
  assert.equal(getShooterNoteMonsterPitchText("C2", skin.id, "도2"), "도2");
  assert.equal(getShooterNoteMonsterPitchText("F#3", skin.id, "파#3"), "파#3");
  assert.equal(getShooterNoteMonsterPitchText("G♯4", skin.id, "솔♯4"), "솔#4");
  assert.equal(getShooterNoteMonsterPitchText("G♯4", skin.id, "G♯4"), "G#4");
  assert.equal(getShooterNoteMonsterPitchText("G#4", "elemental", "솔#4"), "솔#4");
  assert.deepEqual(BACKLINE_RESONANCE_PITCH_TEXT, {
    anchorXRatio: 0.5,
    anchorYRatio: 0.5,
    fill: "#ffffff",
    fontSizeRatio: 0.1875,
    fontWeight: 800,
    outline: "#07142b",
    outlineWidthRatio: 0.01,
    renderedByApp: true,
    singleLine: true,
    textMaxWidthRatio: 0.48,
  });

  const [appSource, styleSource] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/style.css", import.meta.url), "utf8"),
  ]);
  assert.match(appSource, /getShooterNoteMonsterPitchText\(/);
  assert.match(appSource, /data-monster-skin=\{selectedMonsterSkin\.id\}/);
  assert.match(appSource, /pitchText\.fontSizeRatio/);
  assert.match(appSource, /pitchText\.outlineWidthRatio/);
  assert.match(appSource, /monsterRenderedScales\.labelScale \* monsterSkinRenderScale/);
  assert.match(appSource, /key=\{`\$\{frameSrc\}:\$\{frameIndex\}`\}/);
  assert.match(styleSource, /max-width: var\(--target-label-max-width, 100%\)/);
  assert.match(styleSource, /white-space: nowrap/);
  assert.doesNotMatch(
    getShooterNoteMonsterAssetSources(skin.id).join("\n"),
    /preview|BACKLINE_RESONANCE_GSHARP4_PREVIEW/i,
  );
});
