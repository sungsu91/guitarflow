import assert from "node:assert/strict";
import test from "node:test";

import {
  BEAT_PRESET_PART_IDS,
  BEAT_PRESET_SLOT_IDS,
  createBeatPresetStore,
  getBeatPresetSlot,
  normalizeBeatPresetStore,
} from "../src/rhythm/beatPresetStore.js";

const createPattern = (part, slotId) => ({ part, slotId, steps: [part, slotId] });
const normalizePattern = (part, pattern, slotId) => ({ ...pattern, part, slotId });

test("factory store creates five independent slots for every instrument", () => {
  const store = createBeatPresetStore(createPattern);

  assert.deepEqual(Object.keys(store), BEAT_PRESET_PART_IDS);
  BEAT_PRESET_PART_IDS.forEach((part) => {
    assert.deepEqual(Object.keys(store[part]), BEAT_PRESET_SLOT_IDS);
    assert.notEqual(store[part].basic, store[part].custom);
  });
});

test("legacy custom patterns migrate into the shared custom slot", () => {
  const store = normalizeBeatPresetStore(
    { drum: { "8beat": { steps: ["user-eight"] } } },
    {
      createPattern,
      normalizePattern,
      legacyCustomPatterns: {
        drum: { steps: ["legacy-custom"] },
        bass: { steps: ["legacy-bass-custom"] },
      },
    },
  );

  assert.deepEqual(store.drum["8beat"].steps, ["user-eight"]);
  assert.deepEqual(store.drum.custom.steps, ["legacy-custom"]);
  assert.deepEqual(store.bass.custom.steps, ["legacy-bass-custom"]);
  assert.deepEqual(store.piano.custom.steps, ["piano", "custom"]);
});

test("slot lookup rejects unknown slots and returns the normalized source slot", () => {
  const store = createBeatPresetStore(createPattern);
  assert.equal(getBeatPresetSlot(store, "drum", "swing", { createPattern, normalizePattern }), null);
  assert.deepEqual(
    getBeatPresetSlot(store, "piano", "custom", { createPattern, normalizePattern }),
    { part: "piano", slotId: "custom", steps: ["piano", "custom"] },
  );
});

