import {parsePianoTokens} from './pianoPolyphony.js';
import {pianoPrintedHeadPositions} from './pianoTieEvidence.js';

// A beam ending at a stem can fill the head detector's ellipse. Exclude it
// only when every strongly filled side also has a thick horizontal stroke
// extending well beyond a notehead. Thin staff/ledger lines are not evidence.
function beamIntersection(system,stem,head){
 const {staff,rect,width}=system,g=staff.spacing,cy=staff.lines.at(-1)-head.step*staff.height/8;
 if(!Number.isFinite(cy))return false;
 const main=new Uint8ClampedArray(system.rgba),extra=system.extension?new Uint8ClampedArray(system.extension):null;
 const at=(x,y)=>{
  const xx=Math.round(x-rect.x),yy=Math.round(y-rect.y);
  if(xx<0||xx>=width||yy<0)return null;
  const data=yy<system.height?main:extra,row=yy<system.height?yy:yy-system.height,i=(row*width+xx)*4;
  if(!data||i+3>=data.length)return null;
  return (data[i]*.299+data[i+1]*.587+data[i+2]*.114)<180;
 };
 let supported=0;
 for(const side of [-1,1]){
  let dark=0,total=0;
  for(let dy=-Math.floor(g*.33);dy<=g*.33;dy++)for(let dx=-Math.floor(g*.43);dx<=g*.43;dx++){
   if((dx/(g*.43))**2+(dy/(g*.33))**2>1)continue;
   const y=Math.round(cy+dy);
   if(staff.lines.some(line=>Math.abs(y-line)<=staff.thickness/2+.5))continue;
   const pixel=at(stem.x+side*g*.48+dx,y);if(pixel===null)return false;
   total++;dark+=pixel?1:0;
  }
  if(!total||dark/total<.83)continue;
  supported++;let thickRows=0;
  for(let dy=-Math.floor(g*.33);dy<=g*.33;dy++){
   const y=Math.round(cy+dy);
   if(staff.lines.some(line=>Math.abs(y-line)<=staff.thickness/2+1))continue;
   let ink=0,n=0;
   for(let dx=Math.ceil(g*.2);dx<=g*2.2;dx++){
    const pixel=at(stem.x+side*dx,y);if(pixel===null)return false;
    n++;ink+=pixel?1:0;
   }
   if(n&&ink/n>=.9)thickRows++;
  }
  if(thickRows<Math.max(3,Math.ceil(g*.22)))return false;
 }
 return supported>0;
}

// Some wide piano intervals are decoded as thirds away from the actual head.
// Repair only complete, filled chords with a one-to-one high-contrast stem/head
// match. Keep accidentals, ambiguous heads and independently held voices strict.
export function refinePianoChordHeads(reading,system,index){
 if(reading.measures.length!==1||!['clef-G2','clef-F4'].includes(reading.clef))return reading;
 const bar=reading.measures[0],sounding=bar.events.filter(e=>!e.rest);
 if(bar.pianoPolyphony||!sounding.length||bar.events.some(e=>e.unread)||sounding.some(e=>!['4','8','16','32'].includes(e.duration)||e.notes.length<2)||/note-[A-G][#bN]|note-[A-G][0-8][#bN]/.test(reading.raw))return reading;
 const stems=system.measures[index].stems.map(s=>({...s,strong:(s.heads??[]).filter(h=>h.support>=.9&&!beamIntersection(system,s,h)).sort((a,b)=>a.step-b.step)})).filter(s=>s.strong.length);
 if(stems.length!==sounding.length)return reading;
 const bottom=reading.clef==='clef-F4'?18:30,tokens=reading.raw.split('+'),changes=[];
 for(const [i,e] of sounding.entries()){
  const stem=stems[i];if(stem.strong.length!==e.notes.length)return reading;
  const notes=e.notes.map((n,j)=>({note:n,j,step:n.spelling.octave*7+'CDEFGAB'.indexOf(n.spelling.letter)-bottom})).sort((a,b)=>a.step-b.step),parts=e.raw.split('|');
  for(const [k,n] of notes.entries()){
   const head=stem.strong[k],support=stem.heads.find(h=>h.step===n.step)?.support??0;
   if(head.step===n.step)continue;
   if(Math.abs(head.step-n.step)>2||support>=.65||head.support-support<.25)return reading;
   const degree=head.step+bottom,letter='CDEFGAB'[((degree%7)+7)%7],octave=Math.floor(degree/7);
   parts[n.j]=parts[n.j].replace(/^note-[A-G][0-8]/,`note-${letter}${octave}`);
   changes.push({token:e.index,note:n.j,fromStep:n.step,toStep:head.step,support:head.support,x:stem.x});
  }
  tokens[e.index]=parts.join('|');
 }
 if(!changes.length)return reading;
 const corrected=parsePianoTokens(tokens.join('+'),bar),positions=pianoPrintedHeadPositions(system,corrected.measures[0],index,reading.clef);
 if(!positions||positions.filter(Number.isFinite).length!==sounding.length)return reading;
 return {...corrected,originalRaw:reading.originalRaw??reading.raw,headEvidence:{method:'unique-filled-chord-heads',changes}};
}
