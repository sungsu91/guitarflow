import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const base=process.env.VERIFY_URL??'http://127.0.0.1:5174';
const folder='artifacts/daylight-fingerstyle';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[];
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('fretiva.score.sound','true'));
  await page.goto(`${base}/#etudes`);
  await page.getByRole('tab',{name:'에튀드',exact:true}).click();
  await page.getByRole('button',{name:'연습 유형',exact:true}).click();
  await page.getByRole('searchbox',{name:'악보 검색'}).fill('A Little Further');
  await page.locator('.etudePickerCard').click();await page.getByRole('button',{name:'불러오기',exact:true}).click();
  await page.locator('.etudeNotation svg').waitFor();
  const layouts=[];
  for(const bars of width===390?[1,4]:[2]){
   await page.getByRole('button',{name:`한 줄 ${bars}마디`,exact:true}).click();
   await page.waitForTimeout(300);
   const layout=await page.evaluate(()=>{
    const svg=document.querySelector('.etudeNotation svg'),r=svg.getBoundingClientRect();
    const bounds=n=>{const b=n.getBoundingClientRect();return {left:b.left-r.left,right:b.right-r.left,top:b.top-r.top,bottom:b.bottom-r.top};};
    return {width:innerWidth,bodyWidth:document.documentElement.scrollWidth,svgWidth:r.width,svgHeight:r.height,
     measures:[...document.querySelectorAll('.etudeMeasureNumber')].map(n=>n.textContent),
     repeats:[...svg.querySelectorAll('[data-tab-time-signature]')].flatMap((g,bar)=>[...g.querySelectorAll('.vf-stavebarline')].filter(n=>n.querySelectorAll('path').length===2).map(n=>({bar,...bounds(n)}))),
     labels:[...svg.querySelectorAll('[data-section-label]')].map(n=>({name:n.dataset.sectionLabel,...bounds(n)})),
     beams:svg.querySelectorAll('.tabRhythmBeam').length,rests:svg.querySelectorAll('.tabRhythmRest').length,
    };
   });
   assert.ok(layout.bodyWidth<=width+1);assert.equal(layout.measures.length,40);assert.ok(layout.beams>100);assert.ok(layout.rests>0);
   assert.deepEqual(layout.repeats.map(r=>r.bar),[2,9,12,19]);
   for(const b of [...layout.repeats,...layout.labels]){
    assert.ok(b.left>=-1&&b.right<=layout.svgWidth+1&&b.top>=-1&&b.bottom<=layout.svgHeight+1,JSON.stringify(b));
   }
   layouts.push({bars,...layout});
   await page.screenshot({path:`${folder}/${width}-${bars}-bars.png`});
   if(width===390&&bars===1){
    const repeat=page.locator('.etudeNotation [data-tab-time-signature]').nth(2);
    await repeat.scrollIntoViewIfNeeded();await page.screenshot({path:`${folder}/390-repeat-start.png`});
   }
  }
  await page.getByRole('button',{name:'연습 시작',exact:true}).click();
  await page.locator('.savedScorePlayhead').waitFor({state:'attached'});
  const tick=Number(await page.locator('.savedScorePlayhead').getAttribute('data-tick'));
  await page.waitForTimeout(450);assert.ok(Number(await page.locator('.savedScorePlayhead').getAttribute('data-tick'))>tick);
  await page.getByRole('button',{name:'악보 표시 방식 변경',exact:true}).click();
  await page.getByRole('combobox',{name:'악보 재생 마디',exact:true}).selectOption('9');
  await page.waitForTimeout(2900);
  assert.equal(await page.locator('.savedScorePlayhead').getAttribute('data-bar'),'2','Verse repeat returns to its first bar');
  await page.getByRole('combobox',{name:'악보 재생 마디',exact:true}).selectOption('39');
  await page.waitForTimeout(150);assert.equal(await page.locator('.savedScorePlayhead').getAttribute('data-bar'),'39');
  assert.deepEqual(errors,[]);results.push({width,layouts,errors,playhead:true,repeatJump:true,seekOutro:true});
  await page.close();
 }
 // Render every performed note through the application's own guitar output,
 // including simultaneous batches and same-string damping, at the authored BPM.
 const page=await browser.newPage();await page.goto(base);
 const audio=await page.evaluate(async()=>{
  const {daylightFingerstyle:score}=await import('/src/etudes/daylightFingerstyle.js');
  const {guitarVoiceTimeline}=await import('/src/etudes/scorePlayback.js');
  const {createScoreVoiceOutput}=await import('/src/audio/scoreInstrument.js');
  const timeline=guitarVoiceTimeline(score),rate=22050;
  const context=new OfflineAudioContext(1,Math.ceil((timeline.duration+1)*rate),rate),output=createScoreVoiceOutput(context);
  const groups=new Map();for(const voice of timeline.voices){if(!groups.has(voice.start))groups.set(voice.start,[]);groups.get(voice.start).push(voice);}
  let scheduled=0;for(const [start,voices] of groups)scheduled+=output.schedule(voices,start+.03).length;
  const rendered=await context.startRendering(),data=rendered.getChannelData(0);
  let peak=0,finite=true;for(const v of data){finite&&=Number.isFinite(v);peak=Math.max(peak,Math.abs(v));}
  const barRms=timeline.order.map((bar,visit)=>{let sum=0;const start=Math.floor(visit*4*60/92*rate),end=Math.floor((visit+1)*4*60/92*rate);for(let i=start;i<end;i++)sum+=data[i]**2;return {bar,visit,rms:Math.sqrt(sum/(end-start))};});
  const wav=new ArrayBuffer(44+data.length*2),view=new DataView(wav),text=(offset,s)=>[...s].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));
  text(0,'RIFF');view.setUint32(4,36+data.length*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,data.length*2,true);
  for(let i=0;i<data.length;i++)view.setInt16(44+2*i,Math.round(Math.max(-1,Math.min(1,data[i]))*32767),true);
  const bytes=new Uint8Array(wav);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return {wav:btoa(binary),scheduled,expected:timeline.voices.length,duration:timeline.duration,peak,finite,barRms};
 });
 assert.equal(audio.scheduled,audio.expected);assert.equal(audio.finite,true);assert.ok(audio.peak>0&&audio.peak<1);assert.equal(audio.barRms.length,56);assert.ok(audio.barRms.every(b=>b.rms>0.0001));
 await writeFile(`${folder}/a-little-further.wav`,Buffer.from(audio.wav,'base64'));delete audio.wav;
 await writeFile(`${folder}/verification.json`,JSON.stringify({results,audio},null,2));
 console.log(JSON.stringify({widths:results.map(r=>r.width),repeats:'passed',scheduled:audio.scheduled,bars:audio.barRms.length,duration:audio.duration,peak:audio.peak}));
}finally{await browser.close();}
