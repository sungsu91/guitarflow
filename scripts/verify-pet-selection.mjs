import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {SHOOTER_SPRITE_PETS} from '../src/shooter/pets.js';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const engine=process.env.PET_BROWSER||'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{channel:'msedge'}:{})});
const origin=process.env.PET_TEST_URL||'http://127.0.0.1:4177';
const output=`artifacts/shooter-sprite-pets/${engine}-production`;
await mkdir(output,{recursive:true});
const widths=process.env.PET_WIDTHS?.split(',').map(Number);
const results=widths?JSON.parse(await readFile(`${output}/selection-results.json`,'utf8').catch(()=> '[]')).filter(r=>!widths.includes(r.width)&&!r.standaloneFlagEmulation):[];
const overlap=(a,b)=>a&&b&&a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
try{
 for(const [width,height] of [[360,800],[375,812],[390,844],[393,852],[430,932],[1440,1000]]){
  if(widths&&!widths.includes(width))continue;
  const context=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500,deviceScaleFactor:width<500?3:1});
  const page=await context.newPage(),requests=[],errors=[],bad=[];
  page.on('request',r=>{if(r.url().includes('fretiva_pet_sprite_pack_v1')&&r.url().endsWith('/atlas.png'))requests.push(r.url());});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)bad.push([r.status(),r.url()]);});
  await page.addInitScript(()=>{if(!sessionStorage.getItem('pet-selection-test')){localStorage.setItem('rifflabShooterPetSkin','none');sessionStorage.setItem('pet-selection-test','1');}});
  await page.goto(`${origin}/#shooter`);
  await page.locator('.shooterArena').waitFor();await page.locator('.launchSplash').waitFor({state:'detached'});
  const guitarBefore=await page.locator('.guitarPlayer').evaluate(el=>el.getBoundingClientRect().toJSON());
  await page.getByText('스킨변경',{exact:true}).click();
  await page.locator('.shooterSkinTabs').getByRole('button',{name:'펫',exact:true}).click();
  await page.locator('.shooterSkinOptionCard--pet').last().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  assert.equal(requests.length,0,'opening the picker must not fetch unselected atlases');
  assert.equal(await page.locator('.shooterSkinOptionCard--pet').count(),13);
  const selections=[];
  for(const pet of SHOOTER_SPRITE_PETS){
   const card=page.locator('.shooterSkinOptionCard--pet').filter({has:page.locator('strong',{hasText:pet.label})});
   await card.click();
   try {
    await page.waitForFunction(id=>{const el=document.querySelector('.shooterSpritePetCanvas');return el?.dataset.petSkin===id&&el.dataset.loadState==='ready'&&el.dataset.action;},pet.id);
   } catch(error) {
    await page.screenshot({path:`${output}/failure-${width}-${pet.id}.png`,scale:'css'});
    console.log(JSON.stringify({width,pet:pet.id,errors,bad,debug:await page.evaluate(()=>({selected:localStorage.getItem('rifflabShooterPetSkin'),canvas:document.querySelector('.shooterSpritePetCanvas')?.outerHTML}))}));
    throw error;
   }
   assert.equal(await card.getAttribute('aria-pressed'),'true');
   assert.equal(await page.evaluate(()=>localStorage.getItem('rifflabShooterPetSkin')),pet.id);
   const metrics=await page.evaluate(()=>Object.fromEntries(['.shooterSpritePetCanvas','.guitarPlayer','.mobileShooterLives','.shooterPitchMonitor','.mobileShooterScoreHud','.mobileShooterTopHud'].map(s=>[s,document.querySelector(s)?.getBoundingClientRect().toJSON()])));
   for(const [selector,rect]of Object.entries(metrics))if(selector!=='.shooterSpritePetCanvas')assert.ok(!overlap(metrics['.shooterSpritePetCanvas'],rect),`${width} ${pet.id} overlaps ${selector}`);
   assert.deepEqual(metrics['.guitarPlayer'],guitarBefore,'pet choice never moves the guitar');
   selections.push({id:pet.id,metrics});
  }
  assert.equal(new Set(requests).size,10);
  await page.screenshot({path:`${output}/${width}x${height}-picker.png`,scale:'css'});
  await page.locator('.shooterGuitarPickerHeader button').click();
  await page.reload();await page.waitForFunction(()=>document.querySelector('.shooterSpritePetCanvas')?.dataset.petSkin==='cockatiel_pearl_gray'&&document.querySelector('.shooterSpritePetCanvas').dataset.loadState==='ready');
  await page.locator('.launchSplash').waitFor({state:'detached'});
  await page.screenshot({path:`${output}/${width}x${height}-saved-pet.png`,scale:'css'});
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  results.push({width,height,selections,persistence:true,atlasRequests:requests,errors,badResponses:bad});
  await writeFile(`${output}/selection-results.json`,JSON.stringify(results,null,2));
  console.log(`${engine} production ${width}x${height}: 10 choices, lazy loading, persistence passed`);
  await context.close();
 }
 // A standalone flag exercises the app branch; this is explicitly not a real iOS installed PWA.
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:3,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
 const page=await context.newPage();
 await page.addInitScript(()=>{Object.defineProperty(navigator,'standalone',{get:()=>true});localStorage.setItem('rifflabShooterPetSkin','poodle_apricot');});
 await page.goto(`${origin}/#shooter`);await page.waitForFunction(()=>document.querySelector('.shooterSpritePetCanvas')?.dataset.action);
 await page.locator('.launchSplash').waitFor({state:'detached'});
 const first=await page.locator('.shooterSpritePetCanvas').getAttribute('data-frame');
 await page.waitForFunction(f=>document.querySelector('.shooterSpritePetCanvas').dataset.frame!==f,first);
 const manifest=await (await page.request.get(`${origin}/manifest.webmanifest`)).json();assert.equal(manifest.display,'standalone');
 await page.screenshot({path:`${output}/standalone-flag-emulation.png`,scale:'css'});
 results.push({standaloneFlagEmulation:true,realIPhone:false,manifestDisplay:manifest.display});
 await context.close();
}finally{await writeFile(`${output}/selection-results.json`,JSON.stringify(results,null,2));await browser.close();}
