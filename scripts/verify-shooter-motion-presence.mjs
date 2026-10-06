import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { getArtMapCover } from '../src/shooter/maps/artMapMotion.js';
import { getArtMapMaterials } from '../src/shooter/maps/artMapMaterials.js';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const sharp = require('sharp');
const base = process.env.SHOOTER_TEST_URL || 'http://127.0.0.1:5173';
const out = process.env.SHOOTER_TEST_OUTPUT || 'output/map-motion/qa';
await mkdir(out, {recursive:true});
const browser = await chromium.launch({headless:true,channel:'chrome',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--enable-unsafe-swiftshader']});
const report=[];
const profiles=[['desktop',1440,1000,''],['mobile',390,844,'iPhone Mobile'],['tablet',820,1180,'iPad Safari']];
async function openPicker(page, desktop) {
  if(desktop)await page.getByRole('button',{name:'스킨 변경',exact:true}).click();
  else await page.locator('.shooterStartPanelButton--secondary').click();
  await page.locator('.shooterGuitarPickerModal').waitFor();
}
try {
  for(const [name,width,height,userAgent]of profiles) {
    if(process.env.QA_PROFILES&&!process.env.QA_PROFILES.split(',').includes(name))continue;
    const desktop=name==='desktop';
    const page=await browser.newPage({viewport:{width,height},...(userAgent?{userAgent,isMobile:true,hasTouch:true}:{})});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    page.setDefaultTimeout(25000);
    await page.goto(`${base}/#shooter`);await page.locator('.shooterArena').waitFor();await page.locator('.launchSplash').waitFor({state:'hidden',timeout:60000});
    await openPicker(page,desktop);
    await page.locator('.shooterGuitarCategoryTabs').getByRole('button',{name:'베이스',exact:true}).click();
    const basses=page.locator('.shooterGuitarPickerItem:has([data-enlarged-bass="true"])');
    assert.ok(await basses.count()>10,'legacy bass catalog should receive the same size policy');
    const bassReport=[];
    for(const id of ['jp-aqua-blue','midnight-5','bass_deep_lotus_v2','bass_velvet_bloom_v1']) {
      const card=page.locator(`.shooterGuitarPickerItem[data-skin-id="${id}"]`);
      if(!await card.count())continue;
      await card.click();
      const v=await card.evaluate(async el=>{const img=el.querySelector('img');await img.decode();const r=img.getBoundingClientRect(),c=el.getBoundingClientRect();const asset=document.querySelector('.guitarPlayerAsset');return{id:el.dataset.skinId,previewHeight:r.height,previewCssHeight:parseFloat(getComputedStyle(img).height),playerHeight:parseFloat(getComputedStyle(asset).height),inside:r.top>=c.top-1&&r.bottom<=c.bottom+1,device:document.documentElement.dataset.rifflabDevice};});
      assert.ok(v.inside,JSON.stringify(v));
      assert.ok(v.previewCssHeight>=(desktop?120:name==='tablet'?184:104)-1,JSON.stringify(v));
      assert.ok(v.playerHeight>=(desktop?172:180)-1,JSON.stringify(v));
      bassReport.push(v);
    }
    await page.screenshot({path:`${out}/${name}-basses.png`});
    await page.locator('.shooterSkinTabs').getByRole('button',{name:'맵',exact:true}).click();
    for(const [id,label]of [['glass-garden','유리꽃의 정원'],['silk-theatre','비단의 대극장'],['gilded-ink','금빛 수묵산수']]) {
      const list=page.locator(desktop?'.desktopMapGallery':'.shooterMapPickerGrid');
      await list.locator('button').filter({hasText:label}).click();
      await page.locator('.shooterGuitarPickerHeader button').click();
      const canvas=page.locator(`[data-art-map="${id}"] canvas[data-ready="true"]`);
      await canvas.waitFor();
      await page.waitForFunction(()=>Number(document.querySelector('.artMapMotionCanvas')?.dataset.motionTime)>150);
      assert.equal(await canvas.getAttribute('data-motion-mode'),'material-only');
      assert.equal(await canvas.getAttribute('data-presentation'),name);
      // Capture immediately after a real GPU draw, without game UI or particles.
      const capture=()=>canvas.evaluate(el=>new Promise(resolve=>{
        const gl=el.getContext('webgl'), draw=gl.drawArrays;
        gl.drawArrays=function(...args){draw.apply(this,args);gl.drawArrays=draw;resolve(el.toDataURL());};
      })).then(url=>Buffer.from(url.split(',')[1],'base64'));
      const first=await capture();await page.waitForTimeout(1600);const second=await capture();
      const {data:a,info}=await sharp(first).removeAlpha().raw().toBuffer({resolveWithObject:true});
      const b=await sharp(second).removeAlpha().raw().toBuffer();
      const source=await canvas.evaluate(el=>{const img=el.parentElement.querySelector('img'),rect=el.getBoundingClientRect();return[img.naturalWidth,img.naturalHeight,rect.width,rect.height];});
      const crop=getArtMapCover(...source), paths=getArtMapMaterials(id,name), aspect=source[0]/source[1];
      let changed=0,outsideChanged=0,outside=0,floorChanged=0,centerChanged=0;
      const diff=Buffer.alloc(a.length);
      for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
        const px=(x+.5)/info.width*crop.scale[0]+crop.offset[0],py=(y+.5)/info.height*crop.scale[1]+crop.offset[1];
        const inside=paths.some(([ax,ay,bx,by,r])=>{
          const dx=(bx-ax)*aspect,dy=by-ay;
          const t=Math.max(0,Math.min(1,((px-ax)*aspect*dx+(py-ay)*dy)/(dx*dx+dy*dy)));
          return Math.hypot((px-ax)*aspect-t*dx,py-ay-t*dy)<=r+.00001;
        });
        const i=(y*info.width+x)*3,d=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
        if(!inside)outside++;
        if(d>0){
          if(!inside)outsideChanged++;
          if(py>.82)floorChanged++;
          if(px>.42&&px<.58&&py>.25&&py<.5)centerChanged++;
          if(d>3){changed++;diff[i]=255;diff[i+1]=inside?180:0;}
        }
      }
      assert.equal(outsideChanged,0,`${name} ${id}: background pixels moved outside material`);
      assert.equal(floorChanged,0,`${name} ${id}: floor must remain pixel-stable`);
      assert.equal(centerChanged,0,`${name} ${id}: central space must remain pixel-stable`);
      assert.ok(outside/(info.width*info.height)>.85,'material mask must stay local');
      assert.ok(changed>10,`${name} ${id}: selected material should still animate`);
      const difference=changed/(info.width*info.height);
      await writeFile(`${out}/${name}-${id}-frame.png`,second);
      await sharp(diff,{raw:{width:info.width,height:info.height,channels:3}}).png().toFile(`${out}/${name}-${id}-motion-only.png`);
      const canvasSize=await canvas.evaluate(el=>[el.width,el.height]);assert.ok(canvasSize[0]*canvasSize[1]<1_002_000);
      await page.screenshot({path:`${out}/${name}-${id}.png`});
      await openPicker(page,desktop);
      if(desktop){const t=await canvas.getAttribute('data-motion-time');await page.waitForTimeout(250);assert.equal(await canvas.getAttribute('data-motion-time'),t,'picker should pause desktop scenery');}
      report.push({profile:name,id,difference,outsideChanged,floorChanged,centerChanged,staticFraction:outside/(info.width*info.height),canvasSize,basses:bassReport});
      await page.locator('.shooterSkinTabs').getByRole('button',{name:'맵',exact:true}).click();
    }
    // The desktop start control stays reachable while its floating picker is open.
    if(desktop){
      await page.getByRole('button',{name:'슈팅게임 시작',exact:true}).click();
      await page.locator('.shooterGuitarPickerModal').waitFor({state:'detached'});
      await page.waitForFunction(()=>[...document.querySelectorAll('.dsHeaderActions button')].some(button=>button.textContent==='일시정지'&&!button.disabled));
      await page.screenshot({path:`${out}/${name}-started.png`});
      await page.locator('.dsSession button').filter({hasText:'스킨 변경'}).click();
      await page.locator('.shooterGuitarPickerModal').waitFor();
      await page.getByRole('button',{name:'계속하기',exact:true}).click();
      await page.locator('.shooterGuitarPickerModal').waitFor({state:'detached'});
    }else await page.locator('.shooterGuitarPickerHeader button').click();
    await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.artMapMotionCanvas').waitFor({state:'detached'});
    assert.equal(await page.locator('.artMapAtmosphere i').first().evaluate(el=>getComputedStyle(el).animationName),'none');
    assert.deepEqual(errors,[]);console.log('PASS',name,JSON.stringify(report.filter(r=>r.profile===name).map(r=>({id:r.id,changed:r.difference}))));await page.close();
  }
}finally{await browser.close();await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));}
