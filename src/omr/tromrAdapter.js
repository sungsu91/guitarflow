import {createBlankDocument, newId, fingeringCandidates, compileDocumentV2} from '../etudes/scoreModel.js';

// Strict prototype boundary: unsupported tokens remain visible, never rounded,
// discarded, guessed as rests, or silently coerced into the editor's rhythm model.
const durations = {whole:'1', half:'2', quarter:'4', eighth:'8', sixteenth:'16'};
const natural = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
export function parseTromr(text) {
  const result = {raw:text, measures:[], unsupported:[], meter:null, clef:null, key:null};
  let events=[];
  for (const [index,token] of String(text).split('+').entries()) {
    if (token==='clef-G2' && !result.clef) {result.clef=token;continue;}
    if (token==='keySignature-CM' && !result.key) {result.key='C';continue;}
    const meter=token.match(/^timeSignature-([2346])\/([48])$/);
    if(meter&&!result.meter) {result.meter=meter.slice(1).map(Number);continue;}
    if(token==='barline') {if(events.length){result.measures.push(events);events=[];}continue;}
    const note=token.match(/^note-([A-G])([#b]?)([0-8])_(whole|half|quarter|eighth|sixteenth)$/);
    const rest=token.match(/^rest_(whole|half|quarter|eighth|sixteenth)$/);
    if(note) events.push({token,index,duration:durations[note[4]],midi:(Number(note[3])+1)*12+natural[note[1]]+(note[2]==='#'?1:note[2]==='b'?-1:0),rest:false});
    else if(rest) events.push({token,index,duration:durations[rest[1]],rest:true});
    else result.unsupported.push({index,token});
  }
  if(events.length) result.measures.push(events);
  for(const key of ['clef','key','meter']) if(!result[key])result.unsupported.push({index:null,token:`missing:${key}`});
  if(!result.measures.length) result.unsupported.push({index:null,token:'missing:notes'});
  return result;
}

export function convertTromr(parsed,{octaveShift,positions,bpm,title,sourcePdfId,runId}) {
  if(parsed.unsupported.length)throw Error('미지원·미인식 기호가 있어 변환을 중단했습니다. 원시 결과를 확인하세요.');
  if(![0,-12].includes(octaveShift))throw Error('일반 오선보인지 기타 옥타브 기보인지 선택하세요.');
  const d=createBlankDocument();
  Object.assign(d,{title,english:title,purpose:'OMR 시험 변환 · 원본 대조 필요',bpm,meter:parsed.meter,keySignature:parsed.key,
    origin:{type:'omr-prototype',sourcePdfId,runId},omr:{reviewed:false,engine:'CrispEmbed/TrOMR Q8',octaveShift,raw:parsed.raw,sourceMap:[]}});
  d.measures=parsed.measures.map(events=>{
    const bar={id:newId('bar'),chord:null,harmony:null,events:[]};let onset=0;
    for(const e of events) {
      const event={id:newId('event'),onset,duration:e.duration,rest:e.rest,technique:null,notes:[]};
      if(!e.rest) {
        const p=positions[e.index];
        if(!p||!fingeringCandidates(e.midi+octaveShift,d.tuning).some(c=>c.string===p.string&&c.fret===p.fret))throw Error(`${e.index}번 음의 줄·프렛을 확인하세요.`);
        event.notes=[{id:newId('tone'),string:p.string,fret:p.fret,locked:true}];
      }
      d.omr.sourceMap.push({page:1,measureId:bar.id,eventId:event.id,tokenIndex:e.index,rect:null});
      bar.events.push(event);onset+=1920/Number(e.duration);
    }
    return bar;
  });
  const checked=compileDocumentV2(d);
  if(checked.errors.length)throw Error(checked.errors.join(' / '));
  // Incomplete/overfull bars remain drafts; no note is removed to repair them.
  return {document:d,issues:checked.issues};
}
