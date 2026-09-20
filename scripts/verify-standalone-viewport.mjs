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
 for(const mode of ['튜너','슈팅게임']){
 await nav.getByRole('button',{name:mode,exact:true}).click();
 await page.waitForTimeout(200);
 const stage=page.locator('main.app.viewport-portrait:is(.tunerMode,.shooterMode)');
 const box=await stage.boundingBox(),rail=await nav.boundingBox();
 assert.ok(Math.abs(box.y-47)<1,JSON.stringify(box));assert.ok(Math.abs(box.y+box.height-844)<1,JSON.stringify(box));
 assert.ok(Math.abs(rail.y+rail.height-810)<1,JSON.stringify(rail));
 await page.screenshot({path:`artifacts/nav/standalone-${width}-${mode}.png`});
 console.log('PASS standalone',width,mode,box,rail);
 }
 await page.close();
}}finally{await browser.close();}

