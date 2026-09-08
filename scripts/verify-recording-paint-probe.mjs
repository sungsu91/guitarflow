import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
try {
  const page = await browser.newPage();
  await page.goto(`${process.env.RECORDING_TEST_URL || 'http://127.0.0.1:5173'}/src/shooter/recording/paintTexture.js`);
  await page.setContent('<div id="paint" style="width:24px;height:24px;background:blue"></div>');
  const result = await page.evaluate(async () => {
    const { createPaintTexture } = await import('/src/shooter/recording/paintTexture.js');
    const original = CanvasRenderingContext2D.prototype.getImageData;
    const results = [];
    for (const mode of ['normal', 'blank-once', 'blank-always']) {
      let attempts = 0;
      CanvasRenderingContext2D.prototype.getImageData = function(...args) {
        if (this.canvas.width === 8 && this.canvas.height === 8) {
          attempts++;
          if (mode === 'blank-always' || (mode === 'blank-once' && attempts === 1)) return {data:new Uint8ClampedArray(4)};
        }
        return original.apply(this,args);
      };
      const renderer = createPaintTexture(document.querySelector('#paint'), {resolution:1, padding:0});
      try {
        const canvas = await renderer.capture();
        results.push({mode, attempts, pixel:Array.from(original.call(canvas.getContext('2d'),0,0,1,1).data)});
      } catch(error) { results.push({mode, attempts, error:error.message}); }
      finally { renderer.dispose(); CanvasRenderingContext2D.prototype.getImageData = original; }
    }
    return results;
  });
  assert.deepEqual(result[0].pixel,[0,0,255,255], 'Probe must not erase the artwork corner');
  assert.equal(result[0].attempts,1);
  assert.deepEqual(result[1].pixel,[0,0,255,255]);
  assert.equal(result[1].attempts,2);
  assert.match(result[2].error,/FRAME_PAINT/);
  assert.equal(result[2].attempts,2);
  console.log(JSON.stringify(result,null,2));
} finally { await browser.close(); }
