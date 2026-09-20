import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const results=[];
await mkdir('artifacts/editor-row-spacing',{recursive:true});
for(const [engine,type,options] of [['chrome',chromium,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}],['webkit',webkit,{}]]){
 let browser;try{browser=await type.launch({headless:true,...options});}catch(error){if(engine!=='webkit')throw error;results.push({engine,unavailable:error.message});continue;}
 try{for(const width of [360,390,430,1440]){
  const page=await browser.newPage({viewport:{width,height:width===1440?1000:844},isMobile:width<600,hasTouch:width<600});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5177/#etudes');
  await page.getByRole('button',{name:/악보 만들기/}).click();
  await page.locator('[data-draw-count]').first().waitFor();
  const fixture=await page.evaluate(async()=>{
   const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js');
   let d=m.createBlankDocument();d.measures=Array.from({length:8},()=>m.blankMeasure());
   for(let bar=0;bar<8;bar++)for(let event=0;event<4;event++)d=c.enterFretWithDuration(d,{bar,event,string:6},5,'4');
   d.viewSettings.measuresPerRow=4;return d;
  });
  const upload=async d=>{
   await page.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'row-spacing.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});
   await page.waitForTimeout(150);
  };
  const geometry=()=>page.locator('.etudeEditorMeasure').evaluateAll(bars=>bars.map(bar=>{
   const svg=bar.querySelector('[data-draw-count]').shadowRoot.querySelector('svg'),rect=svg.getBoundingClientRect();
   return {scale:svg.getScreenCTM().a,width:rect.width,height:rect.height,x:rect.x,y:rect.y,viewWidth:svg.viewBox.baseVal.width,row:bar.dataset.layoutRow};
  }));
  await upload(fixture);const before=await geometry();
  const dense=await page.evaluate(async d=>{
   const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js');d.measures[1]=m.blankMeasure();
   for(let event=0;event<16;event++)d=c.enterFretWithDuration(d,{bar:1,event,string:6},9,'16');return d;
  },fixture);
  await upload(dense);const after=await geometry();
  if(width<600){
   assert(Math.abs(before[4].scale-after[4].scale)<.001,'dense first row must not resize second row');
   assert(Math.abs(before[4].width-after[4].width)<.1);
   assert(after[1].width>after[2].width,'dense bar gets more space than quarter-note bar');
  }
  for(const perRow of [1,2,3,4]){
   await page.getByRole('button',{name:`한 줄 ${perRow}마디`,exact:true}).click();
   await page.waitForTimeout(80);const bars=await geometry();
   for(const bar of bars){assert(Number.isFinite(bar.scale)&&bar.scale>0);assert(bar.height>0);}
   for(let i=1;i<bars.length;i++)if(bars[i].row===bars[i-1].row)assert(Math.abs(bars[i].x-bars[i-1].x-bars[i-1].width)<1,'barlines meet');
   await page.screenshot({path:`artifacts/editor-row-spacing/${engine}-${width}-${perRow}.png`});
  }
  await page.getByRole('button',{name:'줄 편집',exact:true}).click();
  await page.getByRole('button',{name:'4마디 새 줄로 나누기',exact:true}).click();
  const split=await geometry();assert.deepEqual(split.map(b=>b.row),['1','1','1','2','2','2','2','3']);
  if(width<600){
   const copyFixture=await page.evaluate(async()=>{
    const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js');
    let d=c.setEventDuration(m.createBlankDocument(),{bar:0,event:3},'16');
    return c.enterFretWithDuration(d,{bar:0,event:6,string:6},7,'16');
   });
   await upload(copyFixture);
   await page.locator('.etudeEditorMeasure[data-bar-index="0"] .etudeNoteHandle[data-event="6"][data-mode="tab"][data-string="6"]').click();
   await page.getByRole('button',{name:'줄 복사',exact:true}).click();
   assert.equal(await page.locator('.mobileDurationRow').getByRole('button',{name:'16분음표',exact:true}).getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('.etudeEditorMeasure').count(),2);
  }
  assert.deepEqual(errors,[]);results.push({engine,width,unrelatedRowStable:width<600,before,after});await page.close();
 }}finally{await browser.close();}
}
await writeFile('artifacts/editor-row-spacing/results.json',JSON.stringify(results,null,2));
console.log(results.map(({engine,width,unavailable})=>({engine,width,...(unavailable?{unavailable}: {passed:true})})));
