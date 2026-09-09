// Run against a local Vite server. Playwright is a QA-only dependency.
// PLAYWRIGHT_MODULE may point to an existing installation's file URL.
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
});
const origin = process.env.RECORDING_TEST_URL || "http://127.0.0.1:5173";
const output = process.env.RECORDING_TEST_OUTPUT || "artifacts/shooter-recording";
await mkdir(output, { recursive: true });
const results = [];
const mobileOnly = process.env.RECORDING_TEST_MOBILE_ONLY === "1";

async function open(mobile = true, fault = "") {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 768 }, isMobile: mobile, hasTouch: mobile, permissions: ["camera", "microphone"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("dialog", dialog => dialog.dismiss());
  if (process.env.RECORDING_TEST_FACE) await page.route('**/__qa_skin_photo.jpg', async route => route.fulfill({body:await readFile(process.env.RECORDING_TEST_FACE),contentType:'image/jpeg'}));
  await page.addInitScript(({fault,face}) => {
    window.recordingQA = { streams: [], outputs: [], revoked: [], initialSettingsReads: 0 };
    const readStorage = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key) {
      if (["guitarTrainer.miniChordMakerDraft.v1", "rifflab.userBeatPresets.v1"].includes(key)) window.recordingQA.initialSettingsReads++;
      return readStorage.call(this, key);
    };
    Object.defineProperty(navigator, "canShare", { value: () => false });
    const get = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      if (constraints.audio && fault === "denyMicrophone") throw new DOMException("denied", "NotAllowedError");
      if (constraints.video && window.recordingQA.denyCamera) throw new DOMException("denied", "NotAllowedError");
      let stream;
      if (face && constraints.video) {
        const photo=new Image();photo.src='/__qa_skin_photo.jpg';await photo.decode();
        const c=document.createElement('canvas');c.width=666;c.height=888;const ctx=c.getContext('2d');
        let frame=0;const paint=()=>{ctx.fillStyle='#102030';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(photo,0,195,666,888,Math.sin(frame++*.07)*28,0,666,888);};
        paint();const timer=setInterval(paint,33);stream=c.captureStream(30);
        const track=stream.getVideoTracks()[0],stop=track.stop.bind(track);track.stop=()=>{clearInterval(timer);stop();};
      } else stream = await get(constraints);
      window.recordingQA.streams.push(stream);
      if (constraints.video && window.recordingQA.delayCamera) await new Promise(resolve => { window.recordingQA.resolveCamera = resolve; });
      return stream;
    };
    const NativeRecorder = MediaRecorder;
    window.MediaRecorder = class extends NativeRecorder {
      constructor(stream, options) {
        if (window.recordingQA.failRecorder) throw new Error("녹화 시험 오류");
        super(stream, options);
        window.recordingQA.outputs.push(stream);
        window.recordingQA.recorder = this;
      }
    };
    const revoke = URL.revokeObjectURL;
    URL.revokeObjectURL = url => { window.recordingQA.revoked.push(url); revoke(url); };
  }, {fault,face:!!process.env.RECORDING_TEST_FACE});
  await page.goto(`${origin}/#shooter`);
  await page.getByRole("button", { name: "촬영모드", exact: true }).waitFor({ timeout: 60000 });
  return { page, context, errors };
}
const metrics = page => page.evaluate(() => {
  const arena = document.querySelector(".shooterArena");
  return { width: arena.clientWidth, height: arena.clientHeight, nav: !!document.querySelector(".hud > .modeSwitch") };
});
async function enter(page) {
  await page.getByRole("button", { name: "촬영모드", exact: true }).click();
  await page.getByRole("button", { name: "● REC", exact: true }).waitFor({ timeout: 30000 });
  if (["1", "2"].includes(process.env.RECORDING_TEST_BEAUTY)) {
    await page.getByRole('button', {name:'피부 보정: 끔', exact:true}).click();
    await page.getByRole('button', {name:'피부 보정: 자연', exact:true}).waitFor();
    if (process.env.RECORDING_TEST_BEAUTY === '2') {
      await page.getByRole('button', {name:'피부 보정: 자연', exact:true}).click();
      await page.getByRole('button', {name:'피부 보정: 매끈', exact:true}).waitFor();
    }
    await page.waitForFunction(() => document.querySelector('.shooterRecordingBeautyPreview')?.width > 300);
  }
}
async function assertReleased(page) {
  const status = await page.evaluate(() => ({
    camera: window.recordingQA.streams.flatMap(s => s.getVideoTracks()).map(t => t.readyState),
    outputs: window.recordingQA.outputs.flatMap(s => s.getTracks()).map(t => t.readyState),
    micLive: window.recordingQA.streams.some(s => s.getAudioTracks().some(t => t.readyState === "live")),
    captureFrames: document.querySelectorAll("iframe[data-recording-ui]").length,
    layout: document.querySelector("main").dataset.shooterRecording,
  }));
  assert.ok(status.camera.every(s => s === "ended"));
  assert.ok(status.outputs.every(s => s === "ended"));
  assert.equal(status.captureFrames, 0);
  assert.equal(status.layout, undefined);
  return status;
}

