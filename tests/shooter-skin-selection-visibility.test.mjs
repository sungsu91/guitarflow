import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styleSourceUrl = new URL("../src/style.css", import.meta.url);

test("every shooter skin catalog uses the shared high-contrast selected state", async () => {
  const styleSource = await readFile(styleSourceUrl, "utf8");
  const sharedRule = styleSource.match(
    /\/\* Shooter skin selection:[\s\S]*?\.selected\s*\{([\s\S]*?)\n\}/,
  )?.[1] ?? "";

  for (const className of [
    "shooterGuitarPickerItem",
    "shooterSkinOptionCard",
    "shooterMapCard",
    "shooterSkinDefaultButton",
    "shooterGuitarCabinetPickerItem",
  ]) {
    assert.match(styleSource, new RegExp(`\\.${className}[\\s\\S]*?\\.selected`), className);
  }

  assert.match(sharedRule, /border: 2px solid var\(--shooter-selection-border\) !important/);
  assert.match(sharedRule, /background: var\(--shooter-selection-fill\) !important/);
  assert.match(sharedRule, /0 0 0 2px var\(--shooter-selection-ring\)/);
});

test("selected shooter skin cards expose a persistent check badge in both themes", async () => {
  const styleSource = await readFile(styleSourceUrl, "utf8");

  assert.match(styleSource, /:root\[data-theme="light"\] body \.shooterSkinConfigurator[\s\S]*?--shooter-selection-border: #8c5714/);
  assert.match(
    styleSource,
    /\.selected::after\s*\{[\s\S]*?content: "✓" !important;[\s\S]*?display: grid !important;[\s\S]*?width: 20px !important;[\s\S]*?background: var\(--shooter-selection-badge-bg\) !important;/,
  );
});
