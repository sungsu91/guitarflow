import test from 'node:test';
import assert from 'node:assert/strict';
import {ETUDES} from '../src/etudes/catalog.js';
import {measureChordCharts,summarizeMeasureChordCharts,chordChartLayout} from '../src/etudes/measureChordCharts.js';
import {nightBloomsAgain as night} from '../src/etudes/nightBloomsAgain.js';
import {lightStays as light} from '../src/etudes/lightStays.js';

test('every built-in bar with harmony has a chart without inventing chords for scale exercises',()=>{
 for(const score of ETUDES){
  const before=JSON.stringify(score),charts=measureChordCharts(score);
  score.measures.forEach((_,i)=>{
   assert.equal(charts[i].length>0,Boolean(score.harmony?.[i]),`${score.id} bar ${i+1}`);
   for(const c of charts[i])assert.equal(c.frets.length,6);
  });
  assert.equal(JSON.stringify(score),before,'display must not mutate notes, playback or voicings');
 }
});

test('same-named positions remain distinct and genuine repeats merge only inside their own bar',()=>{
 const charts=measureChordCharts(light);
 assert.deepEqual(charts[0].map(c=>[c.startTick,c.endTick,c.frets[5]]),[[0,960,0],[960,1920,3]]);
 assert.equal(charts[1].length,1);assert.equal(charts[1][0].endTick,1920);
 assert.deepEqual(charts[9].map(c=>[c.name,c.startTick,c.frets[5]]),[['Dsus4',0,3],['D',960,2]]);
 assert.deepEqual(measureChordCharts(night)[33][0].frets,[null,0,14,14,13,12]);
 assert.deepEqual(measureChordCharts(night)[1].map(c=>[c.name,c.startTick]),[['C/E',0],['G',960]]);
});

test('compact chart layouts wrap dense changes and scale-only scores remain unchanged',()=>{
 const charts=Array.from({length:5},()=>({name:'C'}));
 assert.deepEqual(chordChartLayout(charts,264),{columns:2,height:324});
 assert.deepEqual(chordChartLayout(charts,600),{columns:5,height:108});
 assert.equal(chordChartLayout([],264).height,0);
 const score=ETUDES.find(e=>e.templateId==='triad-start');assert(measureChordCharts(score).every(c=>!c.length));
});

test('user-authored single diagrams retain their editor visibility and range handling',()=>{
 const score=ETUDES.find(e=>e.chordShapes?.some(Boolean));
 const custom={...score,document:{...score.document,kind:'user'}};
 assert(measureChordCharts(custom).every(c=>!c.length),'existing user charts use their original annotation renderer');
});

test('desktop charts summarize each half without changing authored chord events',()=>{
 const charts=[['C',0,480],['Dm',480,960],['Em',960,1440],['F',1440,1680],['G',1680,1920]]
  .map(([name,startTick,endTick])=>({name,startTick,endTick,frets:[null,3,2,0,1,0]}));
 const original=structuredClone(charts),summary=summarizeMeasureChordCharts(charts);
 assert.deepEqual(summary.map(c=>[c.name,c.halfLabel]),[['C','app.firstBeat'],['Em','app.secondBeat']]);
 assert.deepEqual(chordChartLayout(summary,180,true),{columns:2,height:108});
 assert.deepEqual(charts,original);
});

test('half-bar summary respects compound meters and preserves distinct voicings',()=>{
 const frets=[null,0,2,2,1,0],charts=[
  {name:'Am',frets,startTick:0,endTick:720},
  {name:'Am',frets:[...frets.slice(0,5),3],startTick:720,endTick:1440},
 ];
 assert.equal(summarizeMeasureChordCharts(charts,[6,8]).length,2);
 assert.equal(summarizeMeasureChordCharts(charts.map(c=>({...c,frets})),[6,8]).length,1);
 assert.deepEqual(summarizeMeasureChordCharts([], [3,4]),[]);
 for(const score of ETUDES){
  const original=JSON.stringify(score);
  for(const [i,charts] of measureChordCharts(score).entries()){
   const summary=summarizeMeasureChordCharts(charts,score.document?.measures[i]?.meter??score.meter);
   assert(summary.length<=2,score.id);
   assert(summary.every(c=>charts.some(source=>source.name===c.name&&JSON.stringify(source.frets)===JSON.stringify(c.frets))));
  }
  assert.equal(JSON.stringify(score),original);
 }
});
