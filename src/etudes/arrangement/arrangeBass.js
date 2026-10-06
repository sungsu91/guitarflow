import {newId,compileDocumentV2} from '../scoreModel.js';
import {measureMeters,meterTicks,validScoreMeter} from '../scoreMeters.js';
import {measureChordChanges} from '../arpeggioChords.js';
import {parseChordSymbol} from '../../chords/chordSymbols.js';
import {transposeMiniChordLabel} from '../../mini-chord/capo.js';
import {scoreInstrument,validScoreTuning} from '../scoreInstruments.js';
import {tabCandidates,midiName} from '../scoreTuning.js';

export const BASS_PATTERNS=[
 {id:'quarters',label:'기본 반주 · 한 박마다 근음'},
 {id:'halves',label:'느린 반주 · 두 박마다 근음'},
 {id:'eighths',label:'8비트 반주 · 반 박마다 근음'},
 {id:'root-fifth',label:'근음 + 5음 · 한 박씩 교대'},
];
// The melody's pitches, invalid OCR durations and source octave convention
// never determine a bass accompaniment. Only reviewed chord/time positions do.
export function bassChordRows(source){
 const meters=measureMeters(source);
 return source.measures.map((m,i)=>({bar:i+1,meter:meters[i],review:Boolean(m.harmonyReview),changes:measureChordChanges(m).map(c=>({name:c.name,onset:c.onset,needsReview:Boolean(c.needsReview)}))}));
}
function pieces(start,end){
 const values=['1','2','4','8','16','32'].flatMap(duration=>[{duration,dotted:false,ticks:1920/Number(duration)},{duration,dotted:true,ticks:2880/Number(duration)}]).sort((a,b)=>b.ticks-a.ticks);
 const result=[];
 while(start<end){const v=values.find(v=>v.ticks<=end-start);if(!v)throw Error('코드 변경 박은 32분음표 단위까지 지원합니다.');result.push({...v,onset:start});start+=v.ticks;}
 return result;
}
function position(target,pc,previous){
 const low=Math.min(...target.tuning),midi=low+(pc-low%12+12)%12;
 const choices=tabCandidates(target,midi).filter(n=>n.fret<=7);
 const cost=n=>n.fret*.65+(previous?Math.abs(n.fret-previous.fret)*.2+Math.abs(n.string-previous.string)*.15:0);
 choices.sort((a,b)=>cost(a)-cost(b));
 if(!choices.length)throw Error(`${midiName(midi)}음을 0~7프렛에 놓을 수 없습니다. 베이스 튜닝을 확인해 주세요.`);
 return {...choices[0],midi};
}
export function arrangeBass(source,{pattern='quarters',rows=bassChordRows(source)}={}){
 if(source.instrument==='drums')throw Error('코드가 있는 악보에서 베이스 편곡을 시작해 주세요.');
 if(!BASS_PATTERNS.some(p=>p.id===pattern))throw Error('베이스 반주 패턴을 선택해 주세요.');
 if(rows.length!==source.measures.length)throw Error('원본과 코드 마디 수가 다릅니다.');
 const target={instrument:'bass',tuning:[...(source.instrument==='bass'?source.tuning:scoreInstrument('bass').tuning)],capo:0};
 if(!validScoreTuning('bass',target.tuning))throw Error('베이스 튜닝을 확인해 주세요.');
 const meters=measureMeters(source),capo=source.capo??0,problems=[],audit=[];let active=null,previous=null;
 const measures=source.measures.map((m,i)=>{
  const row=rows[i],meter=meters[i],capacity=meterTicks(meter);
  if(!validScoreMeter(meter))throw Error(`${i+1}마디의 박자표를 확인해 주세요.`);
  if(row.review)problems.push(`${i+1}마디: 읽지 못한 코드가 있습니다. 코드와 변경 박을 확인해 주세요.`);
  const changes=row.changes.map(c=>({...c,onset:Number(c.onset)})).sort((a,b)=>a.onset-b.onset);
  if(changes.some((c,j)=>!Number.isInteger(c.onset)||c.onset<0||c.onset>=capacity||c.onset%60||j>0&&changes[j-1].onset===c.onset))problems.push(`${i+1}마디: 코드 변경 박이 겹치거나 마디를 벗어났습니다.`);
  if(changes.some(c=>c.needsReview))problems.push(`${i+1}마디: 코드 변경 위치를 확인해 주세요.`);
  const concertChanges=changes.map(c=>({...c,name:transposeMiniChordLabel(c.name,capo)}));
  const anchors=concertChanges[0]?.onset===0?concertChanges:[{onset:0,name:active},...concertChanges];
  const compound=meter[1]===8&&meter[0]%3===0,beat=compound?720:1920/meter[1];
  const step=pattern==='halves'?beat*2:pattern==='eighths'?240:beat;
  const boundaries=[...new Set([0,capacity,...anchors.map(c=>c.onset),...Array.from({length:Math.ceil(capacity/step)},(_,n)=>n*step)])].filter(t=>t>=0&&t<=capacity).sort((a,b)=>a-b);
  const events=[];
  for(let j=0;j<boundaries.length-1;j++){
   const start=boundaries[j],end=boundaries[j+1],change=anchors.findLast(c=>c.onset<=start),symbol=parseChordSymbol(change?.name);
   if(!symbol){problems.push(`${i+1}마디: ${change?.name||'코드 없음'} · 코드명을 입력해 주세요.`);continue;}
   let pos=null;
   if(!symbol.silent){
    const fifth=symbol.intervals.find(n=>[6,7,8].includes(n));
    // Inversions keep their named bass; a diminished/augmented fifth is never
    // replaced by an unrelated perfect fifth.
    const useFifth=pattern==='root-fifth'&&symbol.bassPc===symbol.pc&&fifth!==undefined&&start>change.onset&&Math.floor((start-change.onset)/beat)%2===1;
    pos=position(target,useFifth?(symbol.pc+fifth)%12:symbol.bassPc,previous);previous=pos;
   }
   const created=pieces(start,end).map(p=>({id:newId('event'),onset:p.onset,duration:p.duration,...(p.dotted?{dotted:true}:{}),rest:!pos,blank:false,technique:null,dampAtEnd:true,velocity:start%beat===0?.88:.74,notes:pos?[{id:newId('tone'),...pos,locked:true}]:[]}));
   if(pos)for(let k=0;k<created.length-1;k++)created[k].tieTo=created[k+1].id;
   events.push(...created);audit.push({bar:i+1,onset:start,chord:symbol.name,midi:pos?.midi??null,string:pos?.string??null,fret:pos?.fret??null});
  }
  if(concertChanges.length)active=concertChanges.at(-1).name;
  const {events:oldEvents,pdfImport,chord,sketchVoicings,harmony,harmonyChanges,harmonyReview,annotationOffsets,lyrics,...metadata}=m;
  return {...metadata,id:newId('bar'),chord:null,harmony:anchors[0]?.name??null,harmonyChanges:anchors.map(c=>({onset:c.onset,name:c.name})),chordNameMode:'manual',events};
 });
 if(problems.length)throw Error([...new Set(problems)].slice(0,12).join('\n'));
 const snapshot=structuredClone(source);delete snapshot.bassArrangement;
 const {pdfTabImport,guitarArrangement,bassArrangement,...base}=source;
 const reviewBars=source.measures.flatMap((m,i)=>m.pdfImport?.needsReview?[i+1]:[]);
 const document={...base,...target,id:newId('score'),kind:'user',origin:null,title:`${source.title.replace(/ · 베이스 반주$/,'')} · 베이스 반주`,purpose:'코드 진행으로 만든 합주 연습용 베이스 반주 · 원곡 베이스 채보 아님',viewSettings:{...source.viewSettings,notationView:'both',systemBreaks:[],sourceLayout:false},measures,bassArrangement:{version:1,pattern,chordRows:structuredClone(rows),sourceDocument:snapshot,sourceReviewBars:reviewBars,audit}};
 if(capo){const key=transposeMiniChordLabel(source.keySignature??'C',capo);document.keySignature=({ 'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb','D#m':'Ebm','A#m':'Bbm' })[key]??key;}
 const compiled=compileDocumentV2(document);
 if(compiled.errors.length||compiled.issues.length)throw Error(`베이스 악보 검증 실패: ${[...compiled.errors,...compiled.issues].slice(0,2).join(' / ')}`);
 const notes=measures.flatMap(m=>m.events.flatMap(e=>e.notes));
 return {document,report:{bars:measures.length,notes:notes.length,range:notes.length?[Math.min(...notes.map(n=>n.midi)),Math.max(...notes.map(n=>n.midi))]:null,maxFret:Math.max(0,...notes.map(n=>n.fret)),sourceReviewBars:reviewBars,audit}};
}
