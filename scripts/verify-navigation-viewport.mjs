// Run against the production build or deployed URL; stale viewport metrics
// simulate the mismatch seen after permission/browser-chrome transitions.
// PLAYWRIGHT_MODULE may point to a bundled Playwright ESM entry point.
import assert from 'node:assert/strict';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine=process.env.BROWSER_ENGINE==='webkit'?webkit:chromium;
const browser=await engine.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const url=process.env.TEST_URL || 'http://127.0.0.1:5175/';
try {
 for (const width of [360,390,444]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await page.goto(`${url}#tuner`);
  const nav=page.locator('.integratedBottomNav');await nav.waitFor();
  assert.equal(await nav.getAttribute('data-navigation-layout'),'viewport-bottom-v2','The deployed navigation fix is missing');
  await page.evaluate(()=>{
   Object.defineProperty(visualViewport,'height',{configurable:true,value:796});
   visualViewport.dispatchEvent(new Event('resize'));
   visualViewport.dispatchEvent(new Event('scroll'));
  });
  for(const name of ['튜너','슈팅게임','지판 보기']) {
   await nav.getByRole('button',{name,exact:true}).click();
   const check=async()=>{
    const bottom=await nav.evaluate(e=>e.getBoundingClientRect().bottom);
    assert.ok(Math.abs(bottom-844)<1,`${name} at ${width}px leaves a ${844-bottom}px bottom gap`);
    assert.equal(await nav.count(),1);
   };
   await check();
   await nav.getByRole('button',{name:'메뉴 열기',exact:true}).click();
   await page.locator('#utility-menu-panel').waitFor();await check();
   await page.locator('#utility-menu-panel .utilityMenuHeader button').click();
   await page.locator('#utility-menu-panel').waitFor({state:'hidden'});await check();
  }
  console.log(`PASS ${engine.name()} ${width}px: stale viewport, mode switch, menu`);
  await page.close();
 }
} finally {await browser.close();}
