import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('artifacts/shooter-settings-popover',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
for(const width of [320,390,1366]) {
 const page=await browser.newPage({viewport:{width,height:844},isMobile:width<700,hasTouch:width<700});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/#shooter');
 for(const [buttonName,dialogName,id] of [['슈팅게임 난이도','난이도와 진행 속도','difficulty'],['촬영모드','촬영모드 선택','recording']]) {
  const button=page.getByRole('button',{name:buttonName,exact:true});await button.click();
  const dialog=page.getByRole('dialog',{name:dialogName});await dialog.waitFor();
  const a=await button.boundingBox(),b=await dialog.boundingBox();
  assert.ok(Math.abs(b.y-(a.y+a.height-1))<2);assert.ok(b.x>=0 && b.x+b.width<=width+1);
  const overflow=await dialog.locator('button').evaluateAll(bs=>bs.some(b=>b.scrollWidth>b.clientWidth+1));assert.equal(overflow,false);
  await page.screenshot({path:`artifacts/shooter-settings-popover/${id}-${width}.png`});
  await button.click();await dialog.waitFor({state:'hidden'});
  await button.click();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 }
 for(const input of ['pointer','keyboard']) {
  for(const order of [['촬영모드','슈팅게임 난이도'],['슈팅게임 난이도','촬영모드']]) {
   for(const name of order) {
    const trigger=page.getByRole('button',{name,exact:true});
    if(input==='keyboard'){await trigger.focus();await page.keyboard.press('Enter');}
    else if(width<700) await trigger.tap();
    else await trigger.click();
    const label=name==='촬영모드'?'촬영모드 선택':'난이도와 진행 속도';
    await page.getByRole('dialog',{name:label}).waitFor();
    assert.equal(await page.locator('.shooterSettingsPopover').count(),1);
    assert.equal(await page.locator('[data-settings-open="true"]').count(),1);
   }
   await page.keyboard.press('Escape');
  }
 }
 await page.getByRole('button',{name:'촬영모드',exact:true}).click();
 await page.mouse.click(width-10,700);assert.equal(await page.getByRole('dialog').count(),0);
 assert.deepEqual(errors,[]); console.log({width,attached:true,toggle:true,escape:true,outside:true});await page.close();
}
} finally {await browser.close();}

