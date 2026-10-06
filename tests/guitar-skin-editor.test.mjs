import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import guitarSkinEditorPlugin, { GUITAR_SKIN_DELETE_ENDPOINT } from "../scripts/guitar-skin-editor.mjs";
import { deleteGuitarSkinFromCatalog, GUITAR_SKIN_CATALOG } from "../src/shooter/instruments/guitarSkinCatalog.js";
import { HERITAGE_INSTRUMENT_PACK } from "../src/shooter/instruments/heritageInstrumentPack.js";

test("custom collection contains five individually specified instruments per category", () => {
  assert.equal(HERITAGE_INSTRUMENT_PACK.length, 15);
  assert.equal(new Set(HERITAGE_INSTRUMENT_PACK.map((skin) => skin.id)).size, 15);
  for (const category of ["acoustic", "electric", "bass"]) {
    const skins = HERITAGE_INSTRUMENT_PACK.filter((skin) => skin.category === category);
    assert.equal(skins.length, 5);
    for (const skin of skins) {
      assert.equal(skin.stringCount, category === "bass" ? 4 : 6);
      assert.match(skin.description, /FL CUSTOM/);
      assert.ok(skin.collisionAspectRatio > .2 && skin.collisionAspectRatio < .6);
      assert.ok(skin.muzzleHeightScale > .9 && skin.muzzleHeightScale < 1);
    }
  }
});

test("deletion is idempotent, validates IDs and retains one instrument per category", () => {
  const catalog = [{ id: "a", category: "acoustic" }, { id: "b", category: "acoustic" }, { id: "c", category: "bass" }];
  assert.deepEqual(deleteGuitarSkinFromCatalog([], "a", catalog), ["a"]);
  assert.deepEqual(deleteGuitarSkinFromCatalog(["a"], "a", catalog), ["a"]);
  assert.throws(() => deleteGuitarSkinFromCatalog(["a"], "b", catalog), /at least one/);
  assert.throws(() => deleteGuitarSkinFromCatalog([], "c", catalog), /at least one/);
  assert.throws(() => deleteGuitarSkinFromCatalog([], "../../App.jsx", catalog), /Unknown/);
});

test("development endpoint persists concurrent deletions and rejects cross-origin mutations", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fl-guitar-skin-test-"));
  const file = join(dir, "deleted.json");
  await writeFile(file, "[]\n");
  let handler;
  const plugin = guitarSkinEditorPlugin({ catalogPath: pathToFileURL(file) });
  assert.equal(plugin.apply, "serve");
  plugin.configureServer({ middlewares: { use(fn) { handler = fn; } } });
  const server = createServer((request, response) => handler(request, response, () => {
    response.statusCode = 404;
    response.end();
  }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const url = origin + GUITAR_SKIN_DELETE_ENDPOINT;
  const post = (id, extra = {}) => fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin, ...extra },
    body: JSON.stringify({ id }),
  });
  try {
    assert.equal((await fetch(url)).status, 405);
    assert.equal((await post("heritage-dreadnought", { Origin: "https://foreign.example" })).status, 403);
    assert.equal((await post("heritage-dreadnought", { "Sec-Fetch-Site": "cross-site" })).status, 403);
    assert.equal((await post("unknown-guitar")).status, 400);
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")), []);
    const responses = await Promise.all([post("heritage-dreadnought"), post("stage-aurora-12")]);
    assert.deepEqual(responses.map((response) => response.status), [200, 200]);
    assert.deepEqual(new Set(JSON.parse(await readFile(file, "utf8"))), new Set(["heritage-dreadnought", "stage-aurora-12"]));
    assert.equal((await post("heritage-dreadnought")).status, 200);
    assert.equal(JSON.parse(await readFile(file, "utf8")).length, 2);
    assert.ok(GUITAR_SKIN_CATALOG.some((skin) => skin.id === "bass_velvet_bloom_v1"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await unlink(file);
    await rmdir(dir);
  }
});
