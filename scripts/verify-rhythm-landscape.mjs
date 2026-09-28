import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const engine=process.env.CHECK_BROWSER||'chromium',base=process.env.CHECK_URL||'http://127.0.0.1:4193',out=process.env.CHECK_OUTPUT||`work/rhythm-landscape-check/${engine}`;
const sizes=JSON.parse(process.env.CHECK_SIZES||'[[568,320],[667,375],[844,390],[968,412],[390,844],[1440,900]]');await mkdir(out,{recursive:true});
const b=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{channel:'msedge'}:{})});const report=[];
try{for(const [width,height] of sizes){
 const mobile=width<1024,landscape=mobile&&width>height;
 const p=await b.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile});p.setDefaultTimeout(20000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const screen=async name=>p.locator(`.rt-workspace[data-screen="${name}"]`).waitFor({state:'visible'});
 await p.goto(base+'/#rhythm-trainer');await p.locator('.launchSplash').waitFor({state:'detached'});await p.locator('[data-pack="pack-quarter-foundation"]').click();await screen('setup');
 for(let i=4;i<16;i++)await p.getByRole('button',{name:'마디 늘리기',exact:true}).click();
 assert.equal(await p.locator('.rt-score-scroll [data-measure]').count(),16);assert.equal(await p.locator('.rt-page-controls').count(),0);
 if(landscape){
  assert.equal(await p.locator('.rt-header').count(),0);assert.equal(await p.getByText('연습 준비',{exact:true}).count(),0);
  const back=await p.getByRole('button',{name:'뒤로',exact:true}).boundingBox(),title=await p.locator('.rt-meta strong').boundingBox();assert.ok(back.x+back.width<=title.x&&Math.abs((back.y+back.height/2)-(title.y+title.height/2))<2);
  assert.equal(await p.locator('.rt-meta .rt-landscape-view button').count(),4);
  assert.equal(await p.locator('.rt-quick .rt-header-actions button').count(),3);
  const items=await p.locator('.rt-quick').evaluate(e=>[...e.children].map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent,x:r.x,right:r.right,center:r.y+r.height/2};}));
  assert.ok(items.every(i=>Math.abs(i.center-items[0].center)<2),JSON.stringify(items));for(let i=1;i<items.length;i++)assert.ok(items[i].x>=items[i-1].right-1);
  if(width>=667)assert.ok(items.at(-1).right<=width);
  await p.getByRole('button',{name:'한 줄에 4마디 보기',exact:true}).click();
  const boxes=await p.locator('.rt-score-scroll [data-measure]').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().toJSON()));
  for(let i=0;i<16;i++){assert.ok(Math.abs(boxes[i].y-boxes[Math.floor(i/4)*4].y)<1);if(i>=4)assert.ok(boxes[i].y>boxes[i-4].bottom);}
  assert.ok(Math.abs(boxes[4].x-boxes[0].x)<1);
 }else assert.equal(await p.locator('.rt-header strong').innerText(),'연습 준비');
 await p.screenshot({path:`${out}/setup-${width}.png`});
 // The moved actions keep their existing behavior.
 await p.getByRole('button',{name:'가이드실',exact:true}).click();await p.getByRole('dialog',{name:'리듬 가이드실',exact:true}).waitFor();await p.getByRole('button',{name:'가이드실 닫기'}).click();
 await p.locator('.rt-header-actions').getByRole('button',{name:/PDF/}).click();await p.locator('.print-preview-overlay').waitFor();await p.goBack();await p.locator('.print-preview-overlay').waitFor({state:'detached'});await screen('setup');
 await p.getByRole('button',{name:'복사·편집',exact:true}).click();await screen('edit');assert.equal(await p.locator('.rt-score-scroll [data-measure]').count(),16);
 await p.getByRole('button',{name:'16 / 1',exact:true}).click();await p.getByRole('dialog',{name:'16 마디 · 1 박 편집',exact:true}).waitFor();await p.getByRole('dialog',{name:'16 마디 · 1 박 편집',exact:true}).getByRole('button',{name:'닫기',exact:true}).click();
 await p.getByRole('button',{name:'편집 취소',exact:true}).click();await screen('setup');
 let playbackFollow=false;
 if(engine==='chromium'&&landscape&&width>=844){
  await p.getByRole('button',{name:'한 줄에 2마디 보기',exact:true}).click();await p.getByRole('spinbutton',{name:'연습 BPM',exact:true}).fill('240');
  await p.getByRole('button',{name:'1마디부터 재생',exact:true}).click();await screen('play');await p.getByRole('button',{name:'일시정지',exact:true}).waitFor();
  await p.waitForFunction(()=>{const s=document.querySelector('.rt-score-scroll'),m=s?.querySelector('[data-measure]:has(.rt-cursor)');return m&&Number(m.dataset.measure)>=4&&s.scrollTop>0;});
  const followed=await p.locator('.rt-score-scroll').evaluate(s=>{const v=s.getBoundingClientRect(),m=s.querySelector('[data-measure]:has(.rt-cursor)').getBoundingClientRect();return {visible:m.top>=v.top-1&&m.bottom<=v.bottom+1,scroll:s.scrollTop,count:s.querySelectorAll('[data-measure]').length};});assert.ok(followed.visible);assert.equal(followed.count,16);
  await p.getByRole('button',{name:'일시정지',exact:true}).click();await p.screenshot({path:`${out}/playback-follow-${width}.png`});
  await p.getByRole('button',{name:'처음으로',exact:true}).click();assert.equal(await p.locator('.rt-score-scroll').evaluate(e=>e.scrollTop),0);
  await p.goBack();await screen('setup');playbackFollow=true;
 }
 await p.goBack();await screen('library');assert.equal(new URL(p.url()).hash,'#rhythm-trainer');assert.deepEqual(errors,[]);
 report.push({engine,width,height,continuous16Bars:true,toolbar:true,guide:true,pdf:true,editLastBar:true,backNavigation:true,playbackFollow});console.log(JSON.stringify(report.at(-1)));await p.close();
}await writeFile(out+'/verification.json',JSON.stringify(report,null,2));}finally{await b.close();}
