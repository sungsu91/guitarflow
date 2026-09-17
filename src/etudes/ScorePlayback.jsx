import EditorAudioDock from './EditorAudioDock.jsx';
import {useEffect,useRef,useState} from 'react';
import {Volume2,VolumeX} from 'lucide-react';
import {resumeSharedAudioContext} from '../audio/audioBus.js';
import {createScoreVoiceOutput,prepareScoreInstrument} from '../audio/scoreInstrument.js';
import {warmGuitarPhrase} from '../audio/fretboardPreviewEngine.js';
import {guitarVoiceTimeline,voicesFrom} from './scorePlayback.js';
import useEtudeMetronome from './useEtudeMetronome.js';
import useScoreInstrument from './useScoreInstrument.js';
import './scoreInstrument.css';
export default function ScorePlayback({score,bpm=score?.bpm,disabled=false,compact=false,dock=false,onPosition,controller,startAt={bar:0,event:0},onBpm,onBeforePlay}) {
 const [instrument,setInstrument]=useScoreInstrument();
 const session=useRef(null),trailing=useRef(null),token=useRef(0),notify=useRef(onPosition),[playing,setPlaying]=useState(false),[error,setError]=useState(''),[audible,setAudible]=useState(false),[position,setPosition]=useState(null);notify.current=onPosition;
 const metro=useEtudeMetronome(bpm??60,{beatsPerBar:score?.meter?.[0]??4,beatUnit:score?.meter?.[1]??4,audible});
 const stop=()=>{token.current++;metro.stop();trailing.current?.dispose();trailing.current=null;const s=session.current;if(s){clearInterval(s.timer);s.output.dispose();session.current=null;}setPlaying(false);setPosition(null);notify.current?.(null);};
 useEffect(()=>{stop();return stop;},[score,bpm,disabled,instrument]);
 const play=async(from=startAt)=>{
  stop();onBeforePlay?.();const request=token.current;
  try{
   const ctx=await resumeSharedAudioContext();if(!ctx)throw Error('이 브라우저에서 오디오를 시작할 수 없습니다.');
   const piano=await prepareScoreInstrument(ctx,instrument);if(request!==token.current)return;
   const timeline=guitarVoiceTimeline(score,bpm),capacity=score.meter[0]*1920/score.meter[1],offset=(timeline.order.indexOf(from.bar)*capacity+(score.measures[from.bar]?.[from.event]?.onset??0))/480*60/bpm;
   if(!timeline.order.includes(from.bar))throw Error('선택한 마디는 현재 반복 경로에서 연주되지 않습니다. 시작 마디를 선택하세요.');
   if(offset>=timeline.duration-1e-7)return;
   const voices=voicesFrom(timeline,offset);
   if(instrument!=='piano')voices.slice(0,6).forEach((voice,index)=>warmGuitarPhrase(ctx,voice,index));
   const clock=await metro.start({beatOffset:(score.measures[from.bar]?.[from.event]?.onset??0)/(1920/score.meter[1]),durationSeconds:timeline.duration-offset});if(request!==token.current||!clock)return;
   const slots=timeline.order.flatMap((bar,visit)=>score.measures[bar].map((e,event)=>({bar,event,barStart:visit*capacity,start:(visit*capacity+e.onset)/480*60/bpm}))).filter(e=>e.start<timeline.duration-1e-7);
   const s={output:createScoreVoiceOutput(ctx),index:0,start:clock.origin-offset,timer:0,slot:-1};session.current=s;setPlaying(true);setError('');
   const tick=()=>{
    if(session.current!==s)return;
    while(s.index<voices.length&&voices[s.index].start+s.start<ctx.currentTime+.4){
     const start=voices[s.index].start,group=[];
     while(s.index<voices.length&&Math.abs(voices[s.index].start-start)<1e-7)group.push(voices[s.index++]);
     s.output.schedule(group,s.start+start,instrument,piano);
    }
    const elapsed=ctx.currentTime-s.start,i=slots.findLastIndex(e=>e.start<=elapsed);
    if(i>=0&&i!==s.slot){s.slot=i;const current={...slots[i],playing:true,getBarTick:()=>Math.max(0,Math.min(capacity,(ctx.currentTime-s.start)*480*bpm/60-slots[i].barStart))};setPosition(current);notify.current?.(current);}
    if(elapsed>=timeline.duration){clearInterval(s.timer);metro.stop();s.output.finish();trailing.current=s.output;session.current=null;setPlaying(false);setPosition(null);notify.current?.(null);}
   };
   s.timer=setInterval(tick,25);tick();
  }catch(e){setError(e.message);stop();}
 };
 if(controller)controller.current={seek:position=>{if(session.current)void play(position);},stop};
 if(dock)return <EditorAudioDock instrument={instrument} onInstrument={setInstrument} playing={playing} disabled={disabled||!score} onPlay={()=>playing?stop():void play()} bpm={bpm} onBpm={onBpm} audible={audible} onAudible={()=>setAudible(v=>!v)} status={playing&&position?`${position.bar+1}마디 · ${Math.floor(score.measures[position.bar][position.event].onset/(1920/score.meter[1]))+1}박`:'준비'} error={error||metro.error}/>;
 return <><div className="etudeSoundControls" role="group" aria-label="음색"><span>음색</span>{[['clean-guitar','클린 기타'],['piano','피아노']].map(([value,label])=><button type="button" key={value} aria-pressed={instrument===value} onClick={()=>setInstrument(value)}>{label}</button>)}</div><div className={`etudeScorePlayback ${compact?'is-compact':''}`}><button type="button" disabled={disabled||!score} aria-label={compact?'악보 재생 정지':playing?'악보 재생 정지':'악보 음정·리듬 듣기'} aria-pressed={playing} onClick={()=>playing?stop():void play()}>{compact?(playing?'■':'▶'):(playing?'악보 재생 정지':'악보 음정·리듬 듣기')}</button>{compact?<><label>BPM<input aria-label="악보 재생 BPM" type="number" min="30" max="240" value={bpm} onChange={e=>onBpm?.(Math.max(30,Math.min(240,Number(e.target.value)||60)))}/></label><div className="mobilePlaybackStatus"><span className="mobileBeatPosition">{playing&&position?`${position.bar+1}마디 · ${Math.floor(score.measures[position.bar][position.event].onset/(1920/score.meter[1]))+1}박`:'준비'}</span><button type="button" className="mobileMetro" aria-label="박자 소리" title={audible?'박자 소리 끄기':'박자 소리 켜기'} aria-pressed={audible} onClick={()=>setAudible(value=>!value)}>{audible?<Volume2 size={20} aria-hidden="true"/>:<VolumeX size={20} aria-hidden="true"/>}</button></div></>:<small>{instrument==='piano'?'피아노 · 참고 음색':'클린 기타 · 플럭 모델링'}</small>}{(error||metro.error)&&<p role="alert">{error||metro.error}</p>}</div></>;
}
