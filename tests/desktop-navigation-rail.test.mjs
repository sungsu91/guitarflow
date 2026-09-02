import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const desktopStyleUrl = new URL("../src/layouts/desktop-layout.css", import.meta.url);

test("desktop navigation is a fixed vertical rail on the left wall", async () => {
  const styles = await readFile(desktopStyleUrl, "utf8");

  assert.match(
    styles,
    /\.desktopWorkspaceContent \{[\s\S]*?padding-left: clamp\(96px, 7vw, 120px\);[\s\S]*?padding-right: clamp\(24px, 4vw, 72px\);/,
  );
  assert.match(
    styles,
    /> \.hud > \.modeSwitch,[\s\S]*?\.mainHub > \.mainBottomNav \{[\s\S]*?position: fixed !important;[\s\S]*?grid-template-columns: minmax\(0, 1fr\) !important;[\s\S]*?grid-template-rows: repeat\(5, minmax\(64px, 1fr\)\) !important;[\s\S]*?top: 50% !important;[\s\S]*?left: max\(8px, env\(safe-area-inset-left\)\) !important;[\s\S]*?bottom: auto !important;[\s\S]*?transform: translateY\(-50%\) !important;/,
  );
  assert.match(
    styles,
    /> \.hud > \.modeSwitch > button,[\s\S]*?\.mainHub > \.mainBottomNav > button \{[\s\S]*?flex-direction: column !important;[\s\S]*?min-height: 64px !important;/,
  );
});

test("desktop utility menu follows the left rail while mobile keeps its own layout", async () => {
  const styles = await readFile(desktopStyleUrl, "utf8");

  assert.match(
    styles,
    /\.desktopLayout[\s\S]*?\.utilityMenuPanel \{[\s\S]*?top: 50% !important;[\s\S]*?left: clamp\(92px, 7vw, 112px\) !important;[\s\S]*?right: auto !important;[\s\S]*?bottom: auto !important;/,
  );
  assert.match(
    styles,
    /@media \(max-width: 1023px\) \{[\s\S]*?\.desktopWorkspaceContent \{[\s\S]*?display: contents !important;/,
  );
});
