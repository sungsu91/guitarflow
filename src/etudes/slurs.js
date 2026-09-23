import ko from "../i18n/locales/ko.js";
import {patchEvent} from './scoreModel.js';

export function slurSpans(measures){
 const events=measures.flatMap(m=>m.events??m),positions=new Map(events.map((e,i)=>[e.id,i]));
 return events.flatMap((event,start)=>{
  const end=positions.get(event.slurTo);
  if(end===undefined||end<=start||events.slice(start,end+1).some(e=>e.rest))return [];
  return [{from:event.id,to:event.slurTo,ids:events.slice(start,end+1).map(e=>e.id),below:events.slice(start,end).some(e=>e.technique==='S')}];
 });
}
export function setSlur(document,from,to){
 const events=document.measures.flatMap(m=>m.events),start=events.findIndex(e=>e.id===from),end=events.findIndex(e=>e.id===to);
 if(start<0||end<=start||events.slice(start,end+1).some(e=>e.rest||!e.notes.length))throw Error(ko["etudes.selectAStartingNoteAndALaterEndingNoteWithNoRests"]);
 const bar=document.measures.findIndex(m=>m.events.some(e=>e.id===from));
 return patchEvent(document,bar,document.measures[bar].events.findIndex(e=>e.id===from),{slurTo:to});
}
export function slurCovers(spans,from,to){return spans.some(s=>{const a=s.ids.indexOf(from),b=s.ids.indexOf(to);return a>=0&&b>a;});}

// Each engraved system gets its own segment, also when editor measures live
// in separate SVG roots. Endpoints are event IDs, independent of pitch/time.
export function drawSlurs(svg,drawn,spans){
 const ns='http://www.w3.org/2000/svg';
 for(const span of spans){
  const members=drawn.filter(n=>span.ids.includes(n.event.id));
  for(const row of [...new Set(members.map(n=>n.row))]){
   const local=members.filter(n=>n.row===row),first=local[0],last=local.at(-1);
   for(const mode of ['tab','staff']){
    const a=mode==='tab'?first.tab:first.note,b=mode==='tab'?last.tab:last.note;
    const starts=first.event.id===span.from,ends=last.event.id===span.to;
    const startX=starts?a.getStemX():a.getStave().getX()+4,endX=ends?b.getStemX():b.getStave().getX()+b.getStave().getWidth()-4;
    // Leave visible air between a below-note slur and the rhythm stems.
    const inset=Math.min(5,Math.max(0,(endX-startX)/6));
    const x1=startX+(starts?inset:0),x2=endX-(ends?inset:0);
    const ys=local.flatMap(n=>(mode==='tab'?n.tab:n.note).getYs());
    const y=span.below?Math.max(...ys)+10:Math.min(...ys)-13;
    const rise=Math.min(36,Math.max(12,(x2-x1)*.24)),path=document.createElementNS(ns,'path');
    const curveY=y+(span.below?rise:-rise);
    for(const [key,value] of Object.entries({d:`M ${x1} ${y} C ${x1+(x2-x1)/3} ${curveY} ${x2-(x2-x1)/3} ${curveY} ${x2} ${y}`,class:`vf-fretiva-${mode}-view etudeSlur`,fill:'none',stroke:'#111','stroke-width':1.3,'vector-effect':'non-scaling-stroke','pointer-events':'none','data-slur-from':span.from,'data-slur-to':span.to,'data-slur-position':span.below?'below':'above'}))path.setAttribute(key,String(value));
    svg.append(path);
   }
  }
 }
}
