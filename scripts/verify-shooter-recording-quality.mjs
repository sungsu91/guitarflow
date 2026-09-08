// QA-only Playwright dependency; run against Vite with the same environment as
// verify-shooter-recording-browser.mjs. Images are renderer output, not video UI.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.RECORDING_TEST_URL || "http://127.0.0.1:5173";
const output = process.env.RECORDING_TEST_OUTPUT || "artifacts/shooter-recording/quality";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ["camera", "microphone"] });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${origin}/#shooter`);
  await page.getByRole("button", { name: "촬영모드", exact: true }).waitFor();
  await page.waitForTimeout(2500);
  await page.evaluate(async () => {
    const { createSceneCapture } = await import("/src/shooter/recording/sceneCapture.js");
    window.qualityCapture = createSceneCapture(document.querySelector(".shooterPanel"));
    await window.qualityCapture.capture();
  });
  async function snapshot(name) {
    const data = await page.evaluate(async () => {
      const capture = window.qualityCapture;
      let canvas = await capture.capture();
      const deadline = performance.now() + 5000;
      while (capture.stats.pending && performance.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 20));
        canvas = await capture.capture();
      }
      return { image: canvas.toDataURL(), width: canvas.width, pending: capture.stats.pending };
    });
    assert.equal(data.width, 1080);
    assert.equal(data.pending, 0);
    await writeFile(`${output}/${name}-recorded.png`, Buffer.from(data.image.split(",")[1], "base64"));
    await page.locator(".shooterPanel").screenshot({ path: `${output}/${name}-live.png` });
  }
  await snapshot("lobby");
  await page.locator(".mobileShooterStartButton.primary").click();
  await page.locator(".shooterCountInOverlay").waitFor();
  await snapshot("countdown");
  await page.locator(".shooterCountInOverlay").waitFor({ state: "hidden" });
  // Measure actual scene rendering during gameplay, including moving monsters.
  for (const withCapture of [false, true]) {
    const result = await page.evaluate(async withCapture => {
      const timings = [], intervals = [], capture = window.qualityCapture;
      const start = performance.now();
      let last = start;
      await Promise.all([new Promise(resolve => {
        const tick = now => {
          intervals.push(now - last); last = now;
          if (now - start >= 5000) resolve(); else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }), withCapture ? new Promise((resolve, reject) => {
        const draw = async () => {
          try {
              const begin = performance.now();
              await capture.capture();
              timings.push(performance.now() - begin);
              if (performance.now() - start >= 5000) resolve(); else setTimeout(draw, Math.max(0, 1000 / 30 - (performance.now() - begin)));
          } catch (error) { reject(error); }
        };
        draw();
      }) : Promise.resolve()]);
      const percentile = (values, p) => [...values].sort((a,b) => a-b)[Math.floor((values.length-1)*p)] || 0;
      return { withCapture, frames: timings.length, rafFps: intervals.length * 1000 / (performance.now()-start), renderP50: percentile(timings,.5), renderP95: percentile(timings,.95), rafP95: percentile(intervals,.95), textureBuilds: capture.stats.textureBuilds };
    }, withCapture);
    results.push(result);
    console.log(JSON.stringify(result));
  }
  await page.locator(".shooterArena").click({ position: { x: 210, y: 220 } });
  await page.locator(".shooterPausePanel").waitFor();
  await snapshot("paused");
  assert.deepEqual(errors, []);
  await page.evaluate(() => window.qualityCapture.dispose());
  // Deterministic pixel regression: a 36-cell sheet must preserve all four
  // quadrants, and a small SVG pause icon must stay inside its original box.
  await page.setContent('<style>body{margin:0}*{box-sizing:border-box}</style><div id="fixture" style="position:relative;width:360px;height:180px;background:rgb(16,20,24)"><div id="sprite" style="position:absolute;left:0;top:0;width:32px;height:32px"></div><svg style="position:absolute;left:80px;top:10px;width:24px;height:24px" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M8 4v16M16 4v16"/></svg></div>');
  const pixels = await page.evaluate(async () => {
    const sheet = document.createElement("canvas"); sheet.width = 36 * 32; sheet.height = 32;
    const ctx = sheet.getContext("2d"); ctx.fillStyle = "cyan"; ctx.fillRect(0,0,sheet.width,32);
    for (const [x,y,color] of [[0,0,"red"],[16,0,"lime"],[0,16,"blue"],[16,16,"yellow"]]) {
      ctx.fillStyle=color; ctx.fillRect(11*32+x,y,16,16);
    }
    const style = document.createElement("style");
    style.textContent = `#sprite::before{content:"";position:absolute;inset:0;background-image:url("${sheet.toDataURL()}");background-size:3600% 100%;background-position:${11/35*100}% 0;background-repeat:no-repeat}`;
    document.head.append(style);
    const countdown = document.createElement('div');
    countdown.className = 'shooterCountInOverlay';
    countdown.style.cssText = 'position:absolute;left:160px;top:0;width:100px;height:60px;';
    countdown.innerHTML = '<strong style="display:block;width:100px;height:60px;font:bold 50px Arial;background:linear-gradient(cyan,magenta);background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent">2</strong>';
    document.querySelector('#fixture').append(countdown);
    const { createSceneCapture } = await import("/src/shooter/recording/sceneCapture.js");
    const capture = createSceneCapture(document.querySelector("#fixture"));
    const canvas = await capture.capture(); const output = canvas.getContext("2d");
    const sample = (x,y) => Array.from(output.getImageData(x*3,y*3,1,1).data);
    const textPixels = output.getImageData(160*3,0,100*3,60*3).data;
    let coloredTextPixels = 0;
    for (let i=0;i<textPixels.length;i+=4) if (textPixels[i+2] > 100 && (textPixels[i] > 60 || textPixels[i+1] > 60)) coloredTextPixels++;
    const result = { corners: [[8,8],[24,8],[8,24],[24,24]].map(([x,y])=>sample(x,y)), pause: sample(88,20), outside: sample(110,20), textCorner: sample(250,5), coloredTextPixels };
    capture.dispose();
    const cancelled = createSceneCapture(document.querySelector("#fixture"));
    const pending = cancelled.capture(); cancelled.dispose();
    result.cancelled = (await Promise.allSettled([pending]))[0].status;
    return result;
  });
  assert.deepEqual(pixels.corners, [[255,0,0,255],[0,255,0,255],[0,0,255,255],[255,255,0,255]]);
  assert.deepEqual(pixels.pause, [255,255,255,255]);
  assert.deepEqual(pixels.outside, [16,20,24,255]);
  assert.deepEqual(pixels.textCorner, [16,20,24,255], 'Text gradient must not fill its bounding rectangle');
  assert.ok(pixels.coloredTextPixels > 50, 'Gradient must fill the numeral, not render black text');
  assert.equal(pixels.cancelled, "rejected");
  results.push({ spriteAndSvgPixels: "passed", preparationCancellation: "passed" });
  await writeFile(`${output}/performance.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
