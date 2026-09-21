import {drawScoreNavigation,alignNavigationEndings} from './drawScoreNavigation.js';
import {Renderer,Stave,StaveNote,GhostNote,Voice,Formatter,Accidental,Dot,Tuplet,Beam,StaveConnector,StaveTie,Barline} from 'vexflow';
import {drumForMidi} from './scoreInstruments.js';
import {tupletGroups} from './scoreModel.js';
import {measureMeters} from './scoreMeters.js';
import {overrideBeamGroups} from './beamOverrides.js';
const ns='http://www.w3.org/2000/svg';
function rect(svg,attrs){const node=document.createElementNS(ns,'rect');Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,String(v)));svg.append(node);return node;}
export function keyboardSpacing(etude,{placements,width}){
 const sizes=etude.measures.map(m=>Math.max(220,(etude.instrument==='drums'?100+m.length*24:120+m.length*44)));
 const rows=placements.map(p=>p.row),rowWidth=Math.max(width,...[...new Set(rows)].map(r=>sizes.reduce((sum,n,i)=>sum+(rows[i]===r?n:0),0)));
 return {width:rowWidth,measures:placements.map((p,i)=>{const count=Math.max(...rows.map(r=>rows.filter(v=>v===r).length)),column=rows.slice(0,i).filter(r=>r===p.row).length,w=rowWidth/count;return {x:column*w,width:w,cellX:column*w,cellWidth:w,rowWidth,inset:0,tickScale:1};})};
}
// Independent hand voices share VexFlow tick contexts and a single onset clock.
export function drawKeyboardScore(element,score,{mobile=false,editor=false,editorWidth=980,barOffset=0,systemStart=true,systemEnd=true,measuresPerRow=1}={}){
 const drums=score.instrument==='drums';
 const pitches=score.measures.flat().filter(e=>!e.rest).flatMap(e=>e.tones??[e]);
 const step=(t,left)=>t.pitch.octave*7+'CDEFGAB'.indexOf(t.pitch.letter)-(left?18:30);
 const right=pitches.filter(t=>(t.hand??(t.midi<60?'left':'right'))==='right'),left=pitches.filter(t=>(t.hand??(t.midi<60?'left':'right'))==='left');
 const above=drums?0:Math.max(0,...right.map(t=>(step(t,false)-12)*5)),between=drums?0:Math.max(0,...right.map(t=>(-4-step(t,false))*5))+Math.max(0,...left.map(t=>(step(t,true)-12)*5)),below=drums?0:Math.max(0,...left.map(t=>(-4-step(t,true))*5));
 const rowHeight=(drums?200:mobile?245:310)+above+between+below,perRow=editor?1:(measuresPerRow||score.document?.viewSettings?.measuresPerRow||1),width=Math.max(editorWidth,220*perRow),height=Math.ceil(score.measures.length/perRow)*rowHeight;
 element.replaceChildren();const renderer=new Renderer(element,Renderer.Backends.SVG);renderer.resize(width,height);const context=renderer.getContext(),svg=element.querySelector('svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.width='100%';svg.style.height='auto';svg.dataset.notationView='staff';svg.dataset.playbackTop='30';svg.setAttribute('role','img');svg.dataset.playbackBottom=String(rowHeight-25);
 const meters=measureMeters(score),previous=[null,null];
 score.measures.forEach((events,b)=>{
  const first=editor?systemStart:b%perRow===0,last=editor?systemEnd:b%perRow===perRow-1||b===score.measures.length-1;
  const leftInset=first?12:0,rightInset=last?12:0;
  const x=b%perRow*width/perRow+leftInset,y=Math.floor(b/perRow)*rowHeight+35+above,w=width/perRow-leftInset-rightInset,meter=meters[b],mark=score.document?.measures[b]??score.repeatMarks?.[b]??{};
  const staves=(drums?['percussion']:['treble','bass']).map((clef,hand)=>{
   const stave=new Stave(x,y+hand*((mobile?90:125)+between),w);if(first){stave.addClef(clef);if(!drums)stave.addKeySignature(score.keySignature);}if(b+barOffset===0)stave.addTimeSignature(meter.join('/'));
   if(!first)stave.setBegBarType(Barline.type.NONE);
   if(editor&&!systemEnd)stave.setEndBarType(Barline.type.NONE);
   if(mark.repeatStart)stave.setBegBarType(Barline.type.REPEAT_BEGIN);if(mark.repeatEnd)stave.setEndBarType(Barline.type.REPEAT_END);else if(mark.endBarline==='final')stave.setEndBarType(Barline.type.END);return stave;
  });
  const start=Math.max(...staves.map(s=>s.getNoteStartX()));staves.forEach(s=>s.setNoteStartX(start).setContext(context).draw());
  if(!drums)new StaveConnector(staves[0],staves[1]).setType(StaveConnector.type.BRACE).setContext(context).draw();
  if(editor&&!systemEnd&&!mark.repeatEnd){staves.forEach(stave=>{const line=document.createElementNS(ns,'line');Object.entries({x1:x+w-1.5,x2:x+w-1.5,y1:stave.getYForLine(0),y2:stave.getYForLine(4),stroke:'#171717','stroke-width':1,'vector-effect':'non-scaling-stroke',class:'etudeMeasureBoundary','pointer-events':'none'}).forEach(([k,v])=>line.setAttribute(k,String(v)));svg.append(line);});}
  const number=document.createElementNS(ns,'text');number.textContent=String(b+barOffset+1);Object.entries({x,y:staves[0].getYForLine(0)-13,'text-anchor':'middle',class:'etudeMeasureNumber',fill:'#171717',stroke:'none','font-family':'Arial','font-size':12}).forEach(([k,v])=>number.setAttribute(k,String(v)));svg.append(number);svg.style.overflow='visible';
  const groups=(drums?[staves[0],staves[0]]:staves).map((stave,hand)=>{
   let restEnd=-1;
   const indices=events.flatMap((e,i)=>{if(drums&&hand===1){if(e.onset<restEnd)return [];if(e.lowerRest)restEnd=e.onset+480;return [i];}return drums||!e.voice||e.voice===(hand?'left':'right')?[i]:[];});
   const voiceEvents=indices.map(i=>drums&&hand===1&&events[i].lowerRest?{...events[i],duration:'4',dotted:false,tuplet:null,rest:true,tones:[]}:events[i]);
   const tones=voiceEvents.map(e=>e.rest?[]:(e.tones??[e]).filter(t=>drums?([35,36,44].includes(t.midi)===(hand===1)):((t.hand??(t.midi<60?'left':'right'))===(hand?'left':'right'))));
   const notes=voiceEvents.map((e,i)=>{const rest=!tones[i].length;if(drums&&rest&&!(hand===1&&e.lowerRest)&&(hand===1||!e.rest)){const ghost=new GhostNote({duration:e.duration+(e.dotted?'d':'')});ghost.getStemDirection=()=>hand?-1:1;ghost.getStemExtents=()=>({topY:stave.getYForLine(2),baseY:stave.getYForLine(2)});return ghost;}const n=new StaveNote({clef:drums?'percussion':hand?'bass':'treble',keys:rest?[drums&&hand?'f/4':hand?'d/3':'b/4']:tones[i].map(t=>drums?drumForMidi(t.midi).key:t.pitch.key),duration:e.duration+(e.dotted?'d':'')+(rest?'r':''),auto_stem:!drums,...(drums?{stem_direction:hand?-1:1}:{})});if(e.dotted)Dot.buildAndAttach([n],{all:true});return n;});
   const tuplets=tupletGroups(voiceEvents).map(g=>new Tuplet(g.map(i=>notes[i]),{num_notes:3,notes_occupied:2,bracketed:true,...(drums?{location:hand?Tuplet.LOCATION_BOTTOM:Tuplet.LOCATION_TOP}:{})}));
   const voice=new Voice({num_beats:meter[0],beat_value:meter[1]}).setMode(Voice.Mode.SOFT).addTickables(notes);if(!drums)Accidental.applyAccidentals([voice],score.keySignature);
   let beams=Beam.generateBeams(notes,{groups:Beam.getDefaultBeamGroups(meter.join('/')),...(drums?{stem_direction:hand?-1:1}:{})});if(voiceEvents.some(e=>e.beamBefore)){const automatic=beams.map(b=>b.getNotes().map(n=>notes.indexOf(n)));notes.forEach(n=>n.setBeam(undefined));beams=overrideBeamGroups(voiceEvents.map((e,i)=>notes[i] instanceof GhostNote?{...e,rest:true}:e),automatic).filter(g=>g.length>1).map(g=>new Beam(g.map(i=>notes[i]),true));}
   return {notes,tones,voice,tuplets,beams,stave,indices,voiceEvents};
  });
  const formatter=new Formatter();groups.forEach(g=>formatter.joinVoices([g.voice]));formatter.format(groups.map(g=>g.voice),Math.max(70,x+w-start-22));
  groups.forEach(({voice,stave,notes,tones,tuplets,beams,indices,voiceEvents},hand)=>{
   voice.draw(context,stave);beams.forEach(b=>b.setContext(context).draw());tuplets.filter(t=>t.getNotes().some(n=>!(n instanceof GhostNote))).forEach(t=>t.setContext(context).draw());
   voiceEvents.forEach((e,i)=>{const incomingTie=typeof score.incomingTie==='string'?score.incomingTie.split('|').includes(e.id):score.incomingTie;
    const prior=i?{event:voiceEvents[i-1],note:notes[i-1],tones:tones[i-1],key:b+':'+indices[i-1]}:previous[hand];
    const tieGroup=context.openGroup('scoreTieConnection');tieGroup.dataset.rhythmEvents=[prior?.event.tieTo===e.id?prior.key:null,e.tieTo?b+':'+indices[i]:null].filter(Boolean).join(' ');
    if(prior?.event.tieTo===e.id&&tones[i].length&&prior.tones.length===tones[i].length){const indices=tones[i].map((_,j)=>j);new StaveTie({first_note:i?prior.note:undefined,last_note:notes[i],first_indices:indices,last_indices:indices}).setContext(context).draw();}
    if(!drums&&tones[i].length&&((i===0&&incomingTie)||(i===voiceEvents.length-1&&e.tieTo))){const indices=tones[i].map((_,j)=>j);if(i===0&&incomingTie)new StaveTie({last_note:notes[i],first_indices:indices,last_indices:indices}).setContext(context).draw();if(i===voiceEvents.length-1&&e.tieTo)new StaveTie({first_note:notes[i],first_indices:indices,last_indices:indices}).setContext(context).draw();}
    context.closeGroup();
    if(drums&&notes[i] instanceof GhostNote)return;
    // An ordinary X means closed hi-hat; mark only an open hit, next to its head.
    if(drums)tones[i].forEach((t,j)=>{if(t.midi!==46)return;const ring=document.createElementNS(ns,'circle');Object.entries({cx:notes[i].getAbsoluteX()+5,cy:notes[i].getYs()[j]-12,r:3,fill:'none',stroke:'#000','stroke-width':1.2,'data-drum-open':46,'pointer-events':'none'}).forEach(([k,v])=>ring.setAttribute(k,String(v)));svg.append(ring);});
    const cx=notes[i].getAbsoluteX(),cy=stave.getYForLine(2),base={'data-event':indices[i],'data-mode':'staff','data-staff-bottom':stave.getYForLine(4),'data-cursor-x':cx-12,'data-input-center-x':cx+notes[i].getGlyphWidth()/2,'data-cursor-y':cy-7,'data-hand':hand?'left':'right','data-lower-rest':Boolean(drums&&hand===1&&e.lowerRest&&!tones[i].length),class:'etudeEditorHit',fill:'transparent'};
    if(editor){rect(svg,{...base,x:cx-8,y:stave.getYForLine(0)-20,width:Math.max(20,(notes[i+1]?.getAbsoluteX()??x+w)-cx-8),height:90,'data-midi':drums?38:hand?48:60});tones[i].forEach((t,j)=>rect(svg,{...base,class:'etudeEditorHit etudeNoteHandle',x:cx-7,y:notes[i].getYs()[j]-8,width:22,height:16,'data-midi':t.midi,'data-tone-id':t.id,'data-string':t.midi+1,'data-cursor-y':notes[i].getYs()[j]-7}));}
   });previous[hand]={key:b+':'+indices.at(-1),event:voiceEvents.at(-1),note:notes.at(-1),tones:tones.at(-1)};
  });
  const obstacles=groups[0].notes.filter(n=>n.getBoundingBox()).map(n=>{const box=n.getBoundingBox();return {x:box.getX(),y:box.getY()-5,width:box.getW(),height:box.getH()+10};});
  drawScoreNavigation(context,svg,{mark,previous:score.navigationPrevious??score.document?.measures[b-1],next:score.navigationNext??score.document?.measures[b+1],x,width:w,top:staves[0].getYForLine(0),first:systemStart,last:true,index:b+barOffset,row:Math.floor(b/perRow)+1,obstacles});
  const points=[...new Map(groups.flatMap(g=>g.voiceEvents.map((e,i)=>[e.onset,{tick:e.onset,x:g.notes[i].getAbsoluteX()}]))).values()].sort((a,b)=>a.tick-b.tick);points.push({tick:meter[0]*1920/meter[1],x:x+w});
  const geometry=document.createElementNS(ns,'g');svg.append(geometry);Object.assign(geometry.dataset,{playbackBar:String(b),row:String(Math.floor(b/perRow)+1),rowTop:String(Math.floor(b/perRow)*rowHeight),rowBottom:String((Math.floor(b/perRow)+1)*rowHeight),measure:String(b+barOffset),top:String(y),bottom:String((Math.floor(b/perRow)+1)*rowHeight-15),points:JSON.stringify(points)});
 });
 alignNavigationEndings([...svg.querySelectorAll('[data-ending-bar]')].map(node=>({index:Number(node.dataset.endingBar),row:Number(node.dataset.endingRow),number:Number(node.dataset.endingNumber),node})));
 svg.setAttribute('aria-label',drums?'드럼 타악기 보표':'피아노 양손 큰보표');return svg;
}


