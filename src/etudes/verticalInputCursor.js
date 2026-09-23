import {pitchForMidi} from './scoreModel.js';
import {DRUMS,scoreInstrument} from './scoreInstruments.js';
const staffStep=drum=>{const [letter,octave]=drum.key.split('/');return Number(octave)*7+'cdefgab'.indexOf(letter);};
const lanes=[...DRUMS].sort((a,b)=>staffStep(a)-staffStep(b)||a.midi-b.midi);
// Cursor movement never rewrites the notes or the rhythm at that position.
export function verticalInputCursor(document,cursor,direction){
 const notes=document.measures[cursor.bar]?.events[cursor.event]?.notes??[];
 const selected=notes.find(n=>n.id===cursor.noteId);
 let midi=cursor.midi??selected?.midi??(document.instrument==='drums'?38:60);
 if(document.instrument==='drums'){
  const index=lanes.findIndex(d=>d.midi===midi);
  const start=index<0?lanes.findIndex(d=>d.midi===38):index;
  const step=staffStep(lanes[start]);
  const candidates=direction>0?lanes.filter(d=>staffStep(d)>step):lanes.filter(d=>staffStep(d)<step).reverse();
  const next=candidates[0];
  if(next){const sameLane=lanes.filter(d=>staffStep(d)===staffStep(next));midi=(sameLane.find(d=>notes.some(n=>n.midi===d.midi))??next).midi;}else midi=lanes[start].midi;
 }else{
  const profile=scoreInstrument(document.instrument),min=profile.minMidi??0,max=profile.maxMidi??127;
  const step=value=>{const p=pitchForMidi(value,document.keySignature??'C');return p.octave*7+'CDEFGAB'.indexOf(p.letter);};
  const original=step(midi);let next=Math.max(min,Math.min(max,midi+direction));
  while(next>min&&next<max&&step(next)===original)next+=direction;
  midi=next;
 }
 return {...cursor,midi,noteId:notes.find(n=>n.midi===midi)?.id,lowerRest:false,target:undefined,mode:'staff'};
}
