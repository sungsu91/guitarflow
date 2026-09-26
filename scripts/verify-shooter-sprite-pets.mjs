// Browser QA against local Vite (HMR disabled) or a production preview.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {SHOOTER_SPRITE_PETS} from '../src/shooter/pets.js';
const {chromium, webkit} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.PET_BROWSER || 'chromium';
const production = process.env.PET_PRODUCTION === '1';
const origin = process.env.PET_TEST_URL || 'http://127.0.0.1:5178';
const output = `artifacts/shooter-sprite-pets/${engine}${production ? '-production' : ''}`;
await mkdir(output, {recursive:true});
const browser = await (engine === 'webkit' ? webkit : chromium).launch({headless:true, ...(engine === 'chromium' ? {channel:'msedge',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']} : {})});
const results = [];
const canvas = page => page.locator('.shooterSpritePetCanvas');
const overlap = (a,b) => a && b && a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
async function ready(page) {
 await canvas(page).filter({visible:true}).waitFor({timeout:60000});
 await page.waitForFunction(()=>document.querySelector('.shooterSpritePetCanvas')?.dataset.loadState==='ready');
 await page.locator('.launchSplash').waitFor({state:'detached',timeout:30000});
}
async function geometry(page) {
 return page.evaluate(()=>Object.fromEntries(['.shooterArena','.shooterSpritePetCanvas','.guitarPlayer','.mobileShooterLives','.shooterHitboxDebugToolbar','.shooterPitchMonitor','.mobileBottomNavigation'].map(s=>[s,document.querySelector(s)?.getBoundingClientRect().toJSON()])));
}
async function observe(page, duration=3000) {
 return page.evaluate(duration=>new Promise(resolve=>{
   const node=document.querySelector('.shooterSpritePetCanvas'), frames=[];
   const sample=()=>{const rect=node.getBoundingClientRect(); frames.push({t:performance.now(),action:node.dataset.action,frame:Number(node.dataset.frame),fps:Number(node.dataset.fps),x:rect.x,y:rect.y,w:rect.width,h:rect.height});};
   sample(); const ob=new MutationObserver(sample);ob.observe(node,{attributes:true,attributeFilter:['data-frame']});
   setTimeout(()=>{ob.disconnect();resolve(frames);},duration);
 }),duration);
}
try {
 for (const [index,[width,height]] of [[360,800],[375,812],[390,844],[393,852],[430,932],[1440,1000]].entries()) {
  const pet=SHOOTER_SPRITE_PETS[index];
  const context=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500,deviceScaleFactor:width<500?3:1});
  const page=await context.newPage(), errors=[], badResponses=[], atlasRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)badResponses.push({url:r.url(),status:r.status()});});
  page.on('request',r=>{if(r.url().includes('fretiva_pet_sprite_pack_v1') && r.url().endsWith('/atlas.png'))atlasRequests.push(r.url());});
  await page.addInitScript(id=>{localStorage.setItem('rifflabShooterPetSkin',id);let seed=123;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};},pet.id);
  await page.goto(`${origin}/?debugHitbox=1#shooter`);
  await ready(page);
  const idle=await observe(page);
  assert.ok(new Set(idle.map(s=>s.frame)).size>=6);
  assert.equal(new Set(idle.map(s=>`${s.x},${s.y},${s.w},${s.h}`)).size,1,'no frame-driven layout jitter');
  assert.equal(new Set(atlasRequests).size,1,'only selected atlas loads');
  assert.ok(atlasRequests[0].endsWith(`/pets/${pet.id}/atlas.png`));
  const metrics=await geometry(page), petRect=metrics['.shooterSpritePetCanvas'];
  for(const selector of ['.guitarPlayer','.mobileShooterLives','.shooterHitboxDebugToolbar','.shooterPitchMonitor','.mobileBottomNavigation']) assert.ok(!overlap(petRect,metrics[selector]),`${width}: overlaps ${selector}`);
  const arena=metrics['.shooterArena']; assert.ok(petRect.x>=arena.x&&petRect.y>=arena.y&&petRect.right<=arena.right&&petRect.bottom<=arena.bottom);
  assert.equal(await canvas(page).evaluate(el=>getComputedStyle(el).pointerEvents),'none');
  await page.screenshot({path:`${output}/${width}x${height}-lobby.png`,scale:'css'});
  let gameplay=null;
  if(!production && width<500) {
   await page.getByText('시작',{exact:true}).click();
   await page.waitForSelector('.shooterEnemy:not(.defeated)',{timeout:20000});
   await page.locator('.shooterCountInOverlay').waitFor({state:'detached'});
   const names=Object.keys(pet.actions), observed=new Set();
   await page.evaluate(()=>{
     window.petObserved=[];
     window.petObserver=new MutationObserver(()=>window.petObserved.push(document.querySelector('.shooterSpritePetCanvas').dataset.action));
     window.petObserver.observe(document.querySelector('.shooterSpritePetCanvas'),{attributes:true,attributeFilter:['data-frame']});
   });
   const shotCount=width===390?5:1;
   for(let shot=1;shot<=shotCount;shot++) {
    await page.waitForSelector('.shooterEnemy:not(.defeated)',{timeout:15000});
    await page.getByRole('button',{name:'TEST SHOT',exact:true}).click();
    await page.waitForFunction(expected=>new RegExp(`SCORE\\s+${expected}\\s+COMBO`).test(document.body.innerText),shot*100,{timeout:10000});
    await page.waitForTimeout(450);
   }
   await page.waitForTimeout(3200);
   for(const action of await page.evaluate(()=>{window.petObserver.disconnect();return window.petObserved;}))observed.add(action);
   assert.ok(observed.has(names[1]),`hit reaction plays: ${JSON.stringify({observed:[...observed],body:await page.locator('body').innerText()})}`);
   if(shotCount===5)assert.ok(observed.has(names[2]),'combo reaction plays');
   const body=await page.locator('body').innerText();
   assert.match(body,new RegExp(`SCORE\\s+${shotCount*100}\\s+COMBO\\s+${shotCount}`));
   gameplay={shots:shotCount,actions:[...observed],metrics:await geometry(page)};
   await page.screenshot({path:`${output}/${width}x${height}-playing.png`,scale:'css'});
  }
  const environmentWarnings=errors.filter(e=>engine==='webkit'&&e==='Error: Microphone capture is not supported.');
  assert.deepEqual(errors.filter(e=>!environmentWarnings.includes(e)),[]);
  assert.deepEqual(badResponses,[]);
  results.push({width,height,pet:pet.id,metrics,atlasRequests,idle,gameplay,errors,badResponses,environmentWarnings});
  console.log(`${engine} ${width}x${height}: passed`);
  await context.close();
 }
} finally {
 await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
 await browser.close();
}
