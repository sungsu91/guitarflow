import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const b=await chromium.launch({headless:true,channel:'msedge'});
const report=[];
try{for(const theme of ['light','brand'])for(const [width,height] of [[360,800],[375,812],[390,844],[393,852],[430,932],[1366,900]]){
const p=await b.newPage({viewport:{width,height},isMobile:width<1000,hasTouch:width<1000}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(t=>localStorage.setItem('rifflabThemeMode',t),theme);await p.goto('http://127.0.0.1:5176/#metronome');
await p.getByRole('button',{name:'3 그루브',exact:true}).click();
const panel=p.locator('.app.metronomeMode > .standaloneMetronomePanel'),editor=panel.locator('.grooveEditor');
const styles=await panel.evaluate(e=>[...e.querySelectorAll('.grooveEditor,.metronomeHeroCard,.metronomeControl,.backingLoopPanel')].map(n=>{const s=getComputedStyle(n);return {border:s.borderColor,radius:s.borderRadius,shadow:s.boxShadow,bg:s.backgroundColor};}));
assert.equal(new Set(styles.map(s=>s.border)).size,1);assert.ok(styles.every(s=>s.radius==='12px'&&s.shadow==='none'));
assert.equal(await editor.locator('.grooveTrackName select').first().evaluate(e=>getComputedStyle(e).boxShadow),'none');
await p.getByRole('button',{name:'BPM 1 올리기',exact:true}).click();assert.equal(await panel.locator('.metronomeHeroBpmValue strong').innerText(),'81');
await p.getByRole('button',{name:'BPM 10 낮추기',exact:true}).click();assert.equal(await panel.locator('.metronomeHeroBpmValue strong').innerText(),'71');
await panel.locator('.metronomeHeroPlayButton').click();await p.waitForTimeout(160);assert.equal(await editor.locator('.groovePlayTrack > i').evaluate(e=>e.getAnimations()[0]?.playState),'running');
await panel.locator('.metronomeHeroPlayButton').click();
await p.getByRole('button',{name:'박자',exact:true}).click();const popup=p.getByRole('dialog',{name:'박자 선택',exact:true});assert.ok(await popup.isVisible());await popup.getByRole('button',{name:'6/8',exact:true}).click();assert.equal(await editor.locator('.grooveTrack').first().locator('.grooveBeat button').count(),24);
await p.getByRole('button',{name:'박자',exact:true}).click();await popup.getByRole('button',{name:'4/4',exact:true}).click();
await editor.getByLabel('표기 방식').selectOption('100');await editor.getByRole('button',{name:'1행 2칸',exact:true}).click();assert.equal(await editor.getByRole('button',{name:'1행 2칸',exact:true}).getAttribute('data-strength'),'strong');
await editor.getByRole('button',{name:'줄 삭제',exact:true}).click();await editor.getByRole('button',{name:'3행 삭제',exact:true}).click();assert.equal(await editor.locator('.grooveTrack').count(),2);
await editor.getByRole('button',{name:'줄 삭제',exact:true}).click();await editor.getByRole('button',{name:'+ 줄 추가',exact:true}).click();assert.equal(await editor.locator('.grooveTrack').count(),3);
await editor.getByRole('button',{name:'초기화',exact:true}).click();await p.getByRole('dialog',{name:'패턴을 초기화할까요?',exact:true}).getByRole('button',{name:'아니오',exact:true}).click();
await p.getByRole('button',{name:'트래커 접기',exact:true}).click();
await p.evaluate(()=>window.scrollTo(0,0));
const boxes=await panel.evaluate(e=>[...e.querySelectorAll('.grooveEditor,.metronomeHeroCard,.metronomeControl,.backingLoopPanel')].map(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right,top:r.top,bottom:r.bottom};}));
assert.ok(boxes.every(r=>r.x>=0&&r.right<=width+1));
assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await p.screenshot({path:`output/unified-panels-${theme}-${width}.png`,fullPage:width>=1000});
await p.getByRole('button',{name:'트래커 펼치기',exact:true}).click();
await p.locator('.metronomeAdvancedSummary').first().click();assert.ok(await p.locator('.metronomeAdvancedPopover').isVisible());await p.locator('.metronomeAdvancedPopover').getByRole('button',{name:'Done',exact:true}).click();
await panel.locator('.backingLoopPanel').scrollIntoViewIfNeeded();await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
const backing=await panel.locator('.backingLoopMainControls').boundingBox();const nav=p.locator('.integratedBottomNav:visible');if(width<1000&&await nav.count()){const n=await nav.first().boundingBox();assert.ok(backing.y+backing.height<=n.y+1,'bottom controls reachable above navigation');}
assert.deepEqual(errors,[]);report.push({theme,width,height,styles,checks:'BPM, play/stop, meter, edit/delete/add, reset cancel, dock/popover, overflow, safe bottom'});console.log('PASS unified panels',theme,width);await p.close();
}
writeFileSync('output/unified-panels-verification.json',JSON.stringify(report,null,2));
}finally{await b.close();}
