import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
try {
 for (const mode of ['shooter','tuner']) {
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,permissions:['camera','microphone']});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${process.env.RECORDING_TEST_URL || 'http://127.0.0.1:5179'}/#${mode}`);
  await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();
  const refresh=page.getByRole('button',{name:'새로고침 현재 화면 다시 불러오기',exact:true});
  await refresh.waitFor();
  assert.equal(await refresh.evaluate(button=>button.nextElementSibling?.textContent.includes('문의하기')),true);
  await Promise.all([page.waitForEvent('load'),refresh.click()]);
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('navigation')[0].type),'reload');
  await page.locator(`main.app.${mode}Mode`).waitFor();
  await page.waitForFunction(() => !document.elementFromPoint(195,160)?.closest('[class*="launchSplash"]'));
  const cdp=await page.context().newCDPSession(page);
  const point=await page.evaluate(()=>{
    const main=document.querySelector('main.app');
    for(const y of [120,160,200,240]) for(const x of [195,100,280]) {
      const el=document.elementFromPoint(x,y);
      if(el && main.contains(el) && !el.closest('button,a,input,select,textarea,[role="slider"],.guitarPlayer,.shooterPetCompanion'))return{x,y};
    }
    throw new Error('No gesture surface: '+[120,160,200,240].map(y=>document.elementFromPoint(195,y)?.outerHTML.slice(0,180)).join(' | '));
  });
  async function drag(amount) {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    for(let i=1;i<=12;i++) {
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x,y:point.y+amount*i/12}]});
      await page.waitForTimeout(28);
    }
  }
  await page.evaluate(()=>window.refreshMarker='same');
  await drag(60);
  assert.ok(await page.locator('.mobilePullRefresh').count());
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await page.evaluate(()=>window.refreshMarker),'same');
  assert.equal(await page.locator('main.app').evaluate(el=>el.style.translate),'');
  await drag(170);
  assert.equal(await page.locator('.mobilePullRefresh').innerText(),'놓으면 새로고침');
  await Promise.all([page.waitForEvent('load'),cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})]);
  assert.equal(await page.evaluate(()=>window.refreshMarker),undefined);
  assert.deepEqual(errors,[]);
  console.log(`${mode}: menu placement/reload, short pull cancellation and full touch pull reload passed`);
  await page.close();
 }
} finally {await browser.close();}
