import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/etude-type-only',{recursive:true});
try{for(const theme of ['light','brand'])for(const mobile of [true,false]){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(theme=>localStorage.setItem('rifflabThemeMode',theme),theme);
 await page.goto('http://127.0.0.1:5173/#etudes');
 const my=page.getByRole('tab',{name:'내 악보',exact:true}),etudes=page.getByRole('tab',{name:'에튀드',exact:true});await my.waitFor();
 const style=el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,color:s.color,border:s.borderBottom,height:s.height}};
 const before=await my.evaluate(style);await etudes.click();
 const type=page.getByRole('combobox',{name:'연습 유형',exact:true});await type.waitFor();
 assert.deepEqual(await etudes.evaluate(style),before,'selected main tab style matches library');
 assert.equal(await page.getByRole('combobox',{name:'곡 선택',exact:true}).count(),0);
 assert.equal(await page.locator('.etudeQuickBrowse select').count(),1);
 const types=await type.locator('option').allTextContents();assert.equal(types.length,9);
 for(const t of types){await type.selectOption({label:t});
  const counter=page.locator('.etudeQuickPages>span');assert.match(await counter.innerText(),/^1 \/ \d+$/);
  assert.ok(await page.getByRole('button',{name:'이전 연습곡',exact:true}).isDisabled());
  const title=await page.locator('.etudeSheetHeader h2').innerText();await page.getByRole('button',{name:'다음 연습곡',exact:true}).click();
  assert.match(await counter.innerText(),/^2 \/ \d+$/);assert.notEqual(await page.locator('.etudeSheetHeader h2').innerText(),title);
  await page.getByRole('button',{name:'이전 연습곡',exact:true}).click();assert.equal(await page.locator('.etudeSheetHeader h2').innerText(),title);
 }
 await type.selectOption({label:'스케일'});await page.waitForTimeout(600);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`artifacts/etude-type-only/${mobile?'390':'1440'}-${theme}.png`});
 assert.deepEqual(errors,[]);console.log({theme,mobile,types:types.length,singleSelector:true,paging:true,matchingTabs:true,errors});await context.close();
}}finally{await browser.close();}
