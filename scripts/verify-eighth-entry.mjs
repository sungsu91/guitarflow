import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {createBlankDocument} from '../src/etudes/scoreModel.js';
import {enterFret,enterFretWithDuration} from '../src/etudes/editorCommands.js';
import {inputRhythm} from '../src/etudes/rhythmInput.js';
import {setBeamRange} from '../src/etudes/beamOverrides.js';

const at=event=>({bar:0,event,string:6});
let quarters=createBlankDocument();
for(let i=0;i<4;i++)quarters=enterFret(quarters,at(i),i+1);
let mixed=createBlankDocument();
for(const [i,duration] of ['8','8','16','16','8'].entries())mixed=inputRhythm(mixed,at(i),{selectedDuration:duration},'note',3).document;
mixed=setBeamRange(mixed,{bar:0,start:0,end:3},'join');

let changingStrings=createBlankDocument();
for(const [i,[string,fret]] of [[3,2],[4,0],[2,3],[4,0],[3,2],[4,0],[2,3],[4,0]].entries())changingStrings=enterFretWithDuration(changingStrings,{bar:0,event:i,string},fret,'8');
changingStrings=enterFret(changingStrings,{bar:0,event:4,string:6},2);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/eighth-entry',{recursive:true});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:1000},isMobile:width===390,hasTouch:width===390});
  page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/#etudes');
  await page.getByRole('button',{name:'악보 만들기',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'악보 편집',exact:true});await dialog.waitFor();
  const button=name=>dialog.getByRole('button',{name,exact:true});
  const note=i=>dialog.locator(`[data-bar-index="0"] .etudeNoteHandle[data-mode="tab"][data-event="${i}"][data-string="6"]`);
  const groups=()=>dialog.locator('[data-bar-index="0"] .etudeTabRhythm').evaluate(root=>{
   const starts=[...root.querySelectorAll('.tabRhythmBeam')].filter(e=>Number(e.getAttribute('y1'))===Number(root.dataset.beamY)).map(e=>Number(e.dataset.rhythmEvent));
   const groups=[];for(const i of starts){const last=groups.at(-1);if(last?.at(-1)===i)last.push(i+1);else groups.push([i,i+1]);}return groups.map(g=>g.join(','));
  });
  const load=async document=>{
   await page.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'entry.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(document))});
   await dialog.locator('[data-bar-index="0"] .etudeNoteHandle[data-mode="tab"][data-event="0"]').first().waitFor();
  };
  await load(quarters);
  await note(2).click();await button('8분음표').click();await button('다음 입력 위치').click();await button('프렛 7').click();
  assert.deepEqual(await groups(),['2,3']);
  assert.equal(await dialog.locator('.tabRhythmStem').count(),4);
  let sixteenths=createBlankDocument();
  for(const [i,duration] of ['16','16','16','8','8'].entries())sixteenths=enterFretWithDuration(sixteenths,{bar:0,event:i,string:6},4,duration);
  await load(sixteenths);await note(2).click();await button('8분음표').click();
  assert.deepEqual(await groups(),['0,1,2','3,4']);
  await button('다음 입력 위치').click();await button('프렛 7').click();
  assert.deepEqual(await groups(),['0,1,2','3,4']);
  // A pre-existing quarter after an eighth adopts the entry value on input.
  let continuation=createBlankDocument();
  for(const [i,duration] of ['8','4','4'].entries())continuation=enterFretWithDuration(continuation,{bar:0,event:i,string:6},4,duration);
  await load(continuation);await note(0).click();await button('다음 입력 위치').click();
  assert.equal(await button('8분음표').getAttribute('aria-pressed'),'true');
  await button('프렛 5').click();assert.deepEqual(await groups(),['0,1']);
  await page.screenshot({path:`artifacts/eighth-entry/${width}-sequential.png`});
  await load(mixed);await note(4).click();await button('다음 입력 위치').click();await button('프렛 3').click();
  assert.deepEqual(await groups(),['0,1','2,3,4']);
  await page.screenshot({path:`artifacts/eighth-entry/${width}-paired.png`});

  assert.equal(await button('빔 도구 열기').count(),0);
  assert.equal(await button('빔 범위 선택').count(),0);
  assert.equal(await button('빔 연속 적용').count(),0);
  await load(changingStrings);
  assert.deepEqual(await groups(),['0,1','2,3','4,5','6,7']);
  const connector=dialog.locator('.tabRhythmChordStem[data-rhythm-event="4"]');
  assert.equal(await connector.count(),1);
  assert(await connector.evaluate(e=>Number(e.getAttribute('y2'))>Number(e.getAttribute('y1'))));
  await button('빔표기 도구 열기').click();
  await button('TAB 빔 위 표시').click();
  assert.equal(await dialog.locator('.etudeTabRhythm').getAttribute('data-position'),'above');
  assert.equal(await connector.count(),1);
  assert.deepEqual(await groups(),['0,1','2,3','4,5','6,7']);
  await button('TAB 빔 아래 표시').click();
  await page.screenshot({path:`artifacts/eighth-entry/${width}-automatic.png`});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({width,quarterSubdivision:true,automaticMixedBeams:true,legacyOverridesIgnored:true,manualControlsRemoved:true,tabDisplay:true,errors}));
  await page.close();
 }
}finally{await browser.close();}
