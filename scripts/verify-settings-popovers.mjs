import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/settings-popovers',{recursive:true});const results=[];
try { for(const theme of ['light','brand']) {
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(t=>localStorage.setItem('rifflabThemeMode',t),theme);
 await page.goto('http://127.0.0.1:5173/#metronome');await page.locator('.rhythmSettings').first().waitFor();
 for(const size of [{width:390,height:844},{width:320,height:740},{width:844,height:390},{width:1440,height:900}]) {
 await page.setViewportSize(size);
 for(const field of ['meter','subdivision','accent','weak']) {
 const trigger=page.locator(`.rhythmSetting--${field} .rhythmSettingTrigger`).filter({visible:true}).first();
 if(!await trigger.count())continue;
 await trigger.scrollIntoViewIfNeeded();await trigger.click();await page.waitForTimeout(200);
 const popup=page.locator('.rhythmSettingsPopup');assert.equal(await popup.count(),1);
 const geometry=await popup.evaluate(p=>{const r=p.getBoundingClientRect(),t=document.querySelector('.rhythmSettingTrigger[aria-expanded=true]').getBoundingClientRect(),a=document.querySelector('.rhythmSettingTrigger[aria-expanded=true]').closest('.app')?.getBoundingClientRect()||{left:0,right:innerWidth},s=getComputedStyle(p),c=p.querySelector('.rhythmSettingsChoices');return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,tail:r.left+parseFloat(s.getPropertyValue('--tail-x')),center:t.left+t.width/2,gap:p.classList.contains('opens-up')?t.top-r.bottom:r.top-t.bottom,appLeft:a.left,appRight:a.right,scroll:c.scrollHeight>c.clientHeight};});
 assert.ok(geometry.left>=Math.max(0,geometry.appLeft)+15.5,JSON.stringify(geometry));assert.ok(geometry.right<=Math.min(size.width,geometry.appRight)-15.5,JSON.stringify({size,field,geometry}));assert.ok(Math.abs(geometry.tail-geometry.center)<1);assert.ok(Math.abs(geometry.gap-10)<1);assert.ok(geometry.top>=0&&geometry.bottom<=size.height);
 if(size.width===390)await page.screenshot({path:`artifacts/settings-popovers/${theme}-${field}.png`});
 if(field==='accent'||field==='weak'){assert.ok(geometry.scroll);const preview=popup.locator('.rhythmSettingsPreview');assert.equal(await preview.count(),21);await preview.last().scrollIntoViewIfNeeded();await preview.last().click();assert.equal(await popup.count(),1);}
 await page.keyboard.press('Escape');assert.equal(await popup.count(),0);assert.equal(await trigger.getAttribute('aria-expanded'),'false');
 results.push({theme,...size,field,...geometry});
 }
 }
 await page.setViewportSize({width:390,height:844});const meter=page.locator('.rhythmSetting--meter .rhythmSettingTrigger').filter({visible:true}).first();await meter.click();await meter.click();assert.equal(await page.locator('.rhythmSettingsPopup').count(),0);
 await meter.click();
 const before=await page.evaluate(()=>scrollY);await page.locator('.rhythmSetting--accent .rhythmSettingTrigger').filter({visible:true}).first().click();assert.equal(await page.locator('.rhythmSettingsPopup').count(),1);assert.equal(await meter.getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>scrollY),before);
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(200);assert.ok(await page.locator('.rhythmSettingsPopup').evaluate(p=>{const r=p.getBoundingClientRect(),t=document.querySelector('.rhythmSettingTrigger[aria-expanded=true]').getBoundingClientRect();return Math.abs(r.left+parseFloat(getComputedStyle(p).getPropertyValue('--tail-x'))-t.left-t.width/2)<1;}));await page.setViewportSize({width:390,height:844});
 await page.mouse.click(2,2);assert.equal(await page.locator('.rhythmSettingsPopup').count(),0);
 await page.emulateMedia({reducedMotion:'reduce'});await meter.click();assert.equal(await page.locator('.rhythmSettingsPopup').evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.deepEqual(errors,[]);await page.close();
 }}finally{await writeFile('artifacts/settings-popovers/results.json',JSON.stringify(results,null,2));await browser.close();}
console.log(`Passed ${results.length} popover layout cases, preview, dismiss and reduced-motion checks.`);



