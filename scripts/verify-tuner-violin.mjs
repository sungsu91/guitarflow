import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {}),args:['--autoplay-policy=no-user-gesture-required']});
await (await import('node:fs/promises')).mkdir('artifacts/tuner-violin',{recursive:true});
const results=[];
try {
 for(const [width,height] of [[360,800],[375,812],[390,844],[393,852],[430,932],[1440,1000]]) {
  const page=await browser.newPage({viewport:{width,height},isMobile:width<500,hasTouch:width<500});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
  await page.addInitScript(()=>{
   navigator.mediaDevices.getUserMedia=async()=>{const ctx=new AudioContext();await ctx.resume();const osc=ctx.createOscillator(),gain=ctx.createGain(),dest=ctx.createMediaStreamDestination();gain.gain.value=0;osc.connect(gain).connect(dest);osc.start();window.testTone=(f,a=0.15)=>{osc.frequency.value=f;gain.gain.value=a;};window.testAudio=ctx;return dest.stream;};
  });
  await page.goto(`${process.env.TEST_URL || 'http://127.0.0.1:5175/'}#tuner`);
  await page.waitForTimeout(2200);
  const choose=async(name)=>{await page.getByRole('button',{name:/악기 선택, 현재/}).click();await page.getByRole('radio',{name:new RegExp(name)}).click();await page.waitForTimeout(150);};
  await choose('바이올린');
  await page.locator('.tunerHeadstockPanel[data-instrument="violin"] > .tunerHeadstockAsset > img').waitFor();
  await page.evaluate(()=>window.testTone(184.9972));
  await page.waitForFunction(()=>document.querySelector('.tunerPitchOrb strong')?.textContent==='F#3');
  assert.match(await page.locator('.tunerHeadstockTarget').innerText(),/G3/);
  assert.match(await page.locator('.tunerGuidanceBadge').getAttribute('alt'),/목표|조여|올려/);
  assert.match(await page.locator('.tunerPitchOrb').innerText(),/-100/);
  await page.screenshot({path:`artifacts/tuner-violin/auto-${width}.png`});
  const scroll=await page.evaluate(()=>({x:scrollX,y:scrollY}));
  for(const [number,pitch] of [[4,'G3'],[3,'D4'],[2,'A4'],[1,'E5']]){
   const peg=page.getByRole('button',{name:new RegExp(`${number}번 줄 ${pitch}`)});await peg.click();
   assert.match(await page.locator('.tunerHeadstockTarget').innerText(),new RegExp(pitch));
   assert.equal(await page.locator('.tunerPegHotspot[data-selected="true"]').count(),1);
   await peg.click();
  }
  await page.getByRole('button',{name:/1번 줄 E5/}).click();
  await page.evaluate(()=>window.testTone(659.2551*2**(25/1200)));
  await page.waitForFunction(()=>document.querySelector('.tunerPitchOrb strong')?.textContent==='E5');
  await page.waitForTimeout(700);
  assert.match(await page.locator('.tunerPitchOrb').innerText(),/\+25/);
  await page.evaluate(()=>window.testTone(659.2551*2**(-25/1200)));
  await page.waitForTimeout(1500);
  assert.match(await page.locator('.tunerPitchOrb').innerText(),/-25/);
  await page.screenshot({path:`artifacts/tuner-violin/manual-${width}.png`});
  const geometry=await page.evaluate(()=>{
   const selectors=['.tunerMobileControls','.tunerPegHotspot','.tunerHeadstockTarget','.tunerPitchOrb'];
   const bounds=selectors.flatMap(s=>[...document.querySelectorAll(s)].map(e=>{const r=e.getBoundingClientRect();return {s,x:r.x,y:r.y,w:r.width,h:r.height};}));
   const im=document.querySelector('.tunerHeadstockAsset > img'),r=im.getBoundingClientRect();
   return {bounds,scroll:{x:scrollX,y:scrollY},overflow:document.documentElement.scrollWidth>innerWidth,imageFit:getComputedStyle(im).objectFit,imageNatural:[im.naturalWidth,im.naturalHeight],frame:[r.width,r.height]};
  });
  assert.equal(geometry.overflow,false);assert.deepEqual(geometry.scroll,scroll);
  assert.equal(geometry.imageFit,'contain');
  for(const b of geometry.bounds){assert.ok(b.x>=-1&&b.x+b.w<=width+1&&b.y>=-1&&b.y+b.h<=height+1,JSON.stringify(b));}
  await page.evaluate(()=>window.testTone(0,0));
  for(const instrument of ['기타','베이스','우쿨렐레','바이올린']){
   await choose(instrument);assert.equal(await page.locator('.tunerPegHotspot[data-selected="true"]').count(),0);
   if(width<500||instrument==='바이올린')assert.match(await page.locator('.tunerHeadstockTarget').innerText(),/AUTO/);
  }
  assert.deepEqual(errors,[]);results.push({width,height,result:'PASS',geometry});console.log(`PASS ${width}x${height}: synthetic mic, AUTO/manual, instrument reset, geometry/scroll`);
  await page.close();
 }
}finally{await browser.close();}
await (await import('node:fs/promises')).writeFile('artifacts/tuner-violin/browser-results.json',JSON.stringify(results,null,2));

