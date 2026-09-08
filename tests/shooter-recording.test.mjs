import assert from "node:assert/strict";
import test from "node:test";
import { coverSourceRect, drawComposite, cameraOverlayRect, recorderOptions, saveRecording } from "../src/shooter/recording/recordingMedia.js";

test("recorder negotiates MP4, then WebM, then browser defaults", () => {
  assert.match(recorderOptions({ isTypeSupported: (type) => type === "video/mp4" }).mimeType, /mp4/);
  assert.equal(recorderOptions({ isTypeSupported: (type) => type === "video/webm" }).mimeType, "video/webm");
  assert.equal(recorderOptions({ isTypeSupported: () => false }).mimeType, undefined);
  assert.throws(() => recorderOptions(null), /지원하지 않습니다/);
});

test("composite preserves the complete game and places the mirrored camera at its live position", () => {
  const calls = [];
  const ctx = Object.fromEntries(["fillRect", "drawImage", "save", "translate", "scale", "restore", "beginPath", "rect", "clip"].map(name => [name, (...args) => calls.push([name, ...args])]));
  const game = { width: 430, height: 844 };
  const camera = { readyState: 2, videoWidth: 1280, videoHeight: 720 };
  const overlay = { x: .6, y: .2, width: .36, height: .18 };
  drawComposite(ctx, game, camera, 430, 844, overlay);
  const frames = calls.filter(([name]) => name === "drawImage");
  assert.deepEqual(frames[0].slice(2), [0, 0, 430, 844]);
  assert.deepEqual(frames[1].slice(6), [0, 0, 430 * .36, 844 * .18]);
  assert.ok(calls.some(([name, x, y]) => name === "translate" && x === 430 * .6 + 430 * .36 && y === 844 * .2));
  assert.ok(calls.some(([name, x, y]) => name === "scale" && x === -1 && y === 1));
  assert.deepEqual(coverSourceRect(100, 100, 200, 100), [0, 25, 100, 50]);
});

test("saving uses file sharing and never downloads after user cancellation", async () => {
  const blob = new Blob(["video"], { type: "video/mp4" });
  let shared;
  assert.equal(await saveRecording(blob, "blob:test", { canShare: () => true, share: async value => { shared = value; } }, {}), "shared");
  assert.match(shared.files[0].name, /\.mp4$/);
  await assert.rejects(saveRecording(blob, "blob:test", { canShare: () => true, share: async () => { throw new DOMException("cancel", "AbortError"); } }, {}), { name: "AbortError" });
});

test("download fallback retains the video URL and uses its actual extension", async () => {
  const events = [];
  const anchor = { click() { events.push("click"); }, remove() { events.push("remove"); } };
  const doc = { createElement: () => anchor, body: { appendChild: () => events.push("append") } };
  assert.equal(await saveRecording(new Blob(["video"], { type: "video/webm" }), "blob:keep-me", { canShare: () => true, share: async () => { throw new Error("unavailable"); } }, doc), "download");
  assert.equal(anchor.href, "blob:keep-me");
  assert.match(anchor.download, /\.webm$/);
  assert.deepEqual(events, ["append", "click", "remove"]);
});

test("camera corners stay within the game panel on phone and desktop sizes", () => {
  for (const [width, height, mobile] of [[360,700,true],[390,764,true],[430,844,true],[1005,658,false]]) {
    for (const x of [0,1]) for (const y of [0,1]) {
      const rect = cameraOverlayRect(width,height,{x,y},mobile);
      assert.ok(rect.x >= 0 && rect.y >= 40);
      assert.ok(rect.x + rect.width <= width);
      assert.ok(rect.y + rect.height <= height);
      assert.ok(rect.height < height / 2);
    }
  }
});

test("resizing camera preserves aspect and clamps all sizes inside the panel", () => {
  for (const mobile of [true, false]) for (const size of [.01, .8, 1, 1.5, 20]) {
    const rect = cameraOverlayRect(390, 764, {x:1,y:1}, mobile, size);
    assert.ok(rect.width >= 104);
    assert.ok(rect.width <= (mobile ? 280 : 374));
    assert.ok(Math.abs(rect.height / rect.width - 1.12) < 1e-10);
    assert.ok(rect.x >= 8 && rect.y >= 48);
    assert.ok(rect.x + rect.width <= 382);
    assert.ok(rect.y + rect.height <= 748);
  }
});

test("mobile bottom dock shows the full camera framing without cropping the player", () => {
  const calls = [];
  const ctx = Object.fromEntries(["fillRect", "drawImage", "save", "translate", "scale", "restore", "beginPath", "rect", "clip"].map(name => [name, (...args) => calls.push([name, ...args])]));
  const game = { width: 430, height: 844 };
  const camera = { readyState: 2, videoWidth: 1280, videoHeight: 720 };
  drawComposite(ctx, game, camera, 430, 932, { x: 0, y: 844/932, width: 1, height: 88/932, gameFraction: 844/932, fit: "contain" });
  const frames = calls.filter(([name]) => name === "drawImage");
  assert.deepEqual(frames[0].slice(2), [0, 0, 430, 844]);
  assert.equal(frames[1].length, 6, "Draw the complete source without a crop rectangle");
  assert.ok(Math.abs(frames[1][4] / frames[1][5] - 1280/720) < 1e-10);
  assert.ok(calls.some(([name,x,y]) => name === "translate" && x === 430 && y === 844));
});

test("raised dock crops only the covered map footer without scaling the visible map", () => {
  const calls = [];
  const ctx = Object.fromEntries(["fillRect", "drawImage", "save", "translate", "scale", "restore", "beginPath", "rect", "clip"].map(name => [name, (...args) => calls.push([name, ...args])]));
  const game = {width:430,height:844};
  drawComposite(ctx,game,{readyState:0},430,932,{gameFraction:744/932,gameSourceFraction:744/844});
  const call = calls.find(([name]) => name === "drawImage");
  assert.deepEqual(call.slice(2),[0,0,430,744,0,0,430,744]);
});


test("camera zoom preserves aspect and clips enlargement to the dock", () => {
  const calls = [];
  const ctx = Object.fromEntries(["fillRect", "drawImage", "save", "translate", "scale", "restore", "beginPath", "rect", "clip"].map(name => [name, (...args) => calls.push([name, ...args])]));
  const camera = {readyState:2, videoWidth:720, videoHeight:1280};
  drawComposite(ctx, null, camera, 400, 800, {x:0,y:.75,width:1,height:.25,fit:"contain",zoom:1.2});
  const draw = calls.find(([name]) => name === "drawImage");
  assert.deepEqual(draw.slice(2), [132.5,-20,135,240]);
  assert.deepEqual(calls.find(([name]) => name === "rect"), ["rect",0,0,400,200]);
  assert.ok(calls.findIndex(([name]) => name === "clip") < calls.findIndex(([name]) => name === "drawImage"));
});
