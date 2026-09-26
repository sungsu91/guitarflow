import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const engine=process.env.PET_BROWSER||'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{channel:'msedge'}:{})});
const output=`artifacts/skin-picker-frame/${engine}`;await mkdir(output,{recursive:true});
const results=[];
try{
 for(const [width,height] of [[360,800],[375,812],[390,844],[412,968],[430,932],[1440,1000]]){
  const p=await browser.newPage({viewport:{width,height},isMobile:width<500,hasTouch:width<500});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>localStorage.setItem('rifflabShooterPetSkin','poodle_apricot'));
  await p.goto(`${process.env.PET_TEST_URL||'http://127.0.0.1:5178'}/#shooter`);
  await p.locator('.shooterArena').waitFor();await p.locator('.launchSplash').waitFor({state:'detached'});
  await p.getByText('스킨변경',{exact:true}).click();
  let first;const tabs=[];
  for(const tab of ['기타','이펙트','펫','맵','피크','기타']){
   await p.locator('.shooterSkinTabs').getByRole('button',{name:tab,exact:true}).click();
   await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const geometry=await p.evaluate(()=>{
    const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();
    const body=document.querySelector('.shooterSkinPickerBody');
    return {modal:r('.shooterGuitarPickerModal'),tabs:r('.shooterSkinTabs'),header:r('.shooterGuitarPickerHeader'),body:r('.shooterSkinPickerBody'),scrollHeight:body.scrollHeight,clientHeight:body.clientHeight};
   });
   first??=geometry;
   for(const key of ['modal','tabs','header'])for(const prop of ['x','y','width','height'])assert.ok(Math.abs(first[key][prop]-geometry[key][prop])<1,`${width} ${tab} ${key}.${prop}: ${JSON.stringify({first,geometry})}`);
   assert.ok(geometry.body.bottom<=geometry.modal.bottom+1&&geometry.body.y>=geometry.tabs.bottom-1,JSON.stringify(geometry));
   const scroll=await p.locator('.shooterSkinPickerBody').evaluate(el=>{el.scrollTop=el.scrollHeight;return el.scrollTop;});
   if(geometry.scrollHeight>geometry.clientHeight+2)assert.ok(scroll>0,`${tab} scrolls`);
   const after=await p.locator('.shooterSkinTabs').boundingBox();assert.ok(Math.abs(after.y-first.tabs.y)<1);
   if(width===412||width===1440)await p.screenshot({path:`${output}/${width}-${tab}.png`,scale:'css'});
   tabs.push({tab,...geometry,scroll});
  }
  await p.locator('.shooterGuitarPickerHeader button').click();assert.equal(await p.locator('.shooterGuitarPickerModal').count(),0);
  assert.deepEqual(errors,[]);results.push({width,height,tabs,errors});console.log(`${engine} ${width}x${height}: fixed window/header/tabs and bounded scroll PASS`);await p.close();
 }
}finally{await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));await browser.close();}
