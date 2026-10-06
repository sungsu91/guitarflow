import {newId,compileDocumentV2} from '../scoreModel.js';
import {shapeForChordName,measureChordChanges} from '../arpeggioChords.js';
import {parseChordSymbol} from '../../chords/chordSymbols.js';
import {arrangementSource} from './source.js';
import {voicingCandidates,gripFeasible,gripPosition} from './voicing.js';
import {FINGERSTYLE_TEMPLATES} from './templates.js';

const pc=n=>((n%12)+12)%12;
const defaults={mode:'voicing',template:'bass-3-12-3',melodyVoice:'auto',maxSpan:4,maxFingers:4,maxFret:20,maxShift:7,allowOctaves:true};
function harmonyTimeline(document,source){
 let previous=null;
 return source.bars.map(b=>{
  const m=document.measures[b.bar];
  if(m.harmonyReview)previous=null;
  const changes=measureChordChanges(m).map(c=>({...c,at:b.start+c.onset,...(m.harmonyReview?{needsReview:true}:{})}));
  const result=changes[0]?.onset===0?changes:previous?[{...previous,at:b.start,onset:0,inherited:true},...changes]:changes;
  if(changes.length)previous=changes.at(-1);
  return result;
 });
}
function sourceAttacks(source){
 const pending=new Map(),result=[];
 for(const tone of source.tones){
  const key=`${tone.eventId}:${tone.midi}`,prior=pending.get(key);pending.delete(key);
  const tieTo=tone.source.tieTo??tone.note.pianoTieTo;
  if(prior&&prior.end===tone.start){prior.end=tone.end;if(tieTo)pending.set(`${tieTo}:${tone.midi}`,prior);continue;}
  const copy={...tone};result.push(copy);if(tieTo)pending.set(`${tieTo}:${tone.midi}`,copy);
 }
 return result;
}
function priorityTones(tones,symbol){
 if(!tones.length)return [];
 const low=Math.min(...tones.map(n=>n.midi)),root=symbol?.pc??pc(low),seen=new Set();
 return [...tones].sort((a,b)=>a.midi-b.midi).map(tone=>{
  const degree=pc(tone.midi-root),duplicate=seen.has(pc(tone.midi));seen.add(pc(tone.midi));
  return {...tone,role:tone.midi===low?'bass':'harmony',priority:tone.midi===low?900:duplicate?4:[3,4,10,11].includes(degree)?120:degree===7?12:degree===0?20:60};
 });
}
function buildFrames(document,source,target,options){
 const harmony=harmonyTimeline(document,source),actions=new Map(),attacks=sourceAttacks(source);
 const add=(at,value)=>actions.set(at,value);
 if(options.mode==='voicing'){
  for(const t of attacks){
   const m=source.melody.find(m=>m.start===t.start&&m.midi===t.midi&&m.source.id===t.eventId);
   if(m)continue;
   if(!actions.has(t.start))add(t.start,{tones:[],bar:t.bar});actions.get(t.start).tones.push(t);
  }
  for(const [at,action] of actions){
   const symbol=parseChordSymbol(harmony[action.bar].filter(c=>c.at<=at).at(-1)?.name);
   action.tones=priorityTones(action.tones,symbol);
  }
 }else if(options.mode==='fingerstyle'){
  const template=FINGERSTYLE_TEMPLATES.find(p=>p.id===options.template);if(!template)throw Error('반주 템플릿을 선택해 주세요.');
  for(const b of source.bars){
   if(!template.meters.includes(b.meter.join('/')))throw Error(`${b.bar+1}마디 박자와 반주 템플릿이 맞지 않습니다.`);
   const changes=harmony[b.bar];
   if(changes[0]?.at!==b.start||changes.some((c,i)=>c.needsReview||!Number.isInteger(c.onset)||c.onset<0||c.at>=b.end||i>0&&c.onset<=changes[i-1].onset))throw Error(`${b.bar+1}마디 코드명과 코드가 바뀌는 박을 먼저 확인해 주세요.`);
   for(let cycle=b.start;cycle<b.end;cycle+=template.cycle)for(const step of template.steps){
    const at=cycle+step.at;if(at>=b.end)continue;
    const change=changes.filter(c=>c.at<=at).at(-1),shape=shapeForChordName(target,change.name);
    if(!shape)throw Error(`${b.bar+1}마디 ${change.name} 코드의 운지를 확인해 주세요.`);
    const strings=shape.silent?[]:shape.frets.flatMap((f,i)=>Number.isInteger(f)?[6-i]:[]);
    const bass=[...strings].sort((a,b)=>(target.tuning[a-1]+shape.frets[6-a])-(target.tuning[b-1]+shape.frets[6-b]))[0];
    const requested=step.strings.map(s=>s==='bass'?bass:s).filter(s=>strings.includes(s));
    const missing=shape.silent?[]:step.strings.filter(s=>s!=='bass'&&!strings.includes(s)).map(string=>({key:`pattern:${at}:${string}`,string,role:'pattern',reason:'unavailable-pattern-string'}));
    const nextStep=template.steps.find(s=>s.at>step.at)?.at??template.cycle;
    const end=Math.min(b.end,cycle+nextStep,changes.find(c=>c.at>at)?.at??Infinity);
    add(at,{bar:b.bar,dead:step.dead,missing,tones:requested.map(string=>({key:`pattern:${at}:${string}`,midi:target.tuning[string-1]+shape.frets[6-string],string,start:at,end,role:string===bass?'bass':'pattern',priority:string===bass?900:40,dead:!!step.dead,fixed:{string,fret:step.dead?0:shape.frets[6-string],midi:target.tuning[string-1]+(step.dead?0:shape.frets[6-string])}}))});
   }
  }
 }else throw Error('편곡 방식을 확인해 주세요.');
 const times=[...new Set([...actions.keys(),...source.melody.flatMap(m=>[m.start,m.end]),...source.bars.map(b=>b.start)])].filter(t=>t<source.totalTicks).sort((a,b)=>a-b);
 return times.map(at=>({at,bar:source.bars.find(b=>at>=b.start&&at<b.end),melody:source.melody.find(m=>m.start<=at&&m.end>at),action:actions.get(at)}));
}

