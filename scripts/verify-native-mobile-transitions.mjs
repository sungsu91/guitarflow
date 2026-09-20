const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{for(const width of [360,390,430]){
const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1'});
await page.goto((process.env.TEST_URL||'http://127.0.0.1:5177/')+'#metronome');await page.locator('.integratedBottomNav').waitFor();
const session=await page.context().newCDPSession(page);await session.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:47,bottom:34,left:0,right:0}});
await page.evaluate(()=>{window.samples=[];window.sampleRunning=true;function sample(){const nav=document.querySelector('.integratedBottomNav'),app=document.querySelector('main.app.shooterMode,main.app.tunerMode'),root=document.documentElement;window.samples.push({w:innerWidth,cw:root.clientWidth,vw:visualViewport.width,vs:visualViewport.scale,navBottom:nav?.getBoundingClientRect().bottom,transform:app?getComputedStyle(app).transform:null});if(window.sampleRunning)requestAnimationFrame(sample);}sample();});
for(let i=0;i<3;i++)for(const mode of ['슈팅게임','메트로놈','튜너','메트로놈']){
await page.locator('.integratedBottomNav').getByRole('button',{name:mode,exact:true}).click();await page.waitForTimeout(120);
if(mode==='튜너'){const box=await page.locator('.tunerMobileControls').boundingBox();assert.ok(Math.abs(box.y-47)<1,JSON.stringify(box));}
await page.locator('.integratedBottomNav').getByRole('button',{name:'메뉴 열기',exact:true}).click();await page.locator('#utility-menu-panel').waitFor();
assert.notEqual(await page.evaluate(()=>getComputedStyle(document.body).position),'fixed');
await page.locator('#utility-menu-panel .utilityMenuHeader button').click();
}
const samples=await page.evaluate(()=>{window.sampleRunning=false;return window.samples;});for(const s of samples){assert.equal(s.w,width,JSON.stringify(s));assert.equal(s.cw,width,JSON.stringify(s));assert.equal(s.vs,1,JSON.stringify(s));assert.ok(s.transform===null||s.transform==='none',JSON.stringify(s));assert.ok(Math.abs(s.navBottom-810)<1,JSON.stringify(s));}
await page.locator('.integratedBottomNav').getByRole('button',{name:'슈팅게임',exact:true}).click();await page.screenshot({path:`artifacts/nav/native-shooter-${width}.png`});
console.log('PASS frame-by-frame',width,samples.length,'frames: stable width, scale, navigation; tuner inset once');await page.close();}
}finally{await browser.close();}
