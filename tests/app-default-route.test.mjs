import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSourceUrl = new URL("../src/App.jsx", import.meta.url);

test("app launch and shooter use the requested operational defaults", async () => {
  const appSource = await readFile(appSourceUrl, "utf8");

  assert.match(appSource, /const APP_DEFAULT_ROUTE = APP_ROUTES\.FRETBOARD_VIEWER;/);
  assert.match(appSource, /const normalizedHash = hash \|\| APP_DEFAULT_ROUTE;/);
  assert.match(appSource, /\{ appRoute: APP_DEFAULT_ROUTE \}/);
  assert.match(
    appSource,
    /`\$\{window\.location\.pathname\}\$\{window\.location\.search\}\$\{APP_DEFAULT_ROUTE\}`/,
  );
  assert.match(appSource, /const DEFAULT_SHOOTER_MAP_ID = "river-garden";/);
  assert.match(appSource, /localStorage\.setItem\(SHOOTER_MAP_STORAGE_KEY, nextMap\.id\)/);
});
