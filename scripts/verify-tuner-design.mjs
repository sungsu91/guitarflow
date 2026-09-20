import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 for(const [width,height] of [[360,800],[375,812],[390,844],[393,852],[430,932],[1440,1000]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:width<500,hasTouch:width<500});page.on('dialog',d=>d.dismiss());
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5175/#tuner');await page.waitForTimeout(2400);
  const panel=page.locator('.tunerHeadstockPanel');const gesture=page.locator('.tunerHeadstockDesignGesture');
  const cdp=await page.context().newCDPSession(page);
  const drag=async(dx,dy)=>{const b=await gesture.boundingBox();const x=b.x+b.width/2,y=b.y+b.height*.7;
   if(width<500){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/6,y:y+dy*i/6}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:6});await page.mouse.up();}
   await page.waitForTimeout(260);
  };
  assert.equal(await panel.getAttribute('data-design'),'gold-inline');
  await page.screenshot({path:`artifacts/tuner-design/gold-inline-${width}.png`});
  await drag(0,-85);assert.equal(await panel.getAttribute('data-design'),'original');
  await page.getByRole('button',{name:/6번 줄 E2/}).click();
  const background=await page.locator('.tunerModeShell').getAttribute('data-background-id');
  for(const delta of [[0,-20],[0,65],[85,-10]]){await drag(...delta);assert.equal(await panel.getAttribute('data-design'),'original');}
  await drag(0,-85);assert.equal(await panel.getAttribute('data-design'),'classical');
  assert.equal(await page.locator('.tunerModeShell').getAttribute('data-background-id'),background);
  assert.equal(await page.locator('.tunerPegHotspot[data-selected="true"]').getAttribute('aria-label'),'6번 줄 E2, 선택 해제');
  await page.screenshot({path:`artifacts/tuner-design/classical-${width}.png`});
  assert.equal(await page.locator('.tunerPegHotspot').count(),6);
  for(const peg of await page.locator('.tunerPegHotspot').all()){await peg.click();await peg.click();}
  await drag(0,-85);assert.equal(await panel.getAttribute('data-design'),'gold-inline');
  await drag(0,-85);assert.equal(await panel.getAttribute('data-design'),'original');
  await gesture.focus();await page.keyboard.press('ArrowUp');assert.equal(await panel.getAttribute('data-design'),'classical');
  await page.getByRole('button',{name:/악기 선택, 현재/}).click();await page.getByRole('radio',{name:/바이올린/}).click();assert.equal(await gesture.count(),1);
  assert.equal(await panel.getAttribute('data-design'),'violin-red');
  await page.getByRole('button',{name:/4번 줄 G3/}).click();
  await page.waitForTimeout(300);
  await page.screenshot({path:'artifacts/tuner-design/violin-red-'+width+'.png'});
  await drag(0,-85);assert.equal(await panel.getAttribute('data-design'),'violin-gold');
  assert.equal(await page.locator('.tunerPegHotspot[data-selected="true"]').getAttribute('aria-label'),'4번 줄 G3, 선택 해제');
  await page.screenshot({path:'artifacts/tuner-design/violin-gold-'+width+'.png'});
  await drag(0,-85);assert.equal(await panel.getAttribute('data-design'),'violin-wood');
  assert.equal(await page.locator('.tunerPegHotspot[data-selected="true"]').getAttribute('aria-label'),'4번 줄 G3, 선택 해제');
  await page.screenshot({path:'artifacts/tuner-design/violin-wood-'+width+'.png'});
  await drag(0,-85);assert.equal(await panel.getAttribute('data-design'),'violin-red');
  await page.getByRole('button',{name:/악기 선택, 현재/}).click();await page.getByRole('radio',{name:/우쿨렐레/}).click();
  assert.equal(await panel.getAttribute('data-design'),'ukulele-original');
  await page.getByRole('button',{name:/4번 줄 G4/}).click();
  for(const design of ['ukulele-dark-gold','ukulele-flower','ukulele-original']) {
    await drag(0,-85);assert.equal(await panel.getAttribute('data-design'),design);
    assert.equal(await page.locator('.tunerPegHotspot[data-selected="true"]').getAttribute('aria-label'),'4번 줄 G4, 선택 해제');
    await page.screenshot({path:'artifacts/tuner-design/'+design+'-'+width+'.png'});
  }
  await page.getByRole('button',{name:/악기 선택, 현재/}).click();await page.getByRole('radio',{name:/기타/}).click();assert.equal(await panel.getAttribute('data-design'),'classical');
  const dimensions=await page.evaluate(()=>({x:scrollX,y:scrollY,overflow:document.documentElement.scrollWidth>innerWidth}));assert.deepEqual(dimensions,{x:0,y:0,overflow:false});
  if(width===390){console.log('ALPHA',await page.evaluate(async()=>{const im=new Image();im.src='/assets/tuner/just-play-gold-inline-headstock.png';await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;let transparent=0,partial=0;for(let i=3;i<d.length;i+=4){if(d[i]===0)transparent++;else if(d[i]<255)partial++;}return {width:im.width,height:im.height,transparent,partial};}));}
  assert.deepEqual(errors,[]);console.log(`PASS ${width}x${height}: swipe/cycle, reject short/down/horizontal, fixed manual target, pegs, keyboard, instrument switch, scroll`);await page.close();
 }
}finally{await browser.close();}
