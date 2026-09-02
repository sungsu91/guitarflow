import assert from "node:assert/strict";
import test from "node:test";

import {
  beginNavigationTransition,
  cancelNavigationTransition,
  completeNavigationTransition,
  getNavigationTransitionSnapshot,
  subscribeNavigationTransition,
} from "../src/navigation/transitionStore.js";

test("navigation shell store publishes the destination before content commits", () => {
  const snapshots = [];
  const unsubscribe = subscribeNavigationTransition(() => {
    snapshots.push(getNavigationTransitionSnapshot());
  });

  const token = beginNavigationTransition({
    categoryId: "scale-block",
    key: "practice:scale-block",
    mode: "practice",
    theme: "light",
  });

  assert.deepEqual(snapshots.at(-1), {
    active: true,
    categoryId: "scale-block",
    key: "practice:scale-block",
    mode: "practice",
    theme: "light",
    token,
    viewerMode: null,
  });
  assert.equal(completeNavigationTransition(token + 1), false);
  assert.equal(getNavigationTransitionSnapshot().active, true);
  assert.equal(completeNavigationTransition(token), true);
  assert.equal(getNavigationTransitionSnapshot().active, false);
  unsubscribe();
});

test("a newer destination replaces and protects itself from an older completion", () => {
  const firstToken = beginNavigationTransition({ key: "tuner", mode: "tuner" });
  const secondToken = beginNavigationTransition({
    key: "fretboard-viewer:scale",
    mode: "fretboard-viewer",
    viewerMode: "scale",
  });

  assert.equal(completeNavigationTransition(firstToken), false);
  assert.equal(getNavigationTransitionSnapshot().token, secondToken);
  assert.equal(cancelNavigationTransition(firstToken), false);
  assert.equal(cancelNavigationTransition(secondToken), true);
  assert.equal(getNavigationTransitionSnapshot().active, false);
});
