import {playbackSlots} from './scorePlaybackPosition.js';
import {scoreBarOrder} from './scoreRepeats.js';
const key=s=>s.bar+':'+s.event;
const tones=e=>e.tones??[e];
const pitch=t=>t.string+':'+t.midi;
function connection(a,b){
 if(a.rest||b.rest)return null;
 const first=tones(a),last=tones(b);
 if(a.tieTo&&a.tieTo===b.id&&first.length===last.length&&first.every(t=>!t.dead&&last.some(n=>!n.dead&&pitch(t)===pitch(n))))return {kind:'tie',pitches:last.map(pitch)};
 if(!['H','P','S'].includes(a.technique))return null;
 const connected=last.filter(n=>!(n.dead??b.dead)&&first.some(t=>!(t.dead??a.dead)&&n.string===t.string&&(a.technique==='H'?n.midi>t.midi:a.technique==='P'?n.midi<t.midi:n.midi!==t.midi)));
 return connected.length?{kind:a.technique,pitches:connected.map(pitch)}:null;
}
// Written onsets/durations are authoritative. Beams and ornaments add no time.
// Visits break links at repeat jumps; simultaneous voices never accumulate time.
export function rhythmTimeline(score){
 const slots=playbackSlots(score,scoreBarOrder(score));
 const events=slots.map(s=>({...s,note:score.measures[s.bar][s.event],key:key(s),incoming:[],outgoing:[]}));
 const starts=new Map();for(const e of events){if(!starts.has(e.tick))starts.set(e.tick,[]);starts.get(e.tick).push(e);}
 for(const a of events){
  const end=a.tick+a.duration;
  for(const b of starts.get(end)??[]){
   if(Math.abs(b.tick-end)>1e-6||!(b.visit===a.visit||(b.visit===a.visit+1&&b.bar===a.bar+1)))continue;
   const link=connection(a.note,b.note);if(link){a.outgoing.push({key:b.key,...link});b.incoming.push({key:a.key,...link});}
  }
 }
 const fullyConnected=e=>tones(e.note).every(t=>e.incoming.some(c=>c.pitches.includes(pitch(t))));
 const ends=new Map();for(const e of events){const end=e.tick+e.duration;if(!ends.has(end))ends.set(end,[]);ends.get(end).push(e);}
 const activeEvents=new Set(),boundaries=[...new Set([...starts.keys(),...ends.keys()])].sort((a,b)=>a-b);
 return boundaries.map(tick=>{
  for(const e of ends.get(tick)??[])activeEvents.delete(e);
  for(const e of starts.get(tick)??[])activeEvents.add(e);
  const active=[...activeEvents];
  const marks=[...new Set(active.flatMap(e=>[e.key,...e.incoming.map(c=>c.key)]))];
  const sounding=active.filter(e=>!e.note.rest);
  const articulation=!sounding.length?'rest':sounding.every(e=>e.incoming.some(c=>c.kind==='tie'))?'tie':sounding.every(fullyConnected)?'connected':sounding.some(e=>e.incoming.length)?'mixed':'attack';
  return {tick,marks,attacks:sounding.filter(e=>!fullyConnected(e)).map(e=>e.key),notes:active.map(e=>e.key),articulation,techniques:[...new Set(active.flatMap(e=>[...e.incoming,...e.outgoing].map(c=>c.kind)))]};
 });
}
export function rhythmStateAt(states,tick){
 let low=0,high=states.length;while(low<high){const mid=(low+high)>>>1;if(states[mid].tick<=tick)low=mid+1;else high=mid;}
 return states[Math.max(0,low-1)];
}
// Cache SVG nodes once per engraving. Updating attributes never redraws notation.
export function rhythmHighlighter(svg,states){
 const nodes=[...svg.querySelectorAll('[data-rhythm-events]')].map(node=>({node,keys:node.dataset.rhythmEvents.split(' ')}));
 let previous;
 return {update(tick,enabled=true){const state=enabled?rhythmStateAt(states,tick):null;if(state===previous)return state;previous=state;const keys=new Set(state?.marks??[]),attacks=new Set(state?.attacks??[]);for(const {node,keys:events} of nodes)node.classList.toggle('rhythm-technique-active',events.some(k=>(node.dataset.rhythmRole==='picking'?attacks:keys).has(k)));svg.dataset.rhythmArticulation=state?.articulation??'';return state;},clear(){for(const {node} of nodes)node.classList.remove('rhythm-technique-active');delete svg.dataset.rhythmArticulation;}};
}
