import { mkdir, writeFile } from 'node:fs/promises';
import { chooseInstrument } from './instrument-dropdown-helpers.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = 'work/instrument-audit';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const reports = [];
const routes = { fretboard: '.viewerInstrumentControls', stage1: '.learningInstrumentControls', stage2: '.learningInstrumentControls', stage3: '.learningInstrumentControls', shooter: '.shooterInstrumentSelect', metronome: '.standaloneMetronomePanel', tuner: '.tunerModeShell' };
try {
  for (const [name,width,height,userAgent] of [
    ['desktop',1440,1000,''], ['phone',360,800,'iPhone Mobile'], ['tablet',768,1024,'iPad Safari'],
    ['tablet-split',507,1180,'iPad Safari'], ['landscape',844,390,'iPhone Mobile'],
  ].filter(item => !process.argv[2] || item[0] === process.argv[2])) {
    const page = await browser.newPage({viewport:{width,height},...(userAgent ? {userAgent,isMobile:true,hasTouch:true}: {})});
    const report = {name,errors:[],consoleErrors:[],httpErrors:[],failedRequests:[],routes:[]};
    page.on('pageerror',error=>report.errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
    page.on('response',response=>{if(response.status()>=400)report.httpErrors.push({status:response.status(),url:response.url()});});
    page.on('requestfailed',request=>report.failedRequests.push({url:request.url(),reason:request.failure()?.errorText}));
    await page.addInitScript(()=>{
      window.auditLongTasks=[];
      new PerformanceObserver(list=>window.auditLongTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});
      window.auditContexts=[];
      const Audio=window.AudioContext;
      window.AudioContext=new Proxy(Audio,{construct(Target,args){const context=new Target(...args);window.auditContexts.push(context);return context;}});
    });
    try {
      await page.goto(`${process.env.TEST_URL || 'http://127.0.0.1:5173/'}#fretboard`);
      await page.locator('.launchSplash').waitFor({state:'hidden'});
      for (const [route,selector] of Object.entries(routes)) {
        const start=Date.now();
        const framesMs=await page.evaluate(async route=>{
          const start=performance.now();location.hash=route;
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          return performance.now()-start;
        },route);
        await page.locator(`${selector}:visible`).first().waitFor({timeout:15000});
        const readyMs=Date.now()-start;
        const trigger=page.locator('.instrumentDropdownTrigger:visible').first();
        let changeMs;
        if(await trigger.count()) {
          const selectionStart=Date.now();
          await chooseInstrument(page,trigger,route==='fretboard'?'ukulele':'bass-6');
          changeMs=Date.now()-selectionStart;
          await trigger.click();
          await page.screenshot({path:`${out}/${name}-${route}-menu.png`});
          await page.keyboard.press('Escape');
        }
        // Wait for assets requested by this route, without requiring persistent audio/video to idle.
        await page.waitForTimeout(250);
        const dom=await page.evaluate(()=>{
          const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&getComputedStyle(e).visibility!=='hidden';};
          return {
            brokenImages:[...document.images].filter(e=>visible(e)&&e.complete&&!e.naturalWidth).map(e=>e.currentSrc||e.src),
            imageCount:[...document.images].filter(visible).length,
            videoErrors:[...document.querySelectorAll('video')].filter(visible).filter(e=>e.error).map(e=>({src:e.currentSrc,code:e.error.code})),
            overflow:document.documentElement.scrollWidth-innerWidth,
            controls:[...document.querySelectorAll('.instrumentDropdownTrigger')].filter(visible).map(e=>{const r=e.getBoundingClientRect();return {value:e.dataset.value,x:r.x,y:r.y,width:r.width,height:r.height,truncated:e.firstElementChild.scrollWidth>e.firstElementChild.clientWidth};}),
            openMenus:document.querySelectorAll('.instrumentDropdownMenu').length,
            audioContexts:window.auditContexts.map(c=>c.state),
          };
        });
        report.routes.push({route,readyMs,framesMs,changeMs,...dom});
        await page.screenshot({path:`${out}/${name}-${route}.png`});
      }
      // Menus should go away when their feature unmounts.
      await page.evaluate(()=>location.hash='stage1');await page.locator('.learningInstrumentControls:visible').waitFor();
      await page.locator('.learningInstrumentControls .instrumentDropdownTrigger').click();
      await page.evaluate(()=>location.hash='shooter');await page.locator('.shooterPanel').waitFor();
      await page.locator('.instrumentDropdownMenu').waitFor({state:'hidden'});
      report.orphanMenus=await page.locator('.instrumentDropdownMenu:visible').count();
      report.longTasks=await page.evaluate(()=>window.auditLongTasks);
    } catch(error) {report.failure=String(error);await page.screenshot({path:`${out}/${name}-failure.png`});}
    await page.close();reports.push(report);
    await writeFile(`${out}/ui-audit${process.argv[2]?'-'+process.argv[2]:''}.json`,JSON.stringify(reports,null,2));
    console.log(JSON.stringify(report));
  }
} finally {await browser.close();}
if(reports.some(r=>r.failure||r.errors.length||r.routes.some(route=>route.brokenImages.length||route.videoErrors.length||route.overflow>1)))process.exitCode=1;
