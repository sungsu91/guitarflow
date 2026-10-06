import {ticksOf} from '../scoreModel.js';
import {measureMeters,meterTicks} from '../scoreMeters.js';
import {soundingMidi} from '../scoreTuning.js';

export function arrangementSource(document,{melodyVoice='auto'}={}){
 if(!document.measures?.length)throw Error('편곡할 악보가 없습니다.');
 if(document.instrument==='drums')throw Error('타악기 악보는 기타 화음 편곡의 대상이 아닙니다.');
 const voices=[...new Set(document.measures.flatMap(m=>m.events.map(e=>e.voice).filter(Boolean)))];
 const chosen=melodyVoice==='auto'?(voices.includes('melody')?'melody':voices.includes('right')?'right':voices[0]??null):melodyVoice==='top'?null:melodyVoice;
 if(chosen&&!voices.includes(chosen))throw Error('선택한 멜로디 성부가 없습니다.');
 const meters=measureMeters(document),bars=[],melody=[],tones=[];let offset=0;
 for(const [bar,m] of document.measures.entries()){
  const capacity=meterTicks(meters[bar]);bars.push({bar,start:offset,end:offset+capacity,meter:meters[bar]});
  const sourceEvents=m.events.filter(e=>chosen?e.voice===chosen:true).sort((a,b)=>a.onset-b.onset);
  let end=0;
  for(const e of sourceEvents){
   const length=ticksOf(e);
   if(!Number.isInteger(length)||length<=0||e.onset!==end||e.onset+length>capacity)throw Error(`${bar+1}마디 멜로디의 빈 박·겹친 음·길이를 먼저 확인해 주세요.`);
   if(e.blank&&e.pdfImport||e.pdfImport?.recognizedDuration===null)throw Error(`${bar+1}마디의 미인식 음·리듬을 먼저 확인해 주세요.`);
   if(e.sustainTicks>length)throw Error(`${bar+1}마디의 겹쳐 울리는 멜로디 지속음은 아직 자동 편곡할 수 없습니다. 원본을 유지했습니다.`);
   const notes=e.rest?[]:e.notes.filter(n=>!n.dead).map(n=>({...n,midi:soundingMidi(document,n)}));
   const top=notes.sort((a,b)=>b.midi-a.midi)[0];
   melody.push({key:e.id,bar,start:offset+e.onset,end:offset+e.onset+length,midi:top?.midi,source:top?.pianoTieTo?{...e,tieTo:top.pianoTieTo}:e,note:top});end+=length;
  }
  if(end!==capacity)throw Error(`${bar+1}마디 멜로디의 박자를 먼저 채워 주세요.`);
  for(const e of m.events){
   const length=ticksOf(e);
   if(e.blank&&e.pdfImport||e.pdfImport?.recognizedDuration===null)throw Error(`${bar+1}마디의 미인식 음·리듬을 먼저 확인해 주세요.`);
   if(!Number.isInteger(length)||length<=0||e.onset<0||e.onset+length>capacity)throw Error(`${bar+1}마디 원본 리듬을 먼저 확인해 주세요.`);
   for(const [index,n] of e.notes.entries()){
    if(e.rest||n.dead)continue;
    const midi=soundingMidi(document,n);
    if(!Number.isInteger(midi)||midi<0||midi>127)throw Error(`${bar+1}마디 음높이를 먼저 확인해 주세요.`);
    tones.push({key:`${e.id}:${index}`,eventId:e.id,bar,start:offset+e.onset,end:offset+e.onset+length,midi,note:n,source:e});
   }
  }
  offset+=capacity;
 }
 const toneById=new Map(tones.map(t=>[`${t.eventId}:${t.midi}`,t]));
 for(const tone of tones)if(tone.note.pianoTieTo){
  const next=toneById.get(`${tone.note.pianoTieTo}:${tone.midi}`);
  if(!next||next.start!==tone.end||next.source.voice!==tone.source.voice)throw Error('피아노 지속음의 음높이·연결 위치를 먼저 확인해 주세요.');
 }
 // Melody ties form one reservation, including across barlines. Never shift
 // string or re-attack while that reservation is alive.
 const byId=new Map(melody.map(m=>[m.key,m]));
 for(const m of melody){
  m.chain=m.chain??m.key;
  if(m.source.tieTo){const next=byId.get(m.source.tieTo);if(!next||next.start!==m.end||next.midi!==m.midi||m.midi===undefined)throw Error('멜로디 붙임줄의 음높이·연결 위치를 먼저 확인해 주세요.');next.chain=m.chain;}
 }
 return {bars,melody,tones,totalTicks:offset,melodyVoice:chosen??'top',reviewBars:document.measures.flatMap((m,i)=>m.pdfImport?.needsReview?[i+1]:[])};
}
