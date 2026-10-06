import {minimumFrettingFingers} from '../frettingFeasibility.js';

export function gripFeasible(notes,{maxSpan=4,maxFingers=4}={}){
 if(new Set(notes.map(n=>n.string)).size!==notes.length)return false;
 const stopped=notes.filter(n=>n.fret>0).map(n=>n.fret);
 return (!stopped.length||Math.max(...stopped)-Math.min(...stopped)<=maxSpan)&&minimumFrettingFingers(notes)<=maxFingers;
}
export const gripPosition=notes=>{const frets=notes.filter(n=>n.fret>0).map(n=>n.fret);return frets.length?Math.min(...frets):0;};

// The caller supplies musical priorities; this search only chooses physically
// compatible stops, with bounded alternatives for the sequence planner.
export function voicingCandidates(tones,fixed,tuning,options={}){
 const {maxFret=20,allowOctaves=true}=options;
 const ranked=[...tones].sort((a,b)=>Number(Boolean(b.required))-Number(Boolean(a.required))||b.priority-a.priority);
 let visits=0;const results=[],used=new Set(fixed.map(n=>n.string));
 const search=(at,chosen,omitted,cost)=>{
  if(++visits>18000)return;
  if(at===ranked.length){results.push({notes:chosen,omitted,cost});if(results.length>96){results.sort((a,b)=>a.cost-b.cost);results.length=48;}return;}
  const tone=ranked[at],shifts=tone.role==='melody'||!allowOctaves?[0]:[0,12,-12,24,-24];
  const choices=tone.fixed?[tone.fixed]:shifts.flatMap(shift=>tuning.flatMap((open,i)=>{
   const fret=tone.midi+shift-open;
   return fret>=0&&fret<=maxFret&&(!tone.string||tone.string===i+1)?[{string:i+1,fret,midi:tone.midi+shift,octaveShift:shift}]:[];
  })).sort((a,b)=>Math.abs(a.octaveShift??0)-Math.abs(b.octaveShift??0)||a.fret-b.fret);
  for(const choice of choices){
   if(choice.fret<0||choice.fret>maxFret)continue;
   if(used.has(choice.string))continue;
   const next={...tone,...choice};
   if(!gripFeasible([...fixed,...chosen,next],options))continue;
   if(tone.role!=='melody'&&[...fixed,...chosen].some(n=>n.role==='melody'&&next.midi>n.midi))continue;
   if(tone.role==='bass'&&[...fixed,...chosen].some(n=>n.role!=='melody'&&next.midi>n.midi))continue;
   if(tone.role!=='bass'&&tone.role!=='melody'&&[...fixed,...chosen].some(n=>n.role==='bass'&&next.midi<n.midi))continue;
   used.add(choice.string);search(at+1,[...chosen,next],omitted,cost+Math.abs(choice.octaveShift??0)*.8+choice.fret*.04);used.delete(choice.string);
  }
  if(!tone.required)search(at+1,chosen,[...omitted,tone],cost+tone.priority);
 };
 if(gripFeasible(fixed,options))search(0,[],[],0);
 return results.sort((a,b)=>a.cost-b.cost).slice(0,12);
}
