import {beatTicks} from './meter.js';
import {validateBeat,canSustain} from './rhythmMath.js';

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
   if(!n||n.muted||n.rest!==head.rest||n.ticks>remaining||(!n.rest&&remaining>n.ticks&&!n.tie))break;
   remaining-=n.ticks;
   if(remaining&&cell.length!==1)break;
   if(end!==bi)covered.push(end);
   end++;
  }
  if(remaining===0){heads.set(bi,{duration,end:end-1});covered.forEach(index=>hidden.add(index));}
 }
 return {heads,hidden};
}

// Covered beat cells are storage segments of one written note, not separately
// selected quarter notes with an apparently automatic tie.
export function editorSelection(row,index) {
 const span=[...sustainedNotation(row).heads].find(([start,n])=>index>=start&&index<=n.end);
 const start=span?.[0]??index,end=span?.[1].end??index;
 const beat=span?[{ticks:span[1].duration,rest:row[start][0].rest}]:row[start].map(({tie,sustainTicks,...n})=>({...n}));
 return {start,end,beat,tieNext:Boolean(row[end].at(-1).tie)};
}

export function editorTieState(pattern,measure,beat,value,target='score') {
 const cells=expandEditorBeat(value,pattern),row=target==='core'?(pattern.core??pattern.measures[0]):pattern.measures[measure];
 if(!cells||!row||beat+cells.length>row.length)return {enabled:false,reason:'space'};
 const last=cells.at(-1).at(-1);
 const following=target==='core'?row[beat+cells.length]:pattern.measures.flat()[measure*pattern.meter+beat+cells.length];
 const reason=last.rest?'rest':last.muted?'mute':!following?'end':following[0].rest?'next-rest':!canSustain(following[0])?'next-mute':null;
 return {enabled:!reason,reason};
}

// Remove only the internal links used to store an overwritten long note.
// Explicit ties at its end (and incoming ties from other notes) remain intact.
export function releaseSustainedNotes(row,start,count) {
 for(const [head,span] of sustainedNotation(row).heads){
  if(head>=start+count||span.end<start)continue;
  delete row[head][0].sustainTicks;
  for(let i=head;i<span.end;i++)delete row[i].at(-1).tie;
 }
}
