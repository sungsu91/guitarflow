import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
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
      const first=await canvas.screenshot(); await page.waitForTimeout(1200); const second=await canvas.screenshot();
      const a=await sharp(first).resize(300,200).removeAlpha().raw().toBuffer(), b=await sharp(second).resize(300,200).removeAlpha().raw().toBuffer();
      let changed=0,total=0; for(let i=0;i<a.length;i+=3){const d=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);if(d>12)changed++;total+=d;}
      const difference=changed/(a.length/3);assert.ok(difference>.04,`${name} ${id}: motion too weak (${difference})`);
      const canvasSize=await canvas.evaluate(el=>[el.width,el.height]);assert.ok(canvasSize[0]*canvasSize[1]<1_002_000);
      await page.screenshot({path:`${out}/${name}-${id}.png`});
      await openPicker(page,desktop);
      if(desktop){const t=await canvas.getAttribute('data-motion-time');await page.waitForTimeout(250);assert.equal(await canvas.getAttribute('data-motion-time'),t,'picker should pause desktop scenery');}
      report.push({profile:name,id,difference,canvasSize,basses:bassReport});
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
