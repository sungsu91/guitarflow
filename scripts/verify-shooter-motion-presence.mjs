import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { getArtMapCover } from '../src/shooter/maps/artMapMotion.js';
import { getArtMapSceneMotion } from '../src/shooter/maps/artMapSceneMotion.js';
import { ART_MAP_CLOTH_PATHS } from '../src/shooter/maps/artMapClothSurface.js';
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
    // Inspect the actual uploaded surface, not a second copy of the mask code.
    await page.addInitScript(()=>{
      const upload=WebGLRenderingContext.prototype.texImage2D;
      WebGLRenderingContext.prototype.texImage2D=function(...args){
        if(args.at(-1) instanceof HTMLCanvasElement)window.__qaClothSurface=args.at(-1);
        return upload.apply(this,args);
      };
    });
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
      assert.equal(await canvas.getAttribute('data-motion-mode'),'integrated-materials');
      assert.equal(await canvas.getAttribute('data-presentation'),name);
      if(id==='silk-theatre'){
        const landmarks={desktop:[[.309,.65],[.795,.153],[.15,.50],[.866,.514]],mobile:[[.136,.471],[.850,.684],[.697,.478]],tablet:[[.309,.65],[.801,.206],[.151,.53],[.870,.63]]};
        const material=await canvas.evaluate((el,{points,floor})=>{
          const surface=window.__qaClothSurface;if(!surface)return null;
          const {width:w,height:h}=surface,masked=surface.getContext('2d').getImageData(0,0,w,h).data;
          const original=document.createElement('canvas');original.width=w;original.height=h;
          const ctx=original.getContext('2d');ctx.drawImage(el.parentElement.querySelector('img'),0,0);
          const source=ctx.getImageData(0,0,w,h).data;
          let covered=0,opaque=0,colorMismatch=0,floorPixels=0;
          for(let i=0;i<masked.length;i+=4){
            if(masked[i+3]>0){covered++;if(Math.floor(i/4/w)/h>floor)floorPixels++;}
            if(masked[i+3]===255){opaque++;for(let c=0;c<3;c++)if(masked[i+c]!==source[i+c]){colorMismatch++;break;}}
          }
          return{fraction:covered/(w*h),opaque,colorMismatch,floorPixels,landmarkAlpha:points.map(([x,y])=>masked[(Math.floor(y*h)*w+Math.floor(x*w))*4+3])};
        },{points:landmarks[name],floor:name==='mobile'?.79:.75});
        assert.ok(material?.opaque>1000,'original cloth surface must reach the GPU');
        assert.equal(material.colorMismatch,0,'cloth must retain the painting colors at the same coordinates');
        assert.equal(material.floorPixels,0,'floor must be excluded from the source texture');
        assert.ok(material.fraction<.12,'only isolated fabric may be uploaded');
        assert.ok(material.landmarkAlpha.every(alpha=>alpha===0),'architectural landmarks must stay out of the cloth texture');
      }
      // Capture immediately after a real GPU draw, without game UI or particles.
      const capture=()=>canvas.evaluate(el=>new Promise(resolve=>{
        const gl=el.getContext('webgl'), draw=gl.drawArrays;
        gl.drawArrays=function(...args){draw.apply(this,args);gl.drawArrays=draw;resolve(el.toDataURL());};
      })).then(url=>Buffer.from(url.split(',')[1],'base64'));
      const posterState=()=>canvas.evaluate(el=>{
        const img=el.parentElement.querySelector('img');
        return {src:img.currentSrc,ancestors:[img,el.parentElement,el.parentElement.parentElement].map(node=>{
          const r=node.getBoundingClientRect(),s=getComputedStyle(node);
          return {x:r.x,y:r.y,width:r.width,height:r.height,transform:s.transform,animation:s.animationName};
        })};
      });
      const posterBefore=await posterState();
      const first=await capture();await page.waitForTimeout(1600);const second=await capture();
      assert.deepEqual(await posterState(),posterBefore,'poster and its framing must remain stationary');
      const {data:a,info}=await sharp(first).flatten({background:'#101c22'}).raw().toBuffer({resolveWithObject:true});
      const b=await sharp(second).flatten({background:'#101c22'}).raw().toBuffer();
      const alphaA=await sharp(first).ensureAlpha().extractChannel(3).raw().toBuffer(),alphaB=await sharp(second).ensureAlpha().extractChannel(3).raw().toBuffer();
      const source=await canvas.evaluate(el=>{const img=el.parentElement.querySelector('img'),rect=el.getBoundingClientRect();return[img.naturalWidth,img.naturalHeight,rect.width,rect.height];});
      const crop=getArtMapCover(...source), layout=getArtMapSceneMotion(id,name);
      const aspect=source[0]/source[1],clothSamples=[];
      if(id==='silk-theatre')for(const path of ART_MAP_CLOTH_PATHS[name]){
        let start=path.s;
        for(const c of path.c){for(let step=0;step<=80;step++){
          const t=step/80,u=1-t;
          clothSamples.push([u*u*u*start[0]+3*u*u*t*c[0]+3*u*t*t*c[2]+t*t*t*c[4],u*u*u*start[1]+3*u*u*t*c[1]+3*u*t*t*c[3]+t*t*t*c[5],path.w/2+8/source[1]]);
        }start=c.slice(4);}
      }
      // Portrait silk reaches lower in its composition; the stage starts at .79.
      const floorY=id==='silk-theatre'?(name==='mobile'?.79:.75):id==='glass-garden'?.775:.795;
      let changed=0,outsideChanged=0,outside=0,floorChanged=0,centerChanged=0,silhouetteChanged=0;
      const diff=Buffer.alloc(a.length);
      for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
        const px=(x+.5)/info.width*crop.scale[0]+crop.offset[0],py=(y+.5)/info.height*crop.scale[1]+crop.offset[1];
        const inPool=layout.pool&&px>=layout.pool[0]&&px<=layout.pool[0]+layout.pool[2]&&py>=layout.pool[1]&&py<=layout.pool[1]+layout.pool[3];
        const inBeacon=layout.beacon&&Math.abs(px-layout.beacon[0])<=layout.beacon[2]*1.251&&py>=layout.beacon[1]-layout.beacon[3]*1.151&&py<=layout.beacon[1]+layout.beacon[3]*.181;
        const inFall=layout.falls?.some(([x1,y1,x2,y2],index)=>{
          const t=(py-y1)/(y2-y1),center=x1+(x2-x1)*t+Math.sin(t*Math.PI)*(index<2?(index===0?.014:-.014):0);
          return t>=0&&t<=1&&Math.abs(px-center)<=(index<2?.012:index<4?.013:.007)+.00001;
        });
        const inFog=layout.fog?.some(([cx,cy,rx,ry])=>Math.hypot((px-cx)/rx,(py-cy)/ry)<=1.0001);
        const inMoon=layout.moon&&Math.hypot((px-layout.moon[0])/layout.moon[2],(py-layout.moon[1])/layout.moon[3])>=.9399&&Math.hypot((px-layout.moon[0])/layout.moon[2],(py-layout.moon[1])/layout.moon[3])<=1.1601;
        const inCloth=id==='silk-theatre'&&clothSamples.some(([cx,cy,r])=>Math.abs(py-cy)<=r&&Math.abs(px-cx)<=r/aspect&&Math.hypot((px-cx)*aspect,py-cy)<=r);
        const inside=inPool||inBeacon||inFall||inFog||inMoon||inCloth;
        const i=(y*info.width+x)*3,d=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
        if(!inside)outside++;
        if(Math.abs(alphaA[y*info.width+x]-alphaB[y*info.width+x])>40)silhouetteChanged++;
        if(d>0){
          if(!inside)outsideChanged++;
          if(py>floorY)floorChanged++;
          if(px>.42&&px<.58&&py>.34&&py<.44)centerChanged++;
          if(d>3){changed++;diff[i]=255;diff[i+1]=inside?180:0;}
        }
      }
      assert.equal(outsideChanged,0,`${name} ${id}: pixels moved outside scene objects`);
      assert.equal(floorChanged,0,`${name} ${id}: floor must remain pixel-stable`);
      assert.equal(centerChanged,0,`${name} ${id}: central space must remain pixel-stable`);
      assert.ok(outside/(info.width*info.height)>.45,'effect layers must stay local');
      if(id==='silk-theatre')assert.ok(changed/(info.width*info.height)>.012,'original silk weave must visibly flow');
      assert.ok(changed>100,`${name} ${id}: scene object should visibly animate`);
      const difference=changed/(info.width*info.height);
      await writeFile(`${out}/${name}-${id}-frame.png`,second);
      await sharp(diff,{raw:{width:info.width,height:info.height,channels:3}}).png().toFile(`${out}/${name}-${id}-motion-only.png`);
      const canvasSize=await canvas.evaluate(el=>[el.width,el.height]);assert.ok(canvasSize[0]*canvasSize[1]<1_002_000);
      await page.screenshot({path:`${out}/${name}-${id}.png`});
      await openPicker(page,desktop);
      if(desktop){const t=await canvas.getAttribute('data-motion-time');await page.waitForTimeout(250);assert.equal(await canvas.getAttribute('data-motion-time'),t,'picker should pause desktop scenery');}
      report.push({profile:name,id,difference,silhouetteChanged,outsideChanged,floorChanged,centerChanged,staticFraction:outside/(info.width*info.height),canvasSize,basses:bassReport});
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
