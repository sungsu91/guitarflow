import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const browser=await chromium.launch({headless:true,channel:'msedge'});
const base=process.env.GROOVE_TEST_URL||'http://127.0.0.1:5173';
try {
  for(const [width,height,touch] of [[1440,1000,false],[390,844,true],[1032,1376,true]]) {
    const page=await browser.newPage({viewport:{width,height},...(touch?{hasTouch:true,isMobile:true,userAgent:width>700?'iPad Safari':'Android Mobile'}:{})});
    page.setDefaultTimeout(45000);
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
      window.testVoices=[];
      for(const NodeType of [AudioBufferSourceNode,OscillatorNode]) {
        const start=NodeType.prototype.start,stop=NodeType.prototype.stop;
        NodeType.prototype.start=function(time,...args){
          this.testVoice={time,context:this.context};window.testVoices.push(this.testVoice);
          return start.call(this,time,...args);
        };
        NodeType.prototype.stop=function(time,...args){
          if(this.testVoice)this.testVoice.stopAt=time??this.context.currentTime;
          return stop.call(this,time,...args);
        };
      }
    });
    await page.goto(`${base}/#metronome`);
    const modes=page.locator('.metronomeModeButton:visible');
    const play=page.locator('.standaloneMetronomePanel .metronomeHeroPlayButton:visible');
    await modes.nth(2).click();
    await page.locator('.grooveAddBar').click();
    const edited=page.locator('.grooveTrack').first().locator('.grooveBeat button').nth(1);
    await edited.click();
    for(const target of [0,1]) {
      await play.click();await page.waitForFunction(()=>document.querySelector('.metronomeModeButton[aria-pressed=true]')?.textContent.includes('3')&&window.testVoices.length>0);
      await page.waitForTimeout(150);
      assert.match(await play.innerText(),/STOP/);
      await modes.nth(2).click();assert.match(await play.innerText(),/STOP/);
      await modes.nth(target).evaluate(el=>el.addEventListener('click',()=>{
        window.testSwitch={count:window.testVoices.length,now:window.testVoices.at(-1).context.currentTime};
      },{once:true,capture:true}));
      await modes.nth(target).click();
      assert.match(await play.innerText(),/PLAY/);
      await page.waitForTimeout(1000);
      const audio=await page.evaluate(()=>({
        before:window.testSwitch.count,after:window.testVoices.length,
        pending:window.testVoices.filter(v=>v.time>window.testSwitch.now).map(v=>({start:v.time,stop:v.stopAt,deadline:window.testSwitch.now+.02})),
      }));
      assert.equal(audio.after,audio.before,'No new audio may be scheduled after leaving groove mode');
      assert.ok(audio.pending.length>0,'Exercise cancellation of queued groove notes');
      assert.ok(audio.pending.every(v=>v.stop<=v.deadline),JSON.stringify(audio));
      await modes.nth(2).click();assert.match(await play.innerText(),/PLAY/);
      assert.equal(await page.locator('.grooveBarCard').count(),2);
      await page.locator('.grooveBarCard').nth(1).click();assert.equal(await edited.getAttribute('aria-pressed'),'true');
    }
    // Dot and circle are visual alternatives; their existing playback behavior stays intact.
    await modes.nth(0).click();await play.click();await page.waitForTimeout(150);
    await modes.nth(1).click();assert.match(await play.innerText(),/STOP/);await play.click();
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({width,status:'passed',checks:['3 to 1 stops','3 to 2 stops','queued audio cancelled','same-mode click continues','groove edits retained','1 to 2 continues']}));
    await page.close();
  }
} finally {await browser.close();}
