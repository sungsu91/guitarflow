import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/desktop-playback-follow';await mkdir(out,{recursive:true});
const d=JSON.parse(await readFile('artifacts/omr-source-layout/other-final/after.json','utf8'));
d.title='재생 화면 이동 검사';d.bpm=240;d.viewSettings={...d.viewSettings,notationView:'tab',measuresPerRow:4,systemBreaks:[]};
d.measures.push(...structuredClone(d.measures).map(m=>({...m,id:m.id+'-copy',events:m.events.map(e=>({...e,id:e.id+'-copy',notes:e.notes.map(n=>({...n,id:n.id+'-copy'}))}))})));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
try{for(const config of [{width:1920,height:912},{width:1440,height:900},{width:390,height:844,mobile:true}]){
 const {mobile=false}=config,page=await browser.newPage({viewport:{width:config.width,height:config.height},isMobile:mobile,hasTouch:mobile}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
 try{
 await page.addInitScript(d=>{localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{status:'draft',document:d}}}));localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:d.id,pdfId:''}));},d);
 await page.goto('http://localhost:5174/#etudes',{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached'});await page.locator(mobile?'.mobileScorePage':'.desktopScorePage').first().waitFor();
 const result=await page.evaluate(async({mobile})=>{
  const original=await import('/artifacts/desktop-playback-follow/BeforeFollowHarness.jsx'),patched=await import('/artifacts/desktop-playback-follow/FollowHarness.jsx');
  const root=document.querySelector(mobile?'.mobileScorePageStack':'.desktopScorePageGrid'),viewport=root.closest('.etudeScoreViewport'),papers=[...root.querySelectorAll(mobile?'.mobileScorePage':'.desktopScorePage')],widget=document.querySelector('.etudeSessionWidget');
  const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const reset=async()=>{viewport.scrollTo({top:0,left:0,behavior:'instant'});await frame();};
  const box=node=>node.getBoundingClientRect().toJSON();
  const geometry=bar=>{const b=root.querySelector(`[data-playback-bar="${bar}"]`),m=b.ownerSVGElement.getScreenCTM();return {top:+b.dataset.top*m.d+m.f,bottom:+b.dataset.bottom*m.d+m.f,left:+b.dataset.left*m.a+m.e,right:(+b.dataset.left + +b.dataset.width)*m.a+m.e};};
  const first=+papers[0].dataset.firstBar,last=+papers[0].dataset.lastBar,next=+papers[1].dataset.firstBar;
  const layout=papers.map(box),sideBySide=Math.abs(layout[0].top-layout[1].top)<2;
  if(mobile){
   const run=async module=>{await reset();const h=await module.attachFollow(root),values=[];for(const bar of [first,Math.max(first,last-2),last,next]){values.push(h.drive(bar));await frame();}h.destroy();return values;};
   const before=await run(original),after=await run(patched);return {mobile,before,after};
  }
  // Real BPM element, positioned over the adjacent page or off the current
  // page's horizontal span, as if the user had dragged it there.
  const row=geometry(last),v=box(viewport),right=sideBySide?layout[1].left+30:layout[0].right+20;
  widget.style.cssText=`position:fixed!important;left:${right}px!important;top:${row.bottom-30}px!important;right:auto!important;bottom:auto!important;transform:none!important;width:300px!important;height:120px!important`;
  await frame();
  const old=await original.attachFollow(root);old.drive(Math.max(first,last-4));const before=old.drive(last);old.destroy();await reset();
  const h=await patched.attachFollow(root);h.drive(Math.max(first,last-4));const after=h.drive(last);await frame();
  const second=h.drive(next);await frame();
  await reset();h.drive(last);widget.style.setProperty('left',`${layout[0].left+30}px`,'important');await frame();const overlap=h.drive(last);await frame();const repeated=h.drive(last);await frame();
  const uncovered=geometry(last),bpm=box(widget);
  widget.style.setProperty('left','-2000px','important');await reset();h.drive(last);
  // Open the actual shared backing panel while the playhead stays in one row.
  h.destroy();return {mobile,sideBySide,first,last,next,before,after,second,overlap,repeated,uncovered,bpm,layout};
 },{mobile});
 if(mobile)assert.deepEqual(result.after,result.before,'mobile follow remains unchanged');
 else{
  if(result.sideBySide){assert.ok(result.before.top>300,'baseline reproduces the large unwanted jump');assert.equal(result.after.top,0,'last row stays on the same spread');assert.equal(result.second.top,0,'right-hand page is already visible');}
  assert.ok(result.overlap.top>0&&result.overlap.top<250,'only enough scrolling to clear BPM');assert.ok(Math.abs(result.repeated.top-result.overlap.top)<2,'follow settles');assert.ok(result.uncovered.bottom<result.bpm.top,'BPM does not cover the current notation');
  await page.getByRole('button',{name:'백킹루프',exact:true}).first().click();await page.locator('.backingDockPanel,.etudeBackingDrawer').first().waitFor();
  result.backing=await page.evaluate(async last=>{
   const {attachFollow}=await import('/artifacts/desktop-playback-follow/FollowHarness.jsx'),root=document.querySelector('.desktopScorePageGrid'),v=root.closest('.etudeScoreViewport');v.scrollTo({top:0,left:0,behavior:'instant'});
   const panel=document.querySelector('.backingDockPanel,.etudeBackingDrawer');panel.style.setProperty('left','-2000px','important');
   const h=await attachFollow(root);h.drive(last);
   const bar=root.querySelector(`[data-playback-bar="${last}"]`),matrix=bar.ownerSVGElement.getScreenCTM(),paper=bar.closest('.desktopScorePage').getBoundingClientRect();
   const bottom=+bar.dataset.bottom*matrix.d+matrix.f;
   panel.style.cssText=`position:fixed!important;left:${paper.left+20}px!important;top:${bottom-35}px!important;right:auto!important;bottom:auto!important;transform:none!important;width:340px!important;max-height:180px!important;height:180px!important`;
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const at=h.drive(last);const b=bar.ownerSVGElement.getScreenCTM();const data={...at,noteBottom:+bar.dataset.bottom*b.d+b.f,panelTop:panel.getBoundingClientRect().top};
   h.destroy();return data;
  },result.last);
  assert.ok(result.backing.top>0&&result.backing.top<250);assert.ok(result.backing.noteBottom<result.backing.panelTop);
  // A lower page must still be brought into view; no page-number assumptions.
  result.lower=await page.evaluate(async()=>{document.querySelector('.backingDockPanel,.etudeBackingDrawer').style.setProperty('left','-2000px','important');const {attachFollow}=await import('/artifacts/desktop-playback-follow/FollowHarness.jsx'),root=document.querySelector('.desktopScorePageGrid'),papers=[...root.querySelectorAll('.desktopScorePage')],v=root.closest('.etudeScoreViewport');v.scrollTo({top:0,behavior:'instant'});const page=papers.find(p=>p.getBoundingClientRect().top>v.getBoundingClientRect().bottom);const h=await attachFollow(root),at=h.drive(+page.dataset.firstBar),line=root.querySelector('.harnessPlayhead').getBoundingClientRect(),bounds=v.getBoundingClientRect();h.destroy();return {...at,visible:line.top>=bounds.top&&line.bottom<=bounds.bottom};});
  assert.ok(result.lower.top>0);assert.ok(result.lower.visible);
 }
 assert.deepEqual(errors,[]);await page.screenshot({path:`${out}/${config.width}-verified.png`});results.push({width:config.width,...result,errors});console.log(JSON.stringify({width:config.width,sideBySide:result.sideBySide,before:result.before,after:result.after,overlap:result.overlap,backing:result.backing,mobile}));
 }catch(error){console.error(JSON.stringify({width:config.width,error:error.message}));await page.screenshot({path:`${out}/${config.width}-failure.png`}).catch(()=>{});throw error;}finally{await page.close();}
}}finally{await browser.close();await writeFile(`${out}/ui-results.json`,JSON.stringify(results,null,2));}
