import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const reports=[];const out='work/instrument-audit';await mkdir(out,{recursive:true});
try {
  for(const [name,width,height,userAgent] of [['desktop',1440,1000,''],['phone',360,800,'iPhone Mobile'],['tablet',768,1024,'iPad Safari'],['landscape',844,390,'iPhone Mobile']]) {
    const page=await browser.newPage({viewport:{width,height},...(userAgent?{userAgent,isMobile:true,hasTouch:true}:{})});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      window.instrumentWrites=0;
      const write=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){if(key==='rifflab.fretboard.instrument.v1')window.instrumentWrites++;return write.call(this,key,value);};
    });
    await page.goto(`${process.env.TEST_URL||'http://127.0.0.1:5173/'}#stage1`);
    await page.locator('.launchSplash').waitFor({state:'hidden'});
    const trigger=page.locator('.learningInstrumentControls .instrumentDropdownTrigger');const menu=page.locator('.instrumentDropdownMenu');
    const before=await page.evaluate(()=>window.instrumentWrites);
    await trigger.click();await menu.locator('[data-value="guitar-6"]').click();
    assert.equal(await page.evaluate(()=>window.instrumentWrites),before,'Selecting the current instrument must not reset/persist state again');
    await trigger.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('End');await page.keyboard.press('Enter');
    assert.equal(await trigger.getAttribute('data-value'),'ukulele-low-g');
    assert.equal(await trigger.evaluate(e=>document.activeElement===e),true);
    await trigger.click();await page.keyboard.press('Tab');
    assert.equal(await menu.count(),0);assert.equal(await trigger.evaluate(e=>document.activeElement===e),false,'Tab must advance past the trigger');
    await trigger.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    assert.equal(await trigger.getAttribute('data-value'),'guitar-7');
    await trigger.click();await page.keyboard.press('Escape');assert.equal(await trigger.evaluate(e=>document.activeElement===e),true);
    await trigger.click();await page.mouse.click(1,1);assert.equal(await menu.count(),0);
    await page.evaluate(()=>location.hash='fretboard');await page.locator('.viewerInstrumentControls:visible').waitFor();
    const family=page.locator('.viewerInstrumentControls .instrumentDropdownTrigger').first();await family.click();
    const scrollable=await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight+100);
    if(scrollable) {
      await page.evaluate(()=>window.scrollTo(0,650));
      await menu.waitFor({state:'detached'});
      await page.evaluate(()=>window.scrollTo(0,0));
    } else {await page.keyboard.press('Escape');}
    await family.click();
    await page.setViewportSize({width:width+40,height:height-60});
    await page.waitForTimeout(100);
    if(await menu.count()) {
      const rect=await menu.boundingBox();assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=width+41&&rect.y+rect.height<=height-59);
    }
    await page.evaluate(()=>location.hash='shooter');await page.locator('.shooterPanel:visible').waitFor();await menu.waitFor({state:'hidden'});
    await page.evaluate(()=>location.hash='fretboard');await family.waitFor();await menu.waitFor({state:'hidden'});
    assert.deepEqual(errors,[]);reports.push({name,pass:true,scrollDismissal:scrollable});console.log('PASS',name);await page.close();
  }
} finally {await browser.close();await writeFile(`${out}/dropdown-regressions.json`,JSON.stringify(reports,null,2));}
