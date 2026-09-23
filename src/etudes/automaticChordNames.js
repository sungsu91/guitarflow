import {chordNameCandidates} from './scoreChordDiagram.js';
import {isFretted} from './scoreInstruments.js';

export function measureChordName(document,measure){
 const frets=Array(document.tuning.length).fill(null);
 // Arpeggios build one grip over the measure; the latest fret on a string wins.
 for(const event of measure.events){
  if(event.rest||event.blank||event.dead)continue;
  for(const note of event.notes)if(!note.dead&&Number.isInteger(note.fret)&&note.string>=1&&note.string<=frets.length)frets[frets.length-note.string]=note.fret;
 }
 return chordNameCandidates(document,frets,{inferOpen:frets.map(()=>false)})[0]??null;
}
export function refreshAutomaticChordNames(document){
 if(!isFretted(document.instrument))return document;
 let changed=false;
 const measures=document.measures.map(m=>{
  if(m.chordNameMode!=='auto')return m;
  const harmony=measureChordName(document,m);
  if(m.harmony===harmony&&!m.chord)return m;
  changed=true;return {...m,chord:null,harmony};
 });
 return changed?{...document,measures}:document;
}