try {
  for (const mobile of (mobileOnly ? [true] : [true, false])) {
    const { page, context, errors } = await open(mobile);
    const name = mobile ? "mobile" : "desktop";
    const before = await metrics(page);
    await page.locator(".mobileShooterStartButton.primary").click();
    await enter(page);
    const during = await metrics(page);
    assert.deepEqual(during, { ...before, nav: !mobile && before.nav });
    await page.getByRole("button", { name: "촬영모드 종료", exact: true }).waitFor();
    if (mobile) {
      const geometry = await page.evaluate(() => {
        const panel = document.querySelector(".shooterPanel").getBoundingClientRect();
        const camera = document.querySelector(".shooterRecordingCamera").getBoundingClientRect();
        return { panelBottom: panel.bottom, lift: document.querySelector(".shooterArena").getBoundingClientRect().height * .16, cameraTop: camera.top, cameraBottom: camera.bottom, height: window.innerHeight, fit: getComputedStyle(document.querySelector("video.shooterRecordingLive")).objectFit };
      });
      assert.ok(Math.abs(geometry.panelBottom - geometry.cameraTop) < 1);
      assert.ok(Math.abs(geometry.cameraBottom - geometry.height) < 1);
      assert.equal(geometry.fit, "contain");
      assert.equal(await page.locator('.shooterRecordingCamera input[type="range"]').count(), 0);
      const wide = page.getByRole('button', { name: '넓게 찍기', exact: true });
      // Unsupported hardware must not expose a nonfunctional control.
      assert.equal(await wide.count(), 0);
      const cameraBounds = await page.locator('.shooterRecordingCamera').boundingBox();
      assert.ok(Math.abs(cameraBounds.height / geometry.height - .315) < .005);
      const framing = await page.locator('video.shooterRecordingLive').evaluate(video => {
        const r = video.getBoundingClientRect(), dock = video.parentElement.getBoundingClientRect();
        return {left:r.left,right:r.right,dockLeft:dock.left,dockRight:dock.right,aspect:r.width/r.height,sourceAspect:video.videoWidth/video.videoHeight};
      });
      assert.ok(framing.left >= framing.dockLeft - 1 && framing.right <= framing.dockRight + 1, 'Do not cut guitar ends off horizontally');
      assert.ok(Math.abs(framing.aspect - framing.sourceAspect) < .01);
      assert.equal(await page.locator('.shooterPanel > .shooterPitchMonitorMobile').count(), 1);
      const cdp = await page.context().newCDPSession(page);
      async function swipeFilter(direction) {
        const x = direction < 0 ? 255 : 125, y = cameraBounds.y + cameraBounds.height * .55;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let i = 1; i <= 8; i++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + direction * i * 15, y }] });
          await page.waitForTimeout(20);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      }
      await swipeFilter(-1);
      assert.equal(await page.locator('.shooterRecordingFilterName').innerText(), '따뜻하게');
      await swipeFilter(1);
      assert.equal(await page.locator('.shooterRecordingFilterName').innerText(), '원본');
      for (let i = 0; i < 3; i++) await swipeFilter(-1);
      assert.equal(await page.locator('.shooterRecordingFilterName').innerText(), '흑백');
      assert.equal(await page.getByRole("button", { name: "카메라 위치 이동" }).count(), 0);
    } else {
    const cameraBefore = await page.locator(".shooterRecordingCamera").boundingBox();
    await page.getByRole("button", { name: "카메라 위치 이동", exact: true }).press("ArrowLeft");
    await page.waitForTimeout(100);
    const cameraAfter = await page.locator(".shooterRecordingCamera").boundingBox();
    assert.ok(cameraAfter.x < cameraBefore.x);
    const handle = await page.getByRole("button", { name: "카메라 크기 조절", exact: true }).boundingBox();
    await page.mouse.move(handle.x + 15, handle.y + 15);
    await page.mouse.down();
    await page.mouse.move(handle.x - 15, handle.y - 15, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    const resized = await page.locator(".shooterRecordingCamera").boundingBox();
    assert.ok(resized.width < cameraAfter.width - 15);
    assert.ok(Math.abs(resized.height / resized.width - 1.12) < .01);
    assert.deepEqual(await metrics(page), before);
    }
    await page.screenshot({ path: `${output}/${name}-preview.png` });
    await page.getByRole("button", { name: "● REC", exact: true }).click();
    await page.getByRole("button", { name: "녹화 중지" }).waitFor({ timeout: 30000 });
    assert.equal(await page.getByRole('button', { name: '넓게 찍기', exact: true }).count(), 0);
    const initialReads = await page.evaluate(() => window.recordingQA.initialSettingsReads);
    await page.waitForTimeout(8000);
    assert.equal(await page.evaluate(() => window.recordingQA.initialSettingsReads), initialReads, "Gameplay renders must not reload initial arrangement settings");
    const tracks = await page.evaluate(() => window.recordingQA.outputs.at(-1).getTracks().map(t => t.kind).sort());
    assert.deepEqual(tracks, ["audio", "video"]);
    await page.getByRole("button", { name: "녹화 중지" }).click();
    await page.getByRole("button", { name: "영상 저장", exact: true }).waitFor({ timeout: 20000 });
    await page.waitForFunction(() => document.querySelector(".shooterRecordingReview video")?.readyState >= 2);
    assert.equal(await page.locator('.shooterRecordingCamera').count(), 0, 'Live camera must unmount during playback');
    const reviewGeometry = await page.locator(".shooterRecordingReview").evaluate(node => {
      const video = node.querySelector("video"), actions = node.querySelector(":scope > div");
      return { fit: getComputedStyle(video).objectFit, bottom: video.getBoundingClientRect().bottom, actionsTop: actions.getBoundingClientRect().top, actionsBottom: actions.getBoundingClientRect().bottom, height: node.getBoundingClientRect().bottom };
    });
    assert.equal(reviewGeometry.fit, "contain");
    assert.ok(reviewGeometry.bottom <= reviewGeometry.actionsTop + 1);
    assert.ok(reviewGeometry.actionsBottom <= reviewGeometry.height + 1);
    const video = await page.locator(".shooterRecordingReview video").evaluate(async node => {
      const blob = await fetch(node.src).then(r => r.blob());
      await new Promise((resolve, reject) => {
        node.addEventListener("seeked", resolve, { once: true });
        node.addEventListener("error", reject, { once: true });
        node.currentTime = 1;
      });
      return { width: node.videoWidth, height: node.videoHeight, size: blob.size, type: blob.type, url: node.src };
    });
    assert.ok(video.size > 1000);
    assert.equal(video.width, 1080);
    assert.ok(video.height > 0);
    if (mobile) {
      const pixel = await page.locator('.shooterRecordingReview video').evaluate(node => {
        const canvas = document.createElement('canvas'); canvas.width = node.videoWidth; canvas.height = node.videoHeight;
        const ctx = canvas.getContext('2d'); ctx.drawImage(node, 0, 0);
        return Array.from(ctx.getImageData(canvas.width * .5, canvas.height * .85, 1, 1).data);
      });
      assert.ok(Math.max(...pixel.slice(0, 3)) - Math.min(...pixel.slice(0, 3)) < 8, 'Saved camera frame must include grayscale filter');
      assert.ok(pixel[0] > 20, 'Verify camera pixels, not black padding');
    }
    const frames = await page.locator(".shooterRecordingReview video").evaluate(async node => {
      const canvas = document.createElement("canvas");
      canvas.width = node.videoWidth; canvas.height = node.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const frames = [];
      for (const time of [1, 2, 3]) {
        if (Math.abs(node.currentTime - time) > .01) await new Promise(resolve => {
          node.addEventListener("seeked", resolve, { once: true }); node.currentTime = time;
        });
        ctx.drawImage(node, 0, 0);
        const pixels = ctx.getImageData(canvas.width * .35, canvas.height * .2, 120, canvas.height * .45).data;
        frames.push({ image: canvas.toDataURL(), sample: Array.from(pixels.filter((_, i) => i % 64 === 0)) });
      }
      return frames;
    });
    assert.notDeepEqual(frames[0].sample, frames[2].sample, "Recorded gameplay must advance independently of the camera");
    for (let index = 0; index < frames.length; index++) await writeFile(`${output}/${name}-frame-${index + 1}.png`, Buffer.from(frames[index].image.split(",")[1], "base64"));
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "영상 저장", exact: true }).click()]);
    await download.saveAs(`${output}/${name}.${video.type.includes("mp4") ? "mp4" : "webm"}`);
    await page.screenshot({ path: `${output}/${name}-review.png` });
    await page.getByRole("button", { name: "다시 촬영", exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.shooterRecordingCamera video')?.readyState >= 2);
    assert.equal(await page.locator('.shooterRecordingReview').count(), 0);
    assert.ok(await page.evaluate(url => window.recordingQA.revoked.includes(url), video.url));
    if (mobile) {
      await page.getByRole('button', { name: '● REC', exact: true }).click();
      await page.getByRole('button', { name: '녹화 중지' }).waitFor({ timeout: 30000 });
      await page.waitForTimeout(1500);
      // Simulate lifecycle delivery, including pagehide following visibilitychange.
      // This checks our ownership logic, not actual OS background execution.
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
      });
      await page.getByRole('button', { name: '영상 저장', exact: true }).waitFor({ timeout: 20000 });
      await page.evaluate(() => {
        delete document.hidden; delete document.visibilityState;
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      });
      await page.waitForFunction(() => document.querySelector('.shooterRecordingReview video')?.readyState >= 2);
      assert.match(await page.locator('.shooterRecordingReview p').innerText(), /여기까지 찍은 영상/);
      assert.ok(await page.locator('.shooterRecordingReview video').evaluate(async node => (await fetch(node.src).then(r => r.blob())).size > 1000));
      results.push({ name: 'backgroundRetainsRecording', passed: true });
    }
    await (mobile ? page.locator('.shooterRecordingReview') : page).getByRole("button", { name: "촬영모드 종료", exact: true }).click();
    assert.deepEqual(await metrics(page), before);
    const resources = await assertReleased(page);
    assert.equal(resources.micLive, true, "Recording must not stop game microphone input");
    assert.deepEqual(errors, []);
    results.push({ name, before, video, resources });
    await context.close();
  }
  for (const fault of (mobileOnly ? [] : ["denyCamera", "denyMicrophone", "unsupported", "failRecorder", "lateCamera", "navigation", "recordingError", "endedTrack", "emptyBlob", "urlFailure"])) {
    const { page, context, errors } = await open(true, fault);
    const before = await metrics(page);
    if (fault === "unsupported") await page.evaluate(() => { window.MediaRecorder = undefined; });
    if (fault === "denyCamera") await page.evaluate(() => { window.recordingQA.denyCamera = true; });
    if (fault === "lateCamera") await page.evaluate(() => { window.recordingQA.delayCamera = true; });
    await page.getByRole("button", { name: "촬영모드", exact: true }).click();
    if (fault === "lateCamera") {
      await page.waitForFunction(() => window.recordingQA.resolveCamera);
      await page.getByRole("button", { name: "권한 확인 중 · 취소" }).click();
      await page.evaluate(() => window.recordingQA.resolveCamera());
      await page.waitForFunction(() => window.recordingQA.streams.flatMap(s => s.getVideoTracks()).every(t => t.readyState === "ended"));
    } else if (["denyCamera", "denyMicrophone", "unsupported"].includes(fault)) {
      await page.getByRole("alert").waitFor();
    } else {
      await page.getByRole("button", { name: "● REC", exact: true }).waitFor();
      if (fault === "navigation") {
        await page.evaluate(() => { location.hash = "tuner"; });
        await page.waitForFunction(() => !document.querySelector(".shooterRecordingUI"));
      } else if (fault === "endedTrack") {
        await page.evaluate(() => window.recordingQA.streams.flatMap(s => s.getVideoTracks()).at(-1).dispatchEvent(new Event("ended")));
        await page.getByRole("alert").waitFor();
      } else {
        if (fault === "failRecorder") await page.evaluate(() => { window.recordingQA.failRecorder = true; });
        await page.getByRole("button", { name: "● REC", exact: true }).click();
        if (fault === "recordingError") {
          await page.getByRole("button", { name: "녹화 중지" }).waitFor({ timeout: 30000 });
          await page.evaluate(() => window.recordingQA.recorder.dispatchEvent(new Event("error")));
        }
        if (["emptyBlob", "urlFailure"].includes(fault)) {
          await page.getByRole("button", { name: "녹화 중지" }).waitFor({ timeout: 30000 });
          await page.evaluate(fault => {
            if (fault === "emptyBlob") window.recordingQA.recorder.ondataavailable = () => {};
            else URL.createObjectURL = () => { throw new Error("영상 생성 시험 오류"); };
          }, {fault,face:!!process.env.RECORDING_TEST_FACE});
          await page.getByRole("button", { name: "녹화 중지" }).click();
        }
        await page.getByRole("alert").waitFor({ timeout: 30000 });
      }
    }
    if (fault !== "navigation") assert.deepEqual(await metrics(page), before);
    await assertReleased(page);
    assert.deepEqual(errors, []);
    results.push({ name: fault, passed: true });
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
  await writeFile(`${output}/verification.json`, JSON.stringify(results, null, 2));
} finally { await browser.close(); }

