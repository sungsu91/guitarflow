import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const engine=process.env.PET_BROWSER||'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{channel:'msedge',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']}:{})});
const origin=process.env.PET_TEST_URL||'http://127.0.0.1:5178';
const output=`artifacts/shooter-pet-adjustments/${engine}`;await mkdir(output,{recursive:true});
const results=[];
const canvas=page=>page.locator('.shooterSpritePetCanvas');
const handle=page=>page.locator('.shooterSpritePetHandle');
async function ready(page){await page.waitForFunction(()=>document.querySelector('.shooterSpritePetCanvas')?.dataset.action);await page.locator('.launchSplash').waitFor({state:'detached'});}
async function openSettings(page){await page.getByText('스킨변경',{exact:true}).click();await page.locator('.shooterSkinTabs').getByRole('button',{name:'펫',exact:true}).click();}
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fretiva.shooter.spritePets.v1')||'{}'));
async function defaultPosition(page){
 const b=await page.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {pet:rect('.shooterSpritePetHandle'),hearts:rect('.mobileShooterLives'),guitar:rect('.guitarPlayer')};});
 assert.ok(Math.abs(b.pet.x+b.pet.width/2-b.hearts.x-b.hearts.width/2)<1.1,JSON.stringify(b));
 assert.ok(Math.abs(b.hearts.y-b.pet.bottom-8)<1.1,JSON.stringify(b));
 assert.ok(b.pet.x>=b.guitar.right||b.pet.right<=b.guitar.x||b.pet.bottom<=b.guitar.y||b.pet.y>=b.guitar.bottom);
 return b;
}
async function drag(page,dx,dy){const r=await handle(page).boundingBox();const x=r.x+r.width/2,y=r.y+r.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:8});await page.mouse.up();}
try{
 for(const [width,height] of [[360,800],[375,812],[390,844],[393,852],[430,932],[1440,1000]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500,deviceScaleFactor:width<500?3:1});
  const page=await context.newPage(),errors=[],bad=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push([r.status(),r.url()]);});
  page.on('request',r=>{if(r.url().endsWith('/atlas.png'))requests.push(r.url());});
  await page.addInitScript(()=>{if(!sessionStorage.getItem('pet-adjustments-qa')){localStorage.setItem('rifflabShooterPetSkin','poodle_apricot');localStorage.removeItem('fretiva.shooter.spritePets.v1');sessionStorage.setItem('pet-adjustments-qa','1');}});
  await page.goto(`${origin}/?debugHitbox=1#shooter`);await ready(page);
  const initial=await defaultPosition(page);
  assert.equal(await canvas(page).getAttribute('data-playback-speed'),'0.5');assert.equal(await canvas(page).getAttribute('data-facing'),'left');
  assert.equal(await canvas(page).getAttribute('data-fps'),'3.5');
  const frames=await page.evaluate(()=>new Promise(resolve=>{const samples=[],c=document.querySelector('canvas.shooterSpritePetCanvas');const ob=new MutationObserver(()=>samples.push({t:performance.now(),frame:c.dataset.frame}));ob.observe(c,{attributes:true,attributeFilter:['data-frame']});setTimeout(()=>{ob.disconnect();resolve(samples);},1750);}));
  assert.ok(frames.length>=4&&frames.length<=8,`half-speed actual cadence: ${frames.length}`);
  await openSettings(page);
  const controls=page.locator('.shooterPetControls');
  const slider=controls.getByLabel('동작 속도');await slider.focus();await slider.press('Home');await slider.press('ArrowRight');await slider.press('ArrowRight');
  assert.equal(await slider.inputValue(),'0.35');
  await controls.getByRole('button',{name:'오른쪽',exact:true}).click();
  assert.equal(await canvas(page).getAttribute('data-facing'),'right');
  assert.equal((await stored(page)).poodle_apricot.speed,.35);
  const select=label=>page.locator('.shooterSkinOptionCard--pet').filter({has:page.locator('strong',{hasText:label})}).click();
  await select('스노화이트 토끼');await page.waitForFunction(()=>document.querySelector('.shooterSpritePetCanvas')?.dataset.petSkin==='rabbit_snow_white'&&document.querySelector('.shooterSpritePetCanvas').dataset.loadState==='ready');
  assert.equal(await slider.inputValue(),'0.5');assert.equal(await canvas(page).getAttribute('data-facing'),'left');
  await select('애프리콧 토이푸들');await page.waitForFunction(()=>document.querySelector('.shooterSpritePetCanvas')?.dataset.petSkin==='poodle_apricot'&&document.querySelector('.shooterSpritePetCanvas').dataset.loadState==='ready');
  assert.equal(await slider.inputValue(),'0.35');
  const controlsRect=await controls.boundingBox(),modalRect=await page.locator('.shooterGuitarPickerModal').boundingBox();
  assert.ok(controlsRect.y>=modalRect.y&&controlsRect.y+controlsRect.height<modalRect.y+modalRect.height);
  await page.screenshot({path:`${output}/${width}x${height}-controls.png`,scale:'css'});
  await page.locator('.shooterGuitarPickerHeader button').click();
  await drag(page,-92,-126);
  const moved=await handle(page).boundingBox();assert.ok(Math.abs(moved.x-initial.pet.x+92)<2);assert.ok(Math.abs(moved.y-initial.pet.y+126)<2);
  const layout=width<500?'mobile-portrait':'desktop-portrait',saved=(await stored(page)).poodle_apricot;
  assert.ok(saved.positions[layout]);assert.equal(Object.keys(saved.positions).length,1);
  await page.reload();await ready(page);const restored=await handle(page).boundingBox();
  assert.ok(Math.abs(moved.x-restored.x)<2&&Math.abs(moved.y-restored.y)<2,'manual position persists');
  assert.equal(await canvas(page).getAttribute('data-playback-speed'),'0.35');assert.equal(await canvas(page).getAttribute('data-facing'),'right');
  await handle(page).focus();await handle(page).press('ArrowUp');const keyboard=await handle(page).boundingBox();assert.ok(Math.abs(keyboard.y-restored.y+4)<1.2);
  await openSettings(page);await controls.getByRole('button',{name:'하트 위로',exact:true}).click();await page.locator('.shooterGuitarPickerHeader button').click();
  await defaultPosition(page);assert.equal((await stored(page)).poodle_apricot.positions[layout],undefined);
  await drag(page,-1000,-1000);const bounded=await handle(page).boundingBox(),arena=await page.locator('.shooterSpritePet').boundingBox();
  assert.ok(bounded.x>=arena.x&&bounded.y>=arena.y&&bounded.x+bounded.width<=arena.x+arena.width&&bounded.y+bounded.height<=arena.y+arena.height);
  await openSettings(page);await controls.getByRole('button',{name:'하트 위로',exact:true}).click();await page.locator('.shooterGuitarPickerHeader button').click();
  await defaultPosition(page);
  if(width===390){
   await page.getByText('시작',{exact:true}).click();await page.waitForSelector('.shooterEnemy:not(.defeated)');await page.locator('.shooterCountInOverlay').waitFor({state:'detached'});
   await page.getByRole('button',{name:'TEST SHOT',exact:true}).click();await page.waitForFunction(()=>/SCORE\s+100\s+COMBO\s+1/.test(document.body.innerText));
   await drag(page,-50,-40);assert.equal(await page.locator('.shooterArena.paused').count(),0);assert.match(await page.locator('body').innerText(),/SCORE\s+100\s+COMBO\s+1/);
  }
  await page.screenshot({path:`${output}/${width}x${height}-pet.png`,scale:'css'});
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  assert.equal(new Set(requests).size,2,'preferences do not preload other pets');
  results.push({width,height,initial,frames,moved,restored,keyboard,bounded,settings:saved,errors,bad,atlasRequests:[...new Set(requests)]});
  console.log(`${engine} ${width}x${height}: speed/facing, drag, persistence, reset, bounds PASS`);
  await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
  await context.close();
 }
}finally{await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));await browser.close();}
