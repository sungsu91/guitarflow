import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const b=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
try{
 const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await p.addInitScript(()=>{window.audioContexts=[];const Original=window.AudioContext;window.AudioContext=new Proxy(Original,{construct(Target,args){const context=new Target(...args);window.audioContexts.push(context);return context;}});});
 await p.goto(`${process.env.TEST_URL || 'http://127.0.0.1:5175/'}#fretboard`);const nav=p.locator('.integratedBottomNav');await nav.waitFor();await p.waitForTimeout(1500);
 for(const name of ['튜너','슈팅게임','메트로놈','지판 보기','메뉴 열기']){
  await nav.getByRole('button',{name,exact:true}).click();await p.waitForTimeout(100);
 }
 await p.locator('#utility-menu-panel .utilityMenuHeader button').click();
 console.log('Contexts after navigation',await p.evaluate(()=>audioContexts.length));
 assert.equal(await p.evaluate(()=>audioContexts.length),0);
 const before=await p.evaluate(()=>[...document.querySelectorAll('.chordCatalogRow')].map(x=>x.getBoundingClientRect().height));
 await p.addStyleTag({content:'.chordCatalogPanel .chordCatalogRow {content-visibility:visible!important}'});
 const after=await p.evaluate(()=>[...document.querySelectorAll('.chordCatalogRow')].map(x=>x.getBoundingClientRect().height));
 assert.deepEqual(before,after,'Skipped rows must preserve catalog height');
 for(const width of [360,430,444,832,1440]){await p.setViewportSize({width,height:844});await p.waitForTimeout(200);console.log('Row height',width,await p.locator('.chordCatalogRow').first().evaluate(x=>({height:x.getBoundingClientRect().height,padding:getComputedStyle(x).padding,border:getComputedStyle(x).borderWidth})));}
 await p.setViewportSize({width:390,height:844});
 await nav.getByRole('button',{name:'메트로놈',exact:true}).click();
 console.log('Play buttons',await p.locator('button').filter({hasText:/^\s*PLAY\s*$/}).count());
 await p.locator('button').filter({hasText:/^\s*PLAY\s*$/}).click();
 await p.waitForFunction(()=>audioContexts.some(x=>x.state==='running'));
 console.log('Playback contexts',await p.evaluate(()=>audioContexts.map(x=>x.state)));
 await p.screenshot({path:'artifacts/nav/patched-metronome-playing.png'});
}finally{await b.close();}
