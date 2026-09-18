import PracticeTransport from './PracticeTransport.jsx';
import {performedMeasures,practiceClicks,measureMeters} from './scoreMeters.js';
import {createPortal} from 'react-dom';
import EditorAudioDock from './EditorAudioDock.jsx';
import {useEffect,useRef,useState} from 'react';
import {Volume2,VolumeX} from 'lucide-react';
import {resumeSharedAudioContext} from '../audio/audioBus.js';
import {createScoreVoiceOutput,prepareScoreInstrument} from '../audio/scoreInstrument.js';
import {warmGuitarPhrase} from '../audio/fretboardPreviewEngine.js';
import {scoreTimeline,guitarVoiceTimeline,voicesFrom} from './scorePlayback.js';
import {playbackSlots,slotAtTick,seekTick} from './scorePlaybackPosition.js';
import useEtudeMetronome from './useEtudeMetronome.js';
import useScoreInstrument from './useScoreInstrument.js';
import './scoreInstrument.css';
export default function ScorePlayback({score,bpm=score?.bpm,disabled=false,practice=false,toolbar=false,toolbarTarget=null,compact=false,dock=false,onPosition,controller,startAt={bar:0,event:0},onBpm,onBeforePlay,renderPractice,metroOptions={}}) {
 const optionalSound=practice||dock;
 const [storedInstrument,setStoredInstrument]=useScoreInstrument();
 const [localInstrument,setLocalInstrument]=useState('clean-guitar'),[sound,setSound]=useState(false),[pulse,setPulse]=useState(null);
 const instrument=practice?localInstrument:storedInstrument,setInstrument=practice?setLocalInstrument:setStoredInstrument;
 const voiceSettings=useRef({sound,instrument});voiceSettings.current={sound,instrument};
 const session=useRef(null),trailing=useRef(null),token=useRef(0),held=useRef(null),pending=useRef(null),notify=useRef(onPosition);
 const [playing,setPlaying]=useState(false),[error,setError]=useState(''),[audible,setAudible]=useState(practice||dock),[position,setPosition]=useState(null);notify.current=onPosition;
 const metro=useEtudeMetronome(bpm??60,{beatsPerBar:score?.meter?.[0]??4,beatUnit:score?.meter?.[1]??4,audible,toneSrc:metroOptions.toneSrc});
 const publish=value=>{setPosition(value);notify.current?.(value);};
 const stop=()=>{token.current++;held.current=null;pending.current=null;metro.stop();trailing.current?.dispose();trailing.current=null;const s=session.current;if(s){clearInterval(s.timer);s.output.dispose();session.current=null;}setPlaying(false);setPulse(null);publish(null);};
 // Presentation/BPM edits keep the transport; only musical document changes stop it.
 useEffect(()=>{stop();return stop;},[score?.document?.measures??score,score?.meter,score?.tuning,score?.keySignature,disabled,optionalSound?null:instrument]);
 useEffect(()=>{if(practice)setSound(false);},[score,practice]);
 const previousBpm=useRef(bpm),previousSubdivision=useRef(metroOptions.clicksPerBeat);
 useEffect(()=>{if(previousBpm.current===bpm&&previousSubdivision.current===metroOptions.clicksPerBeat)return;previousBpm.current=bpm;previousSubdivision.current=metroOptions.clicksPerBeat;if((toolbar||practice||dock)&&session.current){const timelineTick=session.current.getTimelineTick();void play({timelineTick});}else if((toolbar||practice||dock)&&pending.current){void play(pending.current);}else if(!toolbar&&!practice&&!dock)stop();},[bpm,metroOptions.clicksPerBeat]);
 const play=async(from=startAt)=>{
  stop();pending.current=from;onBeforePlay?.();const request=token.current;
  try{
   const ctx=await resumeSharedAudioContext();if(!ctx)throw Error('이 브라우저에서 오디오를 시작할 수 없습니다.');
   const piano=optionalSound?null:await prepareScoreInstrument(ctx,instrument);if(request!==token.current)return;
   const timeline=optionalSound?scoreTimeline(score,bpm,false):guitarVoiceTimeline(score,bpm),capacity=score.meter[0]*1920/score.meter[1],slots=playbackSlots(score,timeline.order),offset=seekTick(slots,from)/480*60/bpm;
   if(from.bar!=null&&!timeline.order.includes(from.bar))throw Error('선택한 마디는 현재 반복 경로에서 연주되지 않습니다. 시작 마디를 선택하세요.');
   if(offset>=timeline.duration-1e-7){pending.current=null;return;}
   const voices=optionalSound?[]:voicesFrom(timeline,offset);
   if((!practice||sound)&&instrument!=='piano')voices.slice(0,6).forEach((voice,index)=>warmGuitarPhrase(ctx,voice,index));
   const clicks=practiceClicks(performedMeasures(score,timeline.order)).flatMap(c=>Array.from({length:metroOptions.clicksPerBeat??1},(_,i)=>({...c,tick:c.tick+i*1920/c.meter[1]/(metroOptions.clicksPerBeat??1),downbeat:c.downbeat&&i===0}))).filter(c=>c.tick*60/bpm/480>=offset-1e-7).map(c=>({...c,time:c.tick*60/bpm/480-offset}));
   const clock=await metro.start({clicks,beatOffset:(offset*480*bpm/60%capacity)/(1920/score.meter[1]),durationSeconds:timeline.duration-offset});if(request!==token.current||!clock)return;
   const s={ctx,instrument,piano,soundReady:!optionalSound,voices,timeline,output:createScoreVoiceOutput(ctx),index:0,start:clock.origin-offset,timer:0,slot:null,getTimelineTick:()=>Math.max(offset*480*bpm/60,(ctx.currentTime-(clock.origin-offset))*480*bpm/60)};session.current=s;if(optionalSound)updateSound(s);pending.current=null;setPlaying(true);setError('');
   const tick=()=>{
    if(session.current!==s)return;
    while(s.index<s.voices.length&&s.voices[s.index].start+s.start<ctx.currentTime+.4){
     const start=s.voices[s.index].start,group=[];
     while(s.index<s.voices.length&&Math.abs(s.voices[s.index].start-start)<1e-7)group.push(s.voices[s.index++]);
     if(s.soundReady)s.output.schedule(group,s.start+start,s.instrument,s.piano);
    }
    const elapsed=ctx.currentTime-s.start,currentSlot=slotAtTick(slots,s.getTimelineTick());
    if(practice&&currentSlot){const beat=ctx.currentTime<clock.origin?-1:Math.min(currentSlot.meter[0]-1,Math.floor((s.getTimelineTick()-currentSlot.barStart)/(1920/currentSlot.meter[1])));setPulse(p=>p?.beat===beat&&p?.meter.join()===currentSlot.meter.join()?p:{beat,meter:currentSlot.meter});}
    if(currentSlot&&currentSlot!==s.slot){s.slot=currentSlot;publish({...currentSlot,playing:true,getTimelineTick:s.getTimelineTick,getCurrentSlot:()=>slotAtTick(slots,s.getTimelineTick()),getBarTick:()=>Math.max(0,Math.min(currentSlot.capacity,s.getTimelineTick()-currentSlot.barStart))});}
    if(elapsed>=timeline.duration){clearInterval(s.timer);metro.stop();s.output.finish();trailing.current=s.output;session.current=null;setPlaying(false);setPulse(null);publish(null);}
   };
   s.timer=setInterval(tick,25);tick();
  }catch(e){setError(e.message);stop();}
 };
 // Sound changes replace only the voice output. Async preparation is versioned
 // independently from transport start/stop, so it cannot revive a stale session.
 const updateSound=s=>{
  const version=s.voiceVersion=(s.voiceVersion??0)+1,settings=voiceSettings.current;
  s.soundReady=false;s.voices=[];s.index=0;s.output.dispose();s.output=createScoreVoiceOutput(s.ctx);
  if(settings.sound)prepareScoreInstrument(s.ctx,settings.instrument).then(buffer=>{
   if(session.current!==s||s.voiceVersion!==version)return;
   s.instrument=settings.instrument;s.piano=buffer;s.voiceTimeline??=guitarVoiceTimeline(score,bpm);s.voices=voicesFrom(s.voiceTimeline,Math.max(0,s.ctx.currentTime-s.start));s.index=0;s.soundReady=true;
  }).catch(e=>{if(session.current===s&&s.voiceVersion===version)setError(e.message);});
 };
 useEffect(()=>{if(optionalSound&&session.current)updateSound(session.current);},[sound,instrument,optionalSound]);
 const pause=()=>{const s=session.current;if(!s)return;const timelineTick=s.getTimelineTick(),slot=slotAtTick(playbackSlots(score,scoreTimeline(score,bpm,false).order),timelineTick);stop();held.current={timelineTick};publish({...slot,playing:false,getTimelineTick:()=>timelineTick,getBarTick:()=>timelineTick-slot.barStart});};
 const seek=from=>{if(disabled||!score)return;if(session.current)void play(from);else if(toolbar||practice){const slots=playbackSlots(score,scoreTimeline(score,bpm,false).order),timelineTick=seekTick(slots,from),slot=slotAtTick(slots,timelineTick);held.current={timelineTick};publish({...slot,playing:false,getTimelineTick:()=>timelineTick,getBarTick:()=>timelineTick-slot.barStart});}};
 if(controller)controller.current={seek,stop,pause,resume:()=>void play(held.current??startAt)};
 if(practice){const props={bpm,onBpm,meter:pulse?.meter??position?.meter??(score?measureMeters(score)[0]:[4,4]),beat:playing?pulse?.beat??-1:position?Math.floor(position.getBarTick()/(1920/position.meter[1])):-1,playing,paused:Boolean(position&&!playing),disabled:disabled||!score,onStart:()=>void play(),onStop:stop,onPause:pause,onResume:()=>void play(held.current??startAt),click:audible,onClickSound:()=>setAudible(v=>!v),sound,onSound:()=>setSound(v=>!v),instrument,onInstrument:setInstrument,error:error||metro.error};return renderPractice?renderPractice(props):<PracticeTransport {...props}/>;}
 if(toolbar){const controls=<><button aria-label={playing||position?'악보 재생 정지':'악보 듣기'} type="button" disabled={disabled||!score} aria-pressed={playing} onClick={()=>playing||position?stop():void play()}>{playing||position?'■ 악보 정지':'▶ 악보 듣기'}</button>{position&&<button type="button" onClick={()=>playing?pause():void play(held.current??startAt)}>{playing?'일시정지':'이어서 재생'}</button>}<label>음색 <select aria-label="악보 음색" value={instrument} onChange={e=>setInstrument(e.target.value)}><option value="clean-guitar">클린 기타</option><option value="piano">피아노</option></select></label><label>재생 위치 <select disabled={disabled||!score} aria-label="악보 재생 마디" value={position?.bar??0} onChange={e=>seek({bar:Number(e.target.value),event:0})}>{score?.measures.map((_,i)=><option key={i} value={i}>{i+1}마디</option>)}</select></label>{(error||metro.error)&&<p role="alert">{error||metro.error}</p>}</>;return toolbarTarget?createPortal(controls,toolbarTarget):null;}
 if(dock)return <EditorAudioDock sound={sound} onSound={()=>setSound(v=>!v)} instrument={instrument} onInstrument={setInstrument} playing={playing} disabled={disabled||!score} onPlay={()=>playing?stop():void play()} bpm={bpm} onBpm={onBpm} audible={audible} onAudible={()=>setAudible(v=>!v)} status={playing&&position?`${position.bar+1}마디 · ${Math.floor(score.measures[position.bar][position.event].onset/(1920/score.meter[1]))+1}박`:'준비'} error={error||metro.error}/>;
 return <><div className="etudeSoundControls" role="group" aria-label="음색"><span>음색</span>{[['clean-guitar','클린 기타'],['piano','피아노']].map(([value,label])=><button type="button" key={value} aria-pressed={instrument===value} onClick={()=>setInstrument(value)}>{label}</button>)}</div><div className={`etudeScorePlayback ${compact?'is-compact':''}`}><button type="button" disabled={disabled||!score} aria-label={compact?'악보 재생 정지':playing?'악보 재생 정지':'악보 음정·리듬 듣기'} aria-pressed={playing} onClick={()=>playing?stop():void play()}>{compact?(playing?'■':'▶'):(playing?'악보 재생 정지':'악보 음정·리듬 듣기')}</button>{compact?<><label>BPM<input aria-label="악보 재생 BPM" type="number" min="30" max="240" value={bpm} onChange={e=>onBpm?.(Math.max(30,Math.min(240,Number(e.target.value)||60)))}/></label><div className="mobilePlaybackStatus"><span className="mobileBeatPosition">{playing&&position?`${position.bar+1}마디 · ${Math.floor(score.measures[position.bar][position.event].onset/(1920/score.meter[1]))+1}박`:'준비'}</span><button type="button" className="mobileMetro" aria-label="박자 소리" title={audible?'박자 소리 끄기':'박자 소리 켜기'} aria-pressed={audible} onClick={()=>setAudible(value=>!value)}>{audible?<Volume2 size={20} aria-hidden="true"/>:<VolumeX size={20} aria-hidden="true"/>}</button></div></>:<small>{instrument==='piano'?'피아노 · 참고 음색':'클린 기타 · 플럭 모델링'}</small>}{(error||metro.error)&&<p role="alert">{error||metro.error}</p>}</div></>;
}
