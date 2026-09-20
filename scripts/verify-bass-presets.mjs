import assert from "node:assert/strict";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    || "file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : { executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" }),
});

try {
  for (const [width, height] of [[360, 800], [375, 812], [390, 844], [393, 852], [430, 932]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true });
    page.on("dialog", (dialog) => dialog.dismiss());
    await page.goto(`${process.env.TEST_URL || "http://127.0.0.1:5175/"}#tuner`);
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /악기 선택, 현재/ }).click();
    await page.getByRole("radio", { name: /베이스/ }).click();
    const panel = page.locator('.tunerHeadstockPanel[data-instrument="bass"]');
    const selectPreset = async (label, image, strings, firstTarget) => {
      await page.getByRole("button", { name: /튜닝 프리셋 선택, 현재/ }).click();
      await page.getByRole("radio", { name: new RegExp(label) }).click();
      await page.waitForTimeout(150);
      assert.equal(await panel.locator(".tunerPegHotspot").count(), strings);
      assert.equal(await panel.locator("img").first().getAttribute("src"), image);
      if (firstTarget) assert.match(await panel.locator(".tunerPegHotspot").first().getAttribute("aria-label"), new RegExp(firstTarget));
      await panel.locator(".tunerPegHotspot").first().click();
      const selected = await panel.locator('[data-selected="true"]').getAttribute("aria-label");
      const gesture = panel.locator(".tunerHeadstockDesignGesture");
      const bounds = await gesture.boundingBox();
      const cdp = await page.context().newCDPSession(page);
      const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height * 0.7;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - 85 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(300);
      assert.equal(await panel.locator("img").first().getAttribute("src"), `/assets/tuner/just-play-bass-${strings}-pink-headstock.png`);
      assert.equal(await panel.locator('[data-selected="true"]').getAttribute("aria-label"), selected);
      assert.equal(await panel.locator(".tunerPegHotspot").count(), strings);
      await page.screenshot({ path: `artifacts/tuner-design/bass-${strings}-pink-${width}.png` });
      await gesture.focus();
      await page.keyboard.press("ArrowUp");
      await panel.locator(".tunerPegHotspot").first().click();
      assert.equal(await panel.locator("img").first().getAttribute("src"), image);
      await cdp.detach();
    };
    await selectPreset("4현 스탠다드", "/assets/tuner/just-play-bass-headstock.png", 4, "4번 줄");
    await selectPreset("5현 스탠다드", "/assets/tuner/just-play-bass-5-headstock.png", 5, "5번 줄");
    await page.waitForTimeout(250);
    await page.screenshot({ path: `artifacts/tuner-design/bass-5-${width}.png` });
    await selectPreset("6현 스탠다드", "/assets/tuner/just-play-bass-6-headstock.png", 6, "6번 줄");
    const geometry = await panel.locator(".tunerPegHotspot").evaluateAll((buttons) => {
      const boxes = buttons.map((button) => button.getBoundingClientRect());
      return { overlap: boxes.some((a, i) => boxes.slice(i + 1).some((b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top)) };
    });
    assert.equal(geometry.overlap, false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `artifacts/tuner-design/bass-6-${width}.png` });
    console.log(`PASS bass 4/5/6 preset UI at ${width}x${height}`);
    await page.close();
  }
} finally {
  await browser.close();
}
