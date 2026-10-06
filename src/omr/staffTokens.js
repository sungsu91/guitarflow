import {createBlankDocument,ticksOf} from '../etudes/scoreModel.js';
import {assignTab} from '../etudes/scoreTuning.js';
import {meterTicks} from '../etudes/scoreMeters.js';
import {resolveImportTarget,importOctaveShift} from '../pdf/tab-import/importTarget.js';

const durations={whole:'1',half:'2',quarter:'4',eighth:'8',sixteenth:'16',thirty_second:'32'};
const natural={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const fifths={C:0,G:1,D:2,A:3,E:4,B:5,'F#':6,'C#':7,F:-1,Bb:-2,Eb:-3,Ab:-4,Db:-5,Gb:-6,Cb:-7,Am:0,Em:1,Bm:2,'F#m':3,'C#m':4,'G#m':5,Dm:-1,Gm:-2,Cm:-3,Fm:-4};
const alteration=sign=>sign==='N'?0:sign==='#'?1:sign==='##'?2:sign==='b'?-1:sign==='bb'?-2:0;
function keyAlter(key,letter){const count=fifths[key]??0,order=count<0?'BEADGCF':'FCGDAEB';return order.slice(0,Math.abs(count)).includes(letter)?Math.sign(count):0;}

// TrOMR prints accidentals after the octave; its plain pitches inherit the
// key and measure accidentals. Keep unrecognized tokens as explicit gaps.
export function parseStaffTokens(raw,{meter=[4,4],key='C',polyphonic=false}={}){
  let events=[],accidentals=new Map(),clef=null;
  const measures=[],warnings=[];
  const flush=()=>{if(events.length)measures.push({events,meter:[...meter],key});events=[];accidentals=new Map();};
  for(const [index,token] of String(raw).trim().split('+').entries()){
    if(token==='barline'){flush();continue;}
    if(/^clef-/.test(token)){clef=token;continue;}
    const signature=token.match(/^keySignature-([A-G][#b]?)(M|m)$/);
    if(signature){const next=signature[1]+(signature[2]==='m'?'m':'');if(Object.hasOwn(fifths,next))key=next;else warnings.push(token);continue;}
    const time=token.match(/^timeSignature-([2346])\/([48])$/);
    if(time){meter=time.slice(1).map(Number);continue;}
    const parts=token.split('|'),notes=[];let rhythm=null,rest=false,valid=true;
    const slash=token.match(/^rhythm-slash_(whole|half|quarter|eighth|sixteenth|thirty_second)(\.)?$/);
    if(slash){events.push({index,raw:token,notes:[],rest:false,rhythmSlash:true,duration:durations[slash[1]],dotted:Boolean(slash[2])});continue;}
    for(const part of parts){
      const note=part.match(/^note-([A-G])([#bN]*)([0-8])([#bN]*)_(whole|half|quarter|eighth|sixteenth|thirty_second)(\.)?$/);
      const silence=part.match(/^rest[-_](whole|half|quarter|eighth|sixteenth|thirty_second)(\.)?$/);
      if(!note&&!silence){valid=false;continue;}
      const next={duration:durations[note?note[5]:silence[1]],dotted:Boolean(note?note[6]:silence[2])};
      if(rhythm&&(next.duration!==rhythm.duration||next.dotted!==rhythm.dotted)){
        if(!polyphonic)valid=false;
        else if(ticksOf(next)<ticksOf(rhythm))rhythm=next;
      }
      rhythm??=next;
      if(silence){rest=true;continue;}
      const letter=note[1],octave=Number(note[3]),sign=note[4]||note[2],id=letter+octave;
      if(sign)accidentals.set(id,alteration(sign));
      const alter=accidentals.get(id)??keyAlter(key,letter);
      notes.push({midi:(octave+1)*12+natural[letter]+alter,spelling:{letter,alter,octave},...(polyphonic?{writtenRhythm:next}:{})});
    }
    if(rest&&notes.length)valid=false;
    if(!valid||!rhythm){warnings.push(token);events.push({index,raw:token,notes:[],rest:false,duration:null,unread:true});}
    else events.push({index,raw:token,notes,rest,...rhythm});
  }
  flush();if(!clef)warnings.push('missing:clef');
  return {raw,measures,warnings,meter,key,clef};
}

export function staffSystemToAnalysis(parsed,{system,page,width,height,octaveShift,target:requestedTarget,previous=[]}){
  const target=resolveImportTarget(requestedTarget);octaveShift??=importOctaveShift(target);
  if(parsed.clef&&!['clef-G2','clef-F4','grand-G2-F4'].includes(parsed.clef))throw Error('이 음자리표의 PDF 인식은 아직 검증되지 않았습니다. 타악기 오선을 일반 음높이 또는 기타 TAB으로 변환하지 않습니다.');
  if(![0,-12].includes(octaveShift))throw Error('오선보의 옥타브 기준을 확인해 주세요.');
  const document={...createBlankDocument(),...target,autoTab:{mode:'range',min:0,max:4}};
  const source={page,staff:system.id,...system.rect,pageWidth:width,pageHeight:height,coordinateSpace:'system-crop',notation:true};
  const measures=parsed.measures.map((bar,index)=>{
    const bounds=system.measures?.length===parsed.measures.length?system.measures[index]:null;
    const slots=bar.events.map(event=>{
      const pitched=event.notes.map(n=>({...n,midi:n.midi+octaveShift,locked:false}));
      const assigned=target.instrument==='piano'?pitched:assignTab(document,pitched,previous);previous=assigned;
      const notes=assigned.map(n=>({...n,...(event.voice?{hand:event.voice}:{}),status:'confirmed',confidence:{fret:0,string:0,rhythm:0},method:'staff-omr',source:{...source,staff:event.sourceStaff??source.staff,tokenIndex:event.index,writtenMidi:n.midi-octaveShift}}));
      return {...event,positioned:Number.isFinite(event.x),x:event.x??source.x,source:{...source,measure:index+1,tokenIndex:event.index},notes,rejections:[],status:'unresolved',confidence:0};
    });
    const voices=[...new Set(slots.map(s=>s.voice))];
    const totals=voices.map(voice=>slots.filter(s=>s.voice===voice).reduce((n,s)=>n+(s.duration?ticksOf(s):0),0));
    const ticks=Math.max(0,...totals),rhythmValid=slots.length>0&&slots.every(s=>s.duration)&&totals.every(n=>n===meterTicks(bar.meter));
    return {...system.rect,...(bounds?{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height,repeatStart:bounds.repeatStart,repeatEnd:bounds.repeatEnd,endBarline:bounds.endBarline}:{}),positioned:Boolean(bar.positioned),source:{...source,measure:index+1},meter:bar.meter,key:bar.key,meterEvidence:{method:'staff-omr'},slots,orphan:[],ticks,rhythmValid,needsReview:true,notation:true,reasons:['staff-omr-review','ties-and-repeats-unverified',...(parsed.barCountRetry&&!parsed.barCountRetry.accepted?['source-bar-count-mismatch']:[]),...(!rhythmValid?['measure-rhythm-unverified']:[]),...(slots.some(s=>s.unread)?['unrecognized-notation-token']:[])]};
  });
  return {staff:{...system.staff,id:system.id,measures,notation:{raw:parsed.raw,...(parsed.parts?{parts:parsed.parts}:{}),endingBrackets:system.endingBrackets??[],warnings:parsed.warnings,clef:parsed.clef,key:parsed.key,rect:system.rect,octaveShift,...(parsed.retry?{retry:parsed.retry}:{}),...(parsed.barCountRetry?{barCountRetry:parsed.barCountRetry}:{}),...(parsed.measureRetry?{measureRetry:parsed.measureRetry}:{})}},previous};
}
