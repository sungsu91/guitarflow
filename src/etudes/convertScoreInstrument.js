import {effectiveTuning,soundingMidi} from './scoreTuning.js';
import {SCORE_INSTRUMENTS,scoreInstrument} from './scoreInstruments.js';
import {NATURAL_HARMONICS,fingeringCandidates} from './scoreModel.js';

// Assign simultaneous pitches to distinct strings. A greedy assignment can
// reject a playable chord, especially with re-entrant high-G ukulele tuning.
function assign(notes,source,target,where) {
  const options=notes.map(note=>{
    const midi=note.midi??source[note.string-1]+(note.harmonic?NATURAL_HARMONICS[note.fret]:note.fret);
    const candidates=note.dead?target.map((_,i)=>({string:i+1,fret:note.fret})):
      note.harmonic?target.flatMap((open,i)=>Object.entries(NATURAL_HARMONICS).filter(([,interval])=>open+interval===midi).map(([fret])=>({string:i+1,fret:Number(fret)}))):fingeringCandidates(midi,target);
    return candidates.sort((a,b)=>(a.string===note.string?0:1)-(b.string===note.string?0:1)||a.fret-b.fret);
  });
  const order=notes.map((_,i)=>i).sort((a,b)=>options[a].length-options[b].length),result=[],used=new Set();
  function visit(at){if(at===order.length)return true;const i=order[at];for(const choice of options[i]){if(used.has(choice.string))continue;used.add(choice.string);result[i]={...notes[i],...choice,unplaced:false,locked:true};if(visit(at+1))return true;used.delete(choice.string);}return false;}
  if(!visit(0)){
    const pitches=notes.filter(n=>!n.dead).map(n=>source[n.string-1]+(n.harmonic?NATURAL_HARMONICS[n.fret]:n.fret));
    const reason=pitches.some(midi=>midi<Math.min(...target))
      ?'새 악기에서 낼 수 있는 음보다 낮은 음이 있어, 같은 음높이로 옮길 수 없습니다.'
      :pitches.some(midi=>midi>Math.max(...target)+24)&&!notes.some(n=>n.harmonic)
        ?'새 악기의 지원 음역보다 높은 음이 있어, 같은 음높이로 옮길 수 없습니다.'
        :'새 악기의 줄 수와 운지로는 기존 화음(동시음) 또는 하모닉스를 그대로 옮길 수 없습니다.';
    throw Error(`${where}: ${reason}`);
  }
  return result;
}

export function convertScoreInstrument(document,id){
  if(!Object.hasOwn(SCORE_INSTRUMENTS,id))throw Error('지원하지 않는 악기입니다.');
  if((document.instrument??'guitar')===id)return document;
  const target=scoreInstrument(id).tuning,next=structuredClone(document),source=effectiveTuning(document);
  next.instrument=id;next.tuning=[...target];next.capo=0;
  next.measures.forEach((bar,b)=>{
    bar.events.forEach((event,i)=>{event.notes=assign(event.notes.map(n=>({...n,midi:soundingMidi(document,n),dead:n.dead??event.dead})),source,target,`${b+1}마디 ${i+1}음`);});
    if(bar.chord){
      const notes=bar.chord.frets.flatMap((fret,i)=>fret===null?[]:[{string:source.length-i,fret}]);
      const converted=assign(notes,source,target,`${b+1}마디 코드표`);
      // Finger numbers and barre marks describe the old grip, not its pitches.
      bar.chord={...bar.chord,frets:target.map(()=>null),fingers:target.map(()=>null),barre:null};
      converted.forEach(n=>{bar.chord.frets[target.length-n.string]=n.fret;});
    }
  });
  const events=next.measures.flatMap((m,b)=>m.events.map(e=>({event:e,bar:b+1})));
  events.forEach(({event:e,bar},i)=>{
    const after=events[i+1]?.event;
    if(e.technique&&after){const a=e.notes[0],b=after.notes[0];if(!a||!b||a.string!==b.string||a.fret===b.fret||(e.technique==='H'&&a.fret>b.fret)||(e.technique==='P'&&a.fret<b.fret))throw Error(`${bar}마디: 기존 연결 주법을 유지할 운지를 확인해야 합니다. 악보는 변경하지 않았습니다.`);}
    if(e.tieTo&&after?.id===e.tieTo&&JSON.stringify(e.notes.map(n=>[n.string,n.fret]).sort())!==JSON.stringify(after.notes.map(n=>[n.string,n.fret]).sort()))throw Error(`${bar}마디: 붙임줄 운지를 유지할 수 없습니다. 악보는 변경하지 않았습니다.`);
  });
  return next;
}
