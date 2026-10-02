import {drawChordDiagram} from './chordStudy.js';
import {ticksOf} from './scoreModel.js';
import {measureMeters,meterTicks} from './scoreMeters.js';

// These are accompaniment references for the six harmony/solo studies, not
// constraints on their melodic TAB. Compositions use their authored voicings.
const referenceGrips={C:[null,3,2,0,1,0],Am:[null,0,2,2,1,0],F:[null,null,3,2,1,1],G:[3,2,0,0,0,3],
 Dm7:[null,null,0,2,1,1],G7:[3,2,0,0,0,1],Cmaj7:[null,3,2,0,0,0]};

export function measureChordCharts(score){
 if(score.measureCharts)return score.measureCharts;
 return score.measures.map((_,i)=>{
  const bar=score.document?.measures[i],shape=score.chordShapes?.[i];
  const meter=bar?.meter??score.meter??[4,4],capacity=meter[0]*1920/meter[1];
  const source=shape?(score.document?.kind==='builtin'?[{...shape,name:score.harmony?.[i]??shape.name,startTick:0,endTick:capacity}]:[]):bar?.sketchVoicings??[];
  const charts=[];
  for(const item of source){
   if(!Array.isArray(item.frets)||!item.name)continue;
   const previous=charts.at(-1);
   if(previous&&previous.endTick===item.startTick&&previous.name===item.name&&JSON.stringify(previous.frets)===JSON.stringify(item.frets))previous.endTick=item.endTick;
   else charts.push({...item,frets:[...item.frets]});
  }
  if(!charts.length&&score.document?.kind==='builtin'&&referenceGrips[score.harmony?.[i]])
   charts.push({name:score.harmony[i],frets:[...referenceGrips[score.harmony[i]]],startTick:0,endTick:capacity,reference:true});
  return charts;
 });
}

// Each half gets one authored grip, ranked by exact string/fret matches in
// the written notes. Duration breaks ties (and handles accompaniment references).
// Short passing changes remain in the music, without multiplying diagrams.
export function summarizeMeasureChordCharts(charts,meter=[4,4],events=[]){
 if(charts.length<2)return charts;
 const capacity=meterTicks(meter),half=capacity/2;
 let elapsed=0;
 const notes=events.flatMap(event=>{
  const start=event.onset??elapsed,end=start+ticksOf(event);elapsed=end;
  if(event.rest||event.blank||event.dead)return [];
  return (event.notes??event.tones??[event]).filter(n=>!n.dead&&Number.isInteger(n.fret)&&Number.isInteger(n.string))
   .map(n=>({...n,start,end}));
 });
 const choose=(start,end)=>{
  const candidates=new Map();
  for(const chart of charts){
   const overlap=Math.max(0,Math.min(end,chart.endTick??capacity)-Math.max(start,chart.startTick??0));
   if(!overlap)continue;
   const key=JSON.stringify([chart.name,chart.frets]),previous=candidates.get(key);
   if(previous){previous.overlap+=overlap;continue;}
   const matches=notes.reduce((total,n)=>total+(chart.frets[chart.frets.length-n.string]===n.fret
    ?Math.max(0,Math.min(end,n.end)-Math.max(start,n.start)):0),0);
   candidates.set(key,{chart,overlap,matches});
  }
  return [...candidates.values()].reduce((best,candidate)=>!best||candidate.matches>best.matches||
   (candidate.matches===best.matches&&candidate.overlap>best.overlap)?candidate:best,null)?.chart;
 };
 const first=choose(0,half),second=choose(half,capacity);
 const same=first&&second&&first.name===second.name&&JSON.stringify(first.frets)===JSON.stringify(second.frets);
 if(same)return [first];
 return [first,second].filter(Boolean);
}

// Readers, editor previews and print use the same selection. Keep the source
// voicings and all note/playback events intact.
export function displayMeasureChordCharts(score){
 const meters=measureMeters(score);
 return measureChordCharts(score).map((charts,i)=>summarizeMeasureChordCharts(charts,meters[i],score.measures[i]));
}

export function chordChartLayout(charts){
 return {columns:Math.max(1,Math.min(2,charts.length)),height:charts.length?108:0};
}

export function drawMeasureChordCharts(svg,charts,{x,width,bar}){
 const ns='http://www.w3.org/2000/svg',panel=document.createElementNS(ns,'g');
 panel.dataset.measureChordCharts=String(bar);panel.dataset.annotationBar=String(bar);
 // The panel is positioned after notation is drawn. An inner group owns the
 // engraving offset so editable annotation offsets cannot detach the diagrams.
 panel.dataset.scoreAnnotation='chord';
 const inner=document.createElementNS(ns,'g');panel.append(inner);svg.append(panel);
 const {columns}=chordChartLayout(charts),cellWidth=(width-20)/columns;
 charts.forEach((chart,i)=>{
  const slot=document.createElementNS(ns,'g');inner.append(slot);
  slot.setAttribute('transform',`translate(${x+10+i*cellWidth} 0) scale(.82)`);
  const positive=chart.frets.filter(f=>f>0),start=Math.max(0,...positive)<=4?1:Math.min(...positive);
  // An open bass does not force a 14-fret-wide box for a high-position Am.
  const shape={...chart,fretWindow:chart.fretWindow??{start:Number.isFinite(start)?start:1,end:Number.isFinite(start)?Math.max(start+3,...positive):4}};
  const diagram=drawChordDiagram(slot,shape,chart.name,-14,0,{width:72});
  diagram.dataset.chordName=chart.name;diagram.dataset.startTick=String(chart.startTick??0);
  diagram.dataset.endTick=String(chart.endTick??0);diagram.dataset.frets=JSON.stringify(chart.frets);
 });
 return panel;
}
