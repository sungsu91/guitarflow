const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {for(const width of [390,430]) {
 const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
 await page.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}));
 await page.goto((process.env.TEST_URL||'http://127.0.0.1:5177/')+'#tuner');
 const nav=page.locator('.integratedBottomNav');await nav.waitFor();
 const session=await page.context().newCDPSession(page);
 await session.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:47,bottom:34,left:0,right:0}});
 await page.evaluate(()=>{Object.defineProperty(window,'innerHeight',{configurable:true,value:740});Object.defineProperty(visualViewport,'height',{configurable:true,value:740});window.dispatchEvent(new Event('pageshow'));});
 for(const mode of ['튜너','지판 보기','메트로놈','슈팅게임','튜너']){
 await nav.getByRole('button',{name:mode,exact:true}).click();
 await page.waitForTimeout(200);
 const check=async()=>{const rail=await nav.boundingBox();assert.ok(Math.abs(rail.y+rail.height-810)<1,JSON.stringify({mode,rail}));assert.equal(rail.height,64);};
 await check();
 if(['튜너','슈팅게임'].includes(mode)){
 const stage=page.locator('main.app.viewport-portrait:is(.tunerMode,.shooterMode)');
 const box=await stage.boundingBox();
 const scale=await stage.evaluate(e=>Number(getComputedStyle(e).getPropertyValue('--shooter-mobile-canvas-scale')));
 assert.ok(Math.abs(scale-width/430)<1e-7,'Height changes must not shrink controls');
 assert.ok(Math.abs(box.y-47)<1,JSON.stringify(box));assert.ok(Math.abs(box.y+box.height-844)<1,JSON.stringify(box));
 }
 await nav.getByRole('button',{name:'메뉴 열기',exact:true}).click();
 await page.locator('#utility-menu-panel').waitFor();await check();
 const lock=await page.evaluate(()=>({root:getComputedStyle(document.documentElement).overflow,body:getComputedStyle(document.body).position}));
 assert.equal(lock.root,'clip');assert.notEqual(lock.body,'fixed');
 await page.locator('#utility-menu-panel .utilityMenuHeader button').click();
 await page.locator('#utility-menu-panel').waitFor({state:'hidden'});await check();
 await page.screenshot({path:`artifacts/nav/standalone-${width}-${mode}.png`});
 console.log('PASS standalone',width,mode,'including menu open/close');
 }
 await page.close();
}}finally{await browser.close();}