// Beam search keeps alternative melody fingerings until the following changes
// are known. Held melody notes remain fixed; accompaniment can be cut or omitted.
function chooseSequence(frames,target,options){
 let states=[{cost:0,melody:null,held:null,position:null,path:[]}];
 for(const f of frames){
  const next=[];
  for(const state of states){
   const oldMelody=state.melody?.chain===f.melody?.chain?state.melody:null;
   const melody=f.melody?.midi!==undefined?{key:f.melody.chain,chain:f.melody.chain,midi:f.melody.midi,role:'melody',required:true,priority:10000,...(oldMelody?{fixed:oldMelody}: {})}:null;
   const held=state.held?.end>f.at&&state.held.bar===f.bar.bar?state.held:null;
   // A new accompaniment attack ends the preceding written group. The report
   // records any shortened sustain instead of pretending to preserve it.
   const retain=!f.action?.tones.length&&held;
   const variants=retain?[...(!held.notes.some(n=>!n.dead&&n.midi===melody?.midi)?[{fixed:held.notes,cut:false}]:[]),{fixed:[],cut:true}]:[{fixed:[],cut:Boolean(held)}];
   for(const variant of variants){
    const tones=(f.action?.tones??[]).filter(t=>t.dead||t.midi!==melody?.midi);
    for(const choice of voicingCandidates([...(melody?[melody]:[]),...tones],variant.fixed,target.tuning,options)){
     const mel=choice.notes.find(n=>n.role==='melody')??null,accompaniment=choice.notes.filter(n=>n.role!=='melody');
     const grip=[...variant.fixed,...choice.notes],position=gripPosition(grip);
     const jump=state.position===null||!grip.some(n=>n.fret>0)?0:Math.abs(position-state.position);
     if(jump>options.maxShift)continue;
     const end=accompaniment.length?Math.min(f.bar.end,...accompaniment.map(n=>n.end)):0;
     const group=accompaniment.length?{id:f.at,bar:f.bar.bar,start:f.at,end,notes:accompaniment}:null;
     const droppedSamePitch=(f.action?.tones??[]).filter(t=>!t.dead&&t.midi===melody?.midi);
     const cost=state.cost+choice.cost+jump*1.8+(variant.cut&&retain?250:0);
     next.push({cost,melody:mel?{...mel,chain:f.melody.chain}:null,held:group??(retain&&!variant.cut?held:null),position:grip.some(n=>n.fret>0)?position:state.position,path:[...state.path,{at:f.at,bar:f.bar.bar,melody:mel,chain:f.melody?.chain,group,cutGroup:variant.cut?held?.id:null,omitted:[...choice.omitted,...droppedSamePitch,...(f.action?.missing??[])],grip,jump}]});
    }
   }
  }
  if(!next.length)throw Error(`${f.bar.bar+1}마디 ${((f.at-f.bar.start)/480+1).toFixed(2)}박: 멜로디를 유지하는 운지를 찾지 못했습니다. 프렛 범위·손 벌림·이동 제한을 조정해 주세요.`);
  const unique=new Map();for(const n of next.sort((a,b)=>a.cost-b.cost)){const key=JSON.stringify([n.melody?.string,n.melody?.fret,n.held?.notes.map(p=>[p.string,p.fret]),n.position]);if(!unique.has(key))unique.set(key,n);if(unique.size>=8)break;}
  states=[...unique.values()];
 }
 return states.sort((a,b)=>a.cost-b.cost)[0].path;
}
function rhythmPieces(start,end){
 const result=[];let at=start;
 const values=['1','2','4','8','16','32'].flatMap(duration=>[{duration,dotted:true,ticks:1920/Number(duration)*1.5},{duration,dotted:false,ticks:1920/Number(duration)}]).sort((a,b)=>b.ticks-a.ticks);
 while(at<end){const value=values.find(v=>v.ticks<=end-at);if(!value||!Number.isInteger(value.ticks))throw Error('이 반주 구간의 리듬 분할은 아직 지원하지 않습니다. 원본 리듬을 바꾸지 않았습니다.');result.push({...value,onset:at});at+=value.ticks;}
 return result;
}
function renderArrangement(document,source,target,path,options){
 const assignments=new Map(path.filter(p=>p.melody).map(p=>[p.chain,p.melody])),groups=[],audit=[];
 for(const p of path){
  if(p.cutGroup!=null){const group=groups.find(g=>g.id===p.cutGroup);if(group&&group.end>p.at){audit.push({bar:p.bar+1,at:p.at,action:'shorten',source:group.notes.map(n=>n.key),from:group.end,to:p.at});group.end=p.at;}}
  if(p.group){groups.push({...p.group});for(const n of p.group.notes)if(n.end>p.group.end)audit.push({bar:p.bar+1,at:p.at,action:'shorten',source:[n.key],from:n.end,to:p.group.end});}
  for(const n of p.omitted)audit.push({bar:p.bar+1,at:p.at,action:'omit',midi:n.midi,role:n.role,source:n.key,reason:n.reason??(n.midi===p.melody?.midi?'melody-merge':'playability-or-melody-priority')});
  for(const n of p.group?.notes??[])if(n.midi!==source.tones.find(t=>t.key===n.key)?.midi&&n.octaveShift)audit.push({bar:p.bar+1,at:p.at,action:'octave',source:n.key,from:n.midi-n.octaveShift,to:n.midi,role:n.role});
 }
 const ids=new Map(source.melody.map(m=>[m.key,newId('event')]));
 const measures=source.bars.map(b=>{
  const original=document.measures[b.bar],events=source.melody.filter(m=>m.bar===b.bar).map(m=>{
   const n=assignments.get(m.chain),e=m.source;
   return {id:ids.get(m.key),voice:'melody',onset:e.onset,duration:e.duration,...(e.sustainTicks!=null?{sustainTicks:e.sustainTicks}:{}),...(e.dotted?{dotted:true}:{}),...(e.tuplet?{tuplet:{...e.tuplet,groupId:`arr-${e.tuplet.groupId}`}}:{}),rest:m.midi===undefined,blank:false,technique:null,velocity:.88,dampAtEnd:true,...(e.tieTo?{tieTo:ids.get(e.tieTo)}:{}),notes:m.midi===undefined?[]:[{id:newId('tone'),string:n.string,fret:n.fret,midi:m.midi,locked:true,arrangementSource:m.key}]};
  });
  const list=groups.filter(g=>g.bar===b.bar&&g.end>g.start);let at=b.start;
  const emit=(start,end,group)=>{
   const pieces=rhythmPieces(start-b.start,end-b.start),created=pieces.map(piece=>({id:newId('event'),voice:'accompaniment',onset:piece.onset,duration:piece.duration,...(piece.dotted?{dotted:true}:{}),rest:!group,blank:false,technique:null,velocity:.6,dampAtEnd:true,notes:group?group.notes.map(n=>({id:newId('tone'),string:n.string,fret:n.fret,midi:n.midi,locked:true,...(n.dead?{dead:true}:{}),arrangementSource:n.key})):[]}));
   if(group&&!group.notes.some(n=>n.dead))for(let i=0;i<created.length-1;i++)created[i].tieTo=created[i+1].id;
   events.push(...created);
  };
  for(const group of list){if(group.start>at)emit(at,group.start);emit(group.start,group.end,group);at=group.end;}
  if(at<b.end)emit(at,b.end);
  const {pdfImport,events:old,chord,sketchVoicings,...metadata}=original;
  return {...metadata,id:newId('bar'),chord:null,events:events.sort((a,b)=>a.onset-b.onset||(a.voice==='melody'?-1:1))};
 });
 const snapshot=structuredClone(document);delete snapshot.guitarArrangement;
 const {pdfTabImport,...base}=document;
 const result={...base,...target,id:newId('score'),kind:'user',origin:null,title:`${document.title} · 기타 편곡`,measures,viewSettings:{...document.viewSettings,notationView:'both',systemBreaks:[],sourceLayout:false},guitarArrangement:{version:1,options,melodyVoice:source.melodyVoice,sourceDocument:snapshot,reviewBars:source.reviewBars,audit}};
 const checked=compileDocumentV2(result);if(checked.errors.length||checked.issues.length)throw Error(`편곡 악보 검증 실패: ${[...checked.errors,...checked.issues].slice(0,2).join(' / ')}`);
 // Re-read the generated document, including its actual tuning/capo, instead
 // of reporting preservation based only on the search's intended pitches.
 const generated=arrangementSource(result,{melodyVoice:'melody'});
 const signature=s=>s.melody.map(m=>[m.start,m.end,m.midi,m.source.sustainTicks??null,m.source.tieTo?s.melody.findIndex(n=>n.key===m.source.tieTo):null]);
 if(JSON.stringify(signature(source))!==JSON.stringify(signature(generated)))throw Error('편곡 후 멜로디의 음높이·리듬·붙임줄 대조에 실패했습니다. 원본을 유지했습니다.');
 return {document:result,report:{melodyNotes:source.melody.filter(m=>m.midi!==undefined).length,melodyChanged:0,omitted:audit.filter(a=>a.action==='omit').length,octaveChanges:audit.filter(a=>a.action==='octave').length,shortened:audit.filter(a=>a.action==='shorten').length,sourceReviewBars:source.reviewBars,frames:path.map(p=>({at:p.at,grip:p.grip,jump:p.jump})),audit}};
}
export function arrangeGuitar(document,settings={}){
 const options={...defaults,...settings};
 if(!Number.isInteger(options.maxFingers)||options.maxFingers<1||options.maxFingers>4||!Number.isInteger(options.maxSpan)||options.maxSpan<1||options.maxSpan>5||!Number.isInteger(options.maxFret)||options.maxFret<3||options.maxFret>24||!Number.isInteger(options.maxShift)||options.maxShift<0||options.maxShift>24)throw Error('기타의 손가락·프렛·이동 제한을 확인해 주세요.');
 const target={instrument:'guitar',tuning:document.instrument==='guitar'?[...document.tuning]:[64,59,55,50,45,40],capo:document.instrument==='guitar'?document.capo??0:0};
 if(target.tuning.length!==6&&options.mode==='fingerstyle')throw Error('이 반주 템플릿은 6현 기타용입니다.');
 const effective={...target,tuning:target.tuning.map(n=>n+target.capo)};
 const source=arrangementSource(document,options),frames=buildFrames(document,source,effective,options);
 const path=chooseSequence(frames,effective,{...options,maxFret:Math.min(options.maxFret,24-target.capo)});
 // Independent final physical check: melody reservations and retained basses
 // are included, not just newly attacked accompaniment notes.
 if(path.some(p=>!gripFeasible(p.grip,options)))throw Error('편곡 운지 검증에 실패했습니다.');
 return renderArrangement(document,source,target,path,options);
}
