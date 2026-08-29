import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("playlist drawer stays open while outside controls remain interactive", async () => {
  const [componentSource, playerCss] = await Promise.all([
    readFile(new URL("../src/components/BackingLoop.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/backing-loop.css", import.meta.url), "utf8"),
  ]);
  const dialogLayerSource = componentSource.slice(
    componentSource.indexOf("function BackingLoopDialogLayer"),
    componentSource.indexOf("function MobileBackingLoop({"),
  );

  assert.match(
    dialogLayerSource,
    /if \(!controller\.playlistDrawerOpen && event\.target === event\.currentTarget\) controller\.closeDialog\(\)/,
  );
  assert.match(
    dialogLayerSource,
    /aria-modal=\{controller\.playlistDrawerOpen \? "false" : "true"\}/,
  );
  assert.match(
    playerCss,
    /\.backingLoopDialogLayer--playlistDrawer \{[\s\S]*?pointer-events: none;/,
  );
  assert.match(
    playerCss,
    /\.backingLoopDialogLayer\.backingLoopDialogLayer--playlistDrawer > \[role="dialog"\] \{[\s\S]*?pointer-events: auto;/,
  );
});
