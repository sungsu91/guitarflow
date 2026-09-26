import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const engine=process.env.PET_BROWSER||'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{channel:'msedge'}:{})});
const output=`artifacts/shooter-pet-adjustments/${engine}`;
await mkdir(output,{recursive:true});
const results=[];
try {
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(), errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  localStorage.setItem('rifflabShooterPetSkin','poodle_apricot');
  localStorage.setItem('fretiva.shooter.spritePets.v1',JSON.stringify({poodle_apricot:{speed:.5,facing:'left',positions:{'desktop-portrait':{x:.1,y:.2}}}}));
 });
 await page.goto(`${process.env.PET_TEST_URL||'http://127.0.0.1:5178'}/#shooter`);
 await page.waitForFunction(()=>document.querySelector('.shooterSpritePetCanvas')?.dataset.action);
 await page.locator('.launchSplash').waitFor({state:'detached'});
 const handle=page.locator('.shooterSpritePetHandle');
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fretiva.shooter.spritePets.v1')).poodle_apricot);
 const styles=await handle.evaluate(el=>({bg:getComputedStyle(el).backgroundColor,image:getComputedStyle(el).backgroundImage,after:getComputedStyle(el,'::after').content}));
 assert.deepEqual(styles,{bg:'rgba(0, 0, 0, 0)',image:'none',after:'none'});
 for(const viewport of [{width:390,height:844},{width:844,height:390}]) {
  await page.setViewportSize(viewport);
  await page.waitForFunction(({width,height})=>innerWidth===width&&innerHeight===height,viewport);
  // Wait until resize and portrait-lock effects have settled across animation frames.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const before=await handle.boundingBox(), dx=viewport.width>500?55:-45,dy=viewport.width>500?-30:-45;
  const x=before.x+before.width/2,y=before.y+before.height/2;
  assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.classList.contains('shooterSpritePetHandle'),{x,y}),true);
  if(engine==='chromium') {
   const cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
   for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await cdp.detach();
  } else {
   await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:8});await page.mouse.up();
  }
  const after=await handle.boundingBox();
  assert.ok(Math.abs(after.x-before.x-dx)<2&&Math.abs(after.y-before.y-dy)<2,JSON.stringify({viewport,before,after,dx,dy}));
  assert.deepEqual((await stored()).positions['desktop-portrait'],{x:.1,y:.2},'mobile dragging preserves desktop position');
  assert.equal(await page.evaluate(()=>scrollY),0);
  results.push({viewport,input:engine==='chromium'?'CDP native touch':'WebKit pointer',before,after,stored:await stored()});
 }
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>innerWidth===390&&innerHeight===844);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const beforeCancel=await handle.boundingBox(),savedBefore=await stored();
 await page.mouse.move(beforeCancel.x+32,beforeCancel.y+32);await page.mouse.down();
 await page.mouse.move(beforeCancel.x+20,beforeCancel.y-20,{steps:4});
 await handle.evaluate(el=>el.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1,isPrimary:true})));
 await page.mouse.up();
 const afterCancel=await handle.boundingBox();
 assert.ok(Math.abs(afterCancel.x-beforeCancel.x)<1&&Math.abs(afterCancel.y-beforeCancel.y)<1,'cancelled drag restores previous position');
 assert.deepEqual(await stored(),savedBefore);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:`${output}/touch.png`,scale:'css'});
 await writeFile(`${output}/touch-results.json`,JSON.stringify({styles,results,beforeCancel,afterCancel,errors},null,2));
 console.log(`${engine}: transparent button, portrait + landscape drag, platform isolation, cancel PASS`);
} finally {await browser.close();}
