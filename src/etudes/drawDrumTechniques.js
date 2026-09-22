import {drumForMidi} from './scoreInstruments.js';
const ns='http://www.w3.org/2000/svg';
function add(parent,tag,attrs,text){const el=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));if(text)el.textContent=text;parent.append(el);return el;}

// Per-head decorations deliberately do not attach a roll to the shared chord stem.
// The same SVG path is used by editing, reading and printing.
export function drawDrumTechniques(svg,note,tone,index,eventKey){
 const {dynamic,ornament}=tone.drumTechnique??{};
 if(!dynamic&&!ornament&&!tone.drumArticulation)return;
 const x=note.getNoteHeadBeginX(),y=note.getYs()[index],w=note.getGlyphWidth();
 const g=add(svg,'g',{'data-drum-technique':tone.id,'data-rhythm-events':eventKey,'pointer-events':'none',fill:'#111',stroke:'#111'});
 const text=(value,tx,ty,size=13)=>add(g,'text',{x:tx,y:ty,'font-family':'Arial','font-size':size,stroke:'none'},value);
 if(dynamic==='ghost'){text('(',x-6,y+4);text(')',x+w+1,y+4);}
 if(dynamic==='accent')add(g,'path',{d:`M ${x+1} ${y-12} l 9 3 l -9 3`,fill:'none','stroke-width':1.3,'data-drum-accent':'true'});
 if(tone.drumArticulation==='rimshot')text('R',x+w+5,y+4,9);
 if(ornament==='flam'||ornament==='drag'){
  const count=ornament==='drag'?2:1;
  for(let i=0;i<count;i++){
   const gx=x-12-(count-1-i)*9,gy=y+1;
   if(drumForMidi(tone.midi)?.key.endsWith('/x'))add(g,'path',{d:`M ${gx-3} ${gy-2} l 6 4 M ${gx-3} ${gy+2} l 6 -4`,fill:'none','stroke-width':1,'data-drum-grace':i});
   else add(g,'ellipse',{cx:gx,cy:gy,rx:3,ry:2,transform:`rotate(-20 ${gx} ${gy})`,'data-drum-grace':i});
   add(g,'path',{d:`M ${gx+2.5} ${gy} v -17 q 7 3 2 9 M ${gx-1} ${gy-8} l 7 -4`,fill:'none','stroke-width':.9});
  }
 }
 if(ornament?.startsWith('roll-')||ornament==='buzz'){
  const rx=x+w+6;
  add(g,'path',{d:`M ${rx} ${y+1} v -22`,fill:'none','stroke-width':1});
  const count=ornament==='buzz'?3:Number(ornament.at(-1));
  for(let i=0;i<count;i++)add(g,'path',{d:`M ${rx-3} ${y-8-i*4} l 7 -3`,fill:'none','stroke-width':2,'data-drum-roll-slash':i});
  if(ornament==='buzz')text('z',rx+5,y-15,10);
 }
}
