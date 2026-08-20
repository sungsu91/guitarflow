import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_SHOOTER_NOTE_MONSTER_SKIN_ID,
  SHOOTER_NOTE_MONSTER_A_RENDER_SCALE,
  SHOOTER_NOTE_MONSTER_ASSETS,
  SHOOTER_NOTE_MONSTER_ASSET_SOURCES,
  SHOOTER_NOTE_MONSTER_LABEL_ZEROING,
  SHOOTER_NOTE_MONSTER_SHARP_RENDER_SCALE,
  SHOOTER_NOTE_MONSTER_SKINS,
  getShooterNoteMonsterAssetSources,
  getShooterNoteMonsterFrameSrc,
  getShooterNoteMonsterLabelLayout,
  getShooterNoteMonsterLabelPalette,
  getShooterNoteMonsterLabelParts,
  getShooterNoteMonsterRenderScale,
  getShooterNoteMonsterRoot,
  getShooterNoteMonsterSkin,
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

test("sharp pitches and the A design use a slightly larger visual monster", () => {
  assert.equal(SHOOTER_NOTE_MONSTER_SHARP_RENDER_SCALE, 1.08);
  assert.equal(SHOOTER_NOTE_MONSTER_A_RENDER_SCALE, 1.12);
  assert.equal(getShooterNoteMonsterRenderScale("C#4"), 1.08);
  assert.equal(getShooterNoteMonsterRenderScale("F♯3"), 1.08);
  assert.equal(getShooterNoteMonsterRenderScale("A4"), 1.12);
  assert.equal(getShooterNoteMonsterRenderScale("A#4"), 1.12);
  assert.equal(getShooterNoteMonsterRenderScale("C4"), 1);
  assert.equal(getShooterNoteMonsterRenderScale("Bb3"), 1);
});

test("label colors follow each monster core's contrast instead of forcing one color", () => {
  const darkCorePalette = getShooterNoteMonsterLabelPalette("A4", "cute-object");
  const brightCorePalette = getShooterNoteMonsterLabelPalette("F#4", "cute-object");
  assert.equal(darkCorePalette.color, "#fff8dc");
  assert.equal(darkCorePalette.outline, "#081536");
  assert.equal(brightCorePalette.color, "#17330b");
  assert.equal(brightCorePalette.outline, "#efffc9");
  assert.notEqual(darkCorePalette.color, brightCorePalette.color);
  assert.equal(getShooterNoteMonsterLabelPalette("D4", "elemental").color, "#172f08");
});

test("the shared label zeroing also moves the elemental set left and up", () => {
  assert.deepEqual(getShooterNoteMonsterLabelLayout("F#4", "elemental"), { x: 47, y: 47 });
});

test("elemental monsters are the server default and cute objects remain selectable", () => {
  assert.equal(DEFAULT_SHOOTER_NOTE_MONSTER_SKIN_ID, "elemental");
  assert.deepEqual(SHOOTER_NOTE_MONSTER_SKINS.map((skin) => skin.id), ["cute-object", "elemental"]);
  assert.equal(getShooterNoteMonsterSkin().id, "elemental");
  assert.equal(getShooterNoteMonsterFrameSrc("C4", 0), "/assets/shooter/note-monsters/c/frame-0.png");
  assert.equal(
    getShooterNoteMonsterFrameSrc("Bb4", 0, "elemental"),
    "/assets/shooter/note-monsters/b/frame-0.png",
  );
});

test("each monster skin exposes 42 aligned 256px RGBA PNG frames", async () => {
  assert.equal(SHOOTER_NOTE_MONSTER_ASSET_SOURCES.length, 42);
  assert.equal(new Set(SHOOTER_NOTE_MONSTER_ASSET_SOURCES).size, 42);
  const allSources = SHOOTER_NOTE_MONSTER_SKINS.flatMap((skin) => (
    getShooterNoteMonsterAssetSources(skin.id)
  ));
  assert.equal(allSources.length, 84);
  assert.equal(new Set(allSources).size, 84);

  for (const source of allSources) {
    const bytes = await readFile(new URL(`public${source}`, PROJECT_ROOT));
    assert.equal(bytes.toString("ascii", 1, 4), "PNG");
    assert.equal(bytes.readUInt32BE(16), 256);
    assert.equal(bytes.readUInt32BE(20), 256);
    assert.equal(bytes[25], 6, `${source} must remain RGBA`);
  }
});
