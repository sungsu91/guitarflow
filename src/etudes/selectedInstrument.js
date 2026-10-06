import {convertScoreInstrument} from './convertScoreInstrument.js';
import {arrangeBass} from './arrangement/arrangeBass.js';

// Choosing bass requests its ensemble role. Empty documents still only switch
// instruments, and percussion never becomes pitched accompaniment.
export function applySelectedInstrument(document,instrument){
 const musical=document.measures.some(m=>m.harmony||m.harmonyChanges?.length||m.chord||m.events.some(e=>e.notes.length));
 if(instrument==='bass'&&document.instrument!=='bass'&&document.instrument!=='drums'&&musical)return arrangeBass(document).document;
 return convertScoreInstrument(document,instrument);
}
