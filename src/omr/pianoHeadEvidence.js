import {parsePianoTokens} from './pianoPolyphony.js';
import {pianoPrintedHeadPositions} from './pianoTieEvidence.js';

// Some wide piano intervals are decoded as thirds away from the actual head.
// Repair only complete, filled chords with a one-to-one high-contrast stem/head
// match. Keep accidentals, ambiguous heads and independently held voices strict.
export function refinePianoChordHeads(reading,system,index){
 if(reading.measures.length!==1||!['clef-G2','clef-F4'].includes(reading.clef))return reading;
 const bar=reading.measures[0],sounding=bar.events.filter(e=>!e.rest);
 if(bar.pianoPolyphony||!sounding.length||bar.events.some(e=>e.unread)||sounding.some(e=>!['4','8','16','32'].includes(e.duration)||e.notes.length<2)||/note-[A-G][#bN]|note-[A-G][0-8][#bN]/.test(reading.raw))return reading;
 const stems=system.measures[index].stems.map(s=>({...s,strong:(s.heads??[]).filter(h=>h.support>=.9).sort((a,b)=>a.step-b.step)})).filter(s=>s.strong.length);
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
