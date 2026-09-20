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
  assert.equal(await nav.getAttribute('data-navigation-layout'),'floating-bottom-v1','The floating navigation rollback is missing');
  await page.evaluate(()=>{
   Object.defineProperty(visualViewport,'height',{configurable:true,value:796});
   visualViewport.dispatchEvent(new Event('resize'));
   visualViewport.dispatchEvent(new Event('scroll'));
  });
  for(const name of ['튜너','메트로놈','슈팅게임','메트로놈','지판 보기']) {
   await nav.getByRole('button',{name,exact:true}).click();
   const check=async()=>{
    const box=await nav.boundingBox();
    assert.ok(Math.abs(box.y+box.height-834)<1,`${name} at ${width}px lost its 10px bottom margin`);
    assert.equal(box.height,64,'Safe area must not add a block inside the floating rail');
    assert.ok(Math.abs(box.width-Math.min(width-20,370))<1);
    assert.ok(Math.abs(box.x-(width-box.width)/2)<1);
    assert.equal(await nav.count(),1);
   };
   await check();
   await nav.getByRole('button',{name:'메뉴 열기',exact:true}).click();
   await page.locator('#utility-menu-panel').waitFor();await check();
   await page.locator('#utility-menu-panel .utilityMenuHeader button').click();
   await page.locator('#utility-menu-panel').waitFor({state:'hidden'});await check();
  }
  await nav.getByRole('button',{name:'메뉴 열기',exact:true}).click();
  await page.locator('#utility-menu-panel').getByRole('radio',{name:/골드 다크/}).click();
  await page.locator('#utility-menu-panel .utilityMenuHeader button').click();
  assert.equal(await nav.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(23, 22, 18)');
  if(engine===chromium){
   const session=await page.context().newCDPSession(page);
   await session.send('Emulation.setSafeAreaInsetsOverride',{insets:{bottom:34,top:47,left:0,right:0}});
   const box=await nav.boundingBox();
   assert.equal(box.height,64);
   assert.ok(Math.abs(box.y+box.height-810)<1,'Safe area belongs outside the floating rail');
  }
  await page.screenshot({path:`artifacts/nav/floating-${engine.name()}-${width}.png`});
  console.log(`PASS ${engine.name()} ${width}px: stale viewport, mode switch, menu`);
  await page.close();
 }
} finally {await browser.close();}
