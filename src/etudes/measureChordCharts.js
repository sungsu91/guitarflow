import {drawChordDiagram} from './chordStudy.js';
import {t} from '../i18n/core.js';

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

export function chordChartLayout(charts,width){
 const columns=Math.max(1,Math.min(charts.length||1,Math.floor((width-20)/108)));
 return {columns,height:charts.length?Math.ceil(charts.length/columns)*108:0};
}

export function drawMeasureChordCharts(svg,charts,{x,width,bar,meter=[4,4]}){
 const ns='http://www.w3.org/2000/svg',panel=document.createElementNS(ns,'g');
 panel.dataset.measureChordCharts=String(bar);panel.dataset.annotationBar=String(bar);
 // The panel is positioned after notation is drawn. An inner group owns the
 // engraving offset so editable annotation offsets cannot detach the diagrams.
 panel.dataset.scoreAnnotation='chord';
 const inner=document.createElementNS(ns,'g');panel.append(inner);svg.append(panel);
 const {columns}=chordChartLayout(charts,width),cellWidth=(width-20)/columns;
 charts.forEach((chart,i)=>{
  const slot=document.createElementNS(ns,'g');inner.append(slot);
  slot.setAttribute('transform',`translate(${x+10+(i%columns)*cellWidth} ${Math.floor(i/columns)*108}) scale(.82)`);
  const positive=chart.frets.filter(f=>f>0),start=Math.max(0,...positive)<=4?1:Math.min(...positive);
  // An open bass does not force a 14-fret-wide box for a high-position Am.
  const shape={...chart,fretWindow:chart.fretWindow??{start:Number.isFinite(start)?start:1,end:Number.isFinite(start)?Math.max(start+3,...positive):4}};
  const diagram=drawChordDiagram(slot,shape,chart.name,-14,0,{width:72});
  diagram.dataset.chordName=chart.name;diagram.dataset.startTick=String(chart.startTick??0);
  diagram.dataset.endTick=String(chart.endTick??0);diagram.dataset.frets=JSON.stringify(chart.frets);
  if(charts.length>1){
   const label=document.createElementNS(ns,'text');label.textContent=t('app.beatValue1',{value1:1+(chart.startTick??0)/(1920/meter[1])});
   label.setAttribute('x','56');label.setAttribute('y','-8');label.setAttribute('text-anchor','middle');
   label.style.cssText='font:400 12px Arial;fill:#555;stroke:none';diagram.append(label);
  }
 });
 return panel;
}
