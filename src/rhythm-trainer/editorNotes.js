import {beatTicks} from './meter.js';
import {validateBeat} from './rhythmMath.js';

// Long notes use the existing tied-beat timing/storage format. The first
// segment also records its written value so the score can draw one long note.
export function expandEditorBeat(beat,meter=4) {
 if(!Array.isArray(beat))return null;
 const length=beatTicks(meter);
 if(validateBeat(beat,length))return [beat.map(n=>({...n}))];
 if(beat.length!==1||![24,48].includes(beat[0]?.ticks)||typeof beat[0].rest!=='boolean'||beat[0].muted)return null;
 const original=beat[0],result=[];
 let remaining=original.ticks;
 while(remaining>0){
  const ticks=Math.min(length,remaining),n={ticks,rest:original.rest};
  remaining-=ticks;
  if(remaining&&!n.rest)n.tie=true;
  if(!result.length)n.sustainTicks=original.ticks;
  const cell=[n];
  let padding=length-ticks;
  for(const duration of [12,9,6,3])while(padding>=duration){cell.push({ticks:duration,rest:true});padding-=duration;}
  result.push(cell);
 }
 return result;
}

// Validate every segment before hiding it. Editing a covered beat immediately
// reveals ordinary notes/ties, even when reading an older saved draft.
export function sustainedNotation(measure) {
 const heads=new Map(),hidden=new Set();
 for(let bi=0;bi<measure.length;bi++){
  const head=measure[bi][0],duration=head?.sustainTicks;
  if(![24,48].includes(duration)||head.muted)continue;
  let remaining=duration,end=bi;
  const covered=[];
  while(remaining>0&&end<measure.length){
   const cell=measure[end],n=cell[0];
   if(!n||n.muted||n.rest!==head.rest||n.ticks>remaining||(!n.rest&&Boolean(n.tie)!==(remaining>n.ticks)))break;
   remaining-=n.ticks;
   if(remaining&&cell.length!==1)break;
   if(end!==bi)covered.push(end);
   end++;
  }
  if(remaining===0){heads.set(bi,{duration,end:end-1});covered.forEach(index=>hidden.add(index));}
 }
 return {heads,hidden};
}
