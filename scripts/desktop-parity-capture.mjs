import { chromium } from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.PARITY_URL || 'http://127.0.0.1:5186';
const out = `work/desktop-parity/${process.env.PARITY_PHASE || 'baseline-ui'}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const routes = ['fretboard', 'stage1', 'stage2', 'stage3', 'metronome', 'tuner', 'rhythm-trainer', 'etudes', 'mini-chord', 'audio-studio', 'shooter'];
const results = [];
try {
  for (const [width, height, mobile] of [[390, 844, true], [1440, 900, false]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const route of routes) {
      await page.goto(`${base}/#${route}`);
      await page.waitForFunction(() => document.querySelector('main.app') && !document.documentElement.classList.contains('app-is-launching'));
      await page.waitForTimeout(650);
      const inventory = await page.evaluate(() => {
        const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
        return {
          layout: document.documentElement.dataset.rifflabLayout,
          text: document.body.innerText,
          scrollWidth: document.documentElement.scrollWidth,
          controls: [...document.querySelectorAll('main button, main input, main select, main summary, main a, [role=dialog] button')].filter(visible).map(el => ({
            tag: el.tagName, text: (el.getAttribute('aria-label') || el.innerText || el.placeholder || '').trim(),
            type: el.type, value: el.value, disabled: el.disabled, class: typeof el.className === 'string' ? el.className : '',
            rect: (() => { const {x,y,width,height} = el.getBoundingClientRect(); return {x,y,width,height}; })(),
          })),
        };
      });
      await page.screenshot({ path: `${out}/${route}-${width}.png`, fullPage: true });
      await writeFile(`${out}/${route}-${width}.json`, JSON.stringify(inventory, null, 2));
      results.push({route, width, height, layout: inventory.layout, scrollWidth: inventory.scrollWidth, errors: [...errors]});
      console.log(`${width} ${route}: ${inventory.controls.length} controls, width ${inventory.scrollWidth}, errors ${errors.length}`);
    }
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
