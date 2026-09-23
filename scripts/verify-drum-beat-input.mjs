import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.goto('http://127.0.0.1:5173/#etudes');
 await page.getByRole('button',{name:'악보 만들기',exact:true}).click();
 await page.getByLabel('악기 선택',{exact:true}).selectOption('drums');
 await page.getByRole('button',{name:'16분음표',exact:true}).click();
 await page.getByRole('switch',{name:'하이햇 일괄 입력',exact:true}).click();
 await page.getByRole('button',{name:'하이햇 닫힘',exact:true}).click();
 await page.getByRole('switch',{name:'하이햇 일괄 입력',exact:true}).click();
 const section=page.locator('[data-bar-index="0"]');
 async function tapEvent(event){const xy=await section.evaluate((el,index)=>{const root=el.querySelector('div').shadowRoot;const hit=root.querySelector(`[data-event="${index}"][data-mode="staff"]`);const svg=hit.ownerSVGElement;const p=svg.createSVGPoint();p.x=Number(hit.dataset.cursorX)+6;p.y=Number(hit.dataset.staffBottom)-20;const s=p.matrixTransform(svg.getScreenCTM());return {x:s.x,y:s.y};},event);await page.touchscreen.tap(xy.x,xy.y);}
 await tapEvent(4);
 assert.match(await page.locator('.mobileInstrumentNavigation output').innerText(),/2박/);
 await tapEvent(0);
 assert.match(await page.locator('.mobileInstrumentNavigation output').innerText(),/1박/);
 await page.getByRole('button',{name:'4분음표',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'4분음표',exact:true}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'킥',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'킥',exact:true}).getAttribute('data-entered'),'true');
 assert.equal(await page.getByRole('button',{name:'하이햇 닫힘',exact:true}).getAttribute('data-entered'),'true');
 assert.equal(await page.getByText('같은 드럼 성부의 다음 음과 겹칩니다.',{exact:false}).count(),0);
 await page.getByRole('button',{name:'드럼 편집실 음소거',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'드럼 편집실 음소거 해제',exact:true}).getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('.editorDrumInline input[type=checkbox]').count(),2);
 await page.getByRole('button',{name:'드럼 편집실 음소거 해제',exact:true}).click();
 console.log('PASS: mobile drum beat taps and quarter kick over sixteenth hi-hats');
} finally {await browser.close();}

