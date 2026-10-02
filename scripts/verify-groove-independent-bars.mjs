import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const base=process.env.GROOVE_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,channel:'msedge'});
await fs.mkdir('work/groove-independent-bars',{recursive:true});
try {
  for(const [width,height,touch] of [[390,844,true],[1032,1376,true],[1440,1000,false]]) {
    const page=await browser.newPage({viewport:{width,height},...(touch?{hasTouch:true,isMobile:true,userAgent:width>700?'iPad Safari':'Android Mobile'}:{})});
    page.setDefaultTimeout(45000);
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
      if(localStorage.getItem('rifflab.metronome.groove-packs.v1'))return;
      const row=(tone,hits,volume)=>({tone,volume,muted:false,steps:Array.from({length:72},(_,i)=>hits.includes(i)),velocities:Array(72).fill(70)});
      const pack=(id,title,rows)=>({id,title,scope:'bar',timeSignature:'4/4',subdivision:'sixteenth',pattern:{barCount:1,rows}});
      localStorage.setItem('rifflab.metronome.groove-packs.v1',JSON.stringify([
        pack('four','4비트 확인',[row('kick',[0,4,8,12],.75)]),
        pack('eight','8비트 확인',[row('shaker',[0,2,4,6,8,10,12,14],.4),row('snare',[4,12],.9)]),
      ]));
    });
    await page.goto(`${base}/#metronome`);await page.locator('.metronomeModeButton:visible').nth(2).click();
    const cards=page.locator('.grooveBarCard');
    const snapshot=()=>page.locator('.grooveEditor').evaluate(el=>({
      tones:[...el.querySelectorAll('.grooveToneTrigger')].map(e=>e.textContent.trim()),
      notes:[...el.querySelectorAll('.grooveTrack')].map(row=>[...row.querySelectorAll('.grooveBeat button')].map(e=>[e.getAttribute('aria-pressed'),e.getAttribute('data-strength')])),
    }));
    const load=async(title,scope='bar')=>{
      await page.locator('.groovePacksTrigger').click();await page.locator('#groove-tab-saved').click();
      await page.getByRole('button',{name:scope==='bar'?'마디 팩':'마디 구성',exact:true}).click();
      await page.locator('.groovePackPick').filter({hasText:title}).click();await page.locator('.groovePackLoad>button').click();
    };
    const save=async(title,scope)=>{
      await page.locator('.grooveSaveButton').click();await page.getByRole('combobox',{name:'저장 범위',exact:true}).selectOption(scope);
      const selects=page.locator('.groovePackDialog form select');if(await selects.count()>1)await selects.nth(1).selectOption('new');
      await page.locator('.groovePackDialog form input').fill(title);await page.locator('.groovePackDialog button[type=submit]').click();
    };
    await load('4비트 확인');const four=await snapshot();assert.equal(four.tones.length,1);assert.equal(four.notes[0].filter(n=>n[0]==='true').length,4);
    await page.locator('.grooveAddBar').click();
    await load('8비트 확인');const eight=await snapshot();assert.equal(eight.tones.length,2);assert.equal(eight.notes[0].filter(n=>n[0]==='true').length,8);
    for(let repeat=0;repeat<2;repeat++){
      await load('4비트 확인');assert.deepEqual(await snapshot(),four);
      await load('8비트 확인');assert.deepEqual(await snapshot(),eight);
    }
    await cards.nth(0).click();assert.deepEqual(await snapshot(),four);
    await cards.nth(1).click();await page.locator('.grooveToneTrigger').first().click();
    await page.locator('.grooveTonePopup').getByRole('button',{name:'라이드',exact:true}).click();
    await page.locator('.grooveToneTrigger').first().click();await page.locator('.grooveToneMute').click();
    const muted=await snapshot();assert.notDeepEqual(muted.tones,eight.tones);
    await page.locator('.grooveToolbar > button').first().click();assert.equal(await page.locator('.grooveTrack').count(),3);
    await page.locator('.grooveDeleteToggle').click();await page.locator('.grooveRemoveTrack').last().click();await page.locator('.grooveDeleteToggle').click();
    assert.deepEqual(await snapshot(),muted);
    await cards.nth(0).click();assert.deepEqual(await snapshot(),four);
    await cards.nth(1).click();assert.deepEqual(await snapshot(),muted);
    await load('8비트 확인');assert.deepEqual(await snapshot(),eight);
    await save('현재 마디만','bar');await save('독립 마디 구성','arrangement');
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('rifflab.metronome.groove-packs.v1')));
    assert.equal(saved.find(p=>p.title==='현재 마디만').pattern.rows.length,2);
    assert.ok(saved.find(p=>p.title==='현재 마디만').pattern.rows.every(row=>row.bar===undefined));
    await page.reload();await page.locator('.metronomeModeButton:visible').nth(2).click();await load('독립 마디 구성','arrangement');
    assert.equal(await cards.count(),2);assert.deepEqual(await snapshot(),four);
    await cards.nth(1).click();assert.deepEqual(await snapshot(),eight);
    assert.equal(await cards.nth(0).locator('.grooveMiniRow').count(),1);assert.equal(await cards.nth(1).locator('.grooveMiniRow').count(),2);
    await page.screenshot({path:`work/groove-independent-bars/${width}.png`,fullPage:true});
    for(let i=0;i<16;i++)await page.locator('.standaloneMetronomePanel .metronomeHeroBpmJumpButton--up:visible').click();
    await cards.nth(0).click();await page.locator('.standaloneMetronomePanel .metronomeHeroPlayButton:visible').click();
    for(const bar of [0,1,0])await page.waitForFunction(bar=>{
      const cards=document.querySelectorAll('.grooveBarCard');
      return cards[bar]?.getAttribute('aria-current')==='step'&&document.querySelectorAll('.grooveTrack').length===(bar===0?1:2);
    },bar,{timeout:5000});
    await page.locator('.standaloneMetronomePanel .metronomeHeroPlayButton:visible').click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({width,status:'passed',checks:['independent 4/8-beat packs','replacement without accumulation','tone/mute/add/delete isolation','bar and arrangement saves','reload and sequential playback']}));
    await page.close();
  }
} finally {await browser.close();}
