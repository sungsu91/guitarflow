import {overrideBeamGroups} from './beamOverrides.js';
import {isBlankEvent,tupletGroups} from './scoreModel.js';
// Quarter-note ticks; compound meters group three denominator beats.
export function rhythmGroups(events,meter=[4,4]) {
 const beat=1920/meter[1]*(meter[1]===8&&meter[0]%3===0?3:1),groups=[];let group=[],bucket=-1;
 events.forEach((e,i)=>{const b=Math.floor(e.onset/beat);
  if(e.rest||Number(e.duration)<8||b!==bucket||(i>0&&e.tuplet?.groupId!==events[i-1].tuplet?.groupId)){if(group.length)groups.push(group);group=[];}
  if(!e.rest&&Number(e.duration)>=8)group.push(i);bucket=b;
 });if(group.length)groups.push(group);return events.some(e=>e.beamBefore==='join'||e.beamBefore==='break')?overrideBeamGroups(events,groups):groups;
}
export function drawTabRests(parent,events,staffNotes,y) {
 const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('class','fretiva-tab-view tabRests');parent.append(g);
 events.forEach((e,i)=>{if(!e.rest||isBlankEvent(e))return;const note=staffNotes?.[i],svg=parent.ownerSVGElement??parent,source=note?svg.querySelector(`[id="vf-${note.getAttribute('id')}"]`):null;if(!source)return;const box=source.getBBox(),rest=source.cloneNode(true);rest.removeAttribute('id');rest.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));rest.setAttribute('transform',`translate(0 ${y-(box.y+box.height/2)})`);rest.setAttribute('class','tabRhythmRest');rest.dataset.rhythmEvent=i;g.append(rest);});
 return g;
}
export function drawTabRhythm(svg,events,tabs,tab,beamGeometry,position='below',{compact=false}={}) {
 const ns='http://www.w3.org/2000/svg',g=document.createElementNS(ns,'g');g.setAttribute('class','fretiva-tab-view etudeTabRhythm');g.setAttribute('pointer-events','none');svg.append(g);
 const gap=tab.getYForLine(1)-tab.getYForLine(0),bottom=tab.getYForLine(tab.getNumLines()-1),direction=position==='above'?-1:1,edge=direction<0?tab.getYForLine(0):bottom,base=edge+direction*(gap*2+10-(compact&&direction>0?10:0));
 g.dataset.position=position;g.dataset.sixthY=bottom;g.dataset.beamY=base;g.dataset.lineGap=gap;
 const line=(x1,y1,x2,y2,width,kind,event)=>{const l=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1,y1,x2,y2,stroke:'#171717','stroke-width':width,class:kind}))l.setAttribute(k,v);if(event!==undefined)l.dataset.rhythmEvent=event;g.append(l);};
 const x=i=>tabs[i].getStemX();
 events.forEach((e,i)=>{if(e.rest)return;if(['1','2'].includes(e.duration)){const head=document.createElementNS(ns,'ellipse');for(const [k,v] of Object.entries({cx:x(i),cy:base,rx:e.duration==='1'?6:4.5,ry:3,fill:'white',stroke:'#171717','stroke-width':1.5,class:'tabRhythmLongNote','data-rhythm-event':i}))head.setAttribute(k,v);g.append(head);}if(e.duration==='1')return;const anchor=(direction<0?Math.min:Math.max)(...(e.tones??[e]).map(n=>tab.getYForLine(n.string-1)));line(x(i),anchor+direction*9,x(i),e.duration==='2'?base-direction*4:base,1.4,'tabRhythmStem',i);});
 // Reuse the staff engraver's grouping and partial-beam directions. Keep
 // segments per onset so playback can highlight each chord independently.
 const grouped=new Set();
 for(const plan of beamGeometry){
  plan.indices.forEach(i=>grouped.add(i));
  const nearest=value=>plan.xs.reduce((best,v,j)=>Math.abs(v-value)<Math.abs(plan.xs[best]-value)?j:best,0);
  const project=value=>{const j=nearest(value);return x(plan.indices[j])+value-plan.xs[j];};
  plan.levels.forEach((segments,level)=>segments.forEach(({start,end})=>{
   const full=Math.abs(plan.xs[nearest(end)]-end)<.01;
   const stops=[start,...plan.xs.filter(v=>v>start+.01&&v<end-.01),end];
   for(let j=0;j<stops.length-1;j++)line(project(stops[j]),base-direction*level*6,project(stops[j+1]),base-direction*level*6,4,full?'tabRhythmBeam':'tabRhythmFlag',plan.indices[nearest(stops[j])]);
  }));
 }
 events.forEach((e,i)=>{
  if(e.rest||Number(e.duration)<8||grouped.has(i))return;
  for(let level=0;level<(e.duration==='16'?2:1);level++)line(x(i),base-direction*level*6,x(i)+8,base-direction*(level*6+3),3,'tabRhythmFlag',i);
 });
 for(const group of tupletGroups(events)){
  if(group.every(i=>isBlankEvent(events[i])))continue;
  const first=x(group[0]),last=x(group.at(-1)),center=(first+last)/2,half=Math.max(9,Math.min(16,(last-first)/2)),left=center-half,right=center+half,y=base+direction*19;
  const label=document.createElementNS(ns,'text');for(const [k,v] of Object.entries({x:center,y:y+4,'text-anchor':'middle','font-size':14,'font-family':'Arial','font-weight':600,class:'tabRhythmTuplet'}))label.setAttribute(k,v);label.textContent='3';g.append(label);
  line(left,y,left,y-direction*4,1,'tabTupletBracket');line(left,y,center-5,y,1,'tabTupletBracket');line(center+5,y,right,y,1,'tabTupletBracket');line(right,y,right,y-direction*4,1,'tabTupletBracket');
 }
 return base;
}
