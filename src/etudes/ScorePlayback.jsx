import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import { BACKING_TRANSPORT_LOOKAHEAD_SECONDS } from '../audio/transportClock.js';
import {isFretted} from './scoreInstruments.js';
import {hasImportedTab} from './scorePlaybackReadiness.js';
import PracticeTransport from './PracticeTransport.jsx';
import PlaybackBarSelect from './PlaybackBarSelect.jsx';
import {playbackRoute,playbackCycles} from './scorePlaybackMode.js';
import {practiceCountIn} from './practiceCountIn.js';
import {performedMeasures,practiceClicks,measureMeters} from './scoreMeters.js';
import {createPortal} from 'react-dom';
import EditorAudioDock from './EditorAudioDock.jsx';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Volume2,VolumeX} from 'lucide-react';
import {resumeSharedAudioContext} from '../audio/audioBus.js';
import {createScoreVoiceOutput,prepareScoreInstrument} from '../audio/scoreInstrument.js';
import {warmGuitarPhrase} from '../audio/fretboardPreviewEngine.js';
import {scoreTimeline,guitarVoiceTimeline,voicesFrom} from './scorePlayback.js';
import {playbackSlots,slotAtTick,seekTick} from './scorePlaybackPosition.js';
import useEtudeMetronome from './useEtudeMetronome.js';
import useScoreInstrument from './useScoreInstrument.js';
import './scoreInstrument.css';
export default function ScorePlayback({drumAudio,volume=1,score:sourceScore,practiceRange=null,metronomeOnly=false,bpm=sourceScore?.bpm,disabled=false,practice=false,countIn=true,toolbar=false,toolbarTarget=null,compact=false,dock=false,onPosition,controller,startAt={bar:0,event:0},onBpm,onBeforePlay,renderPractice,repeatCount=1,metroOptions={}}) {
  useLanguage();
 const score=useMemo(()=>practiceRange?{...sourceScore,practiceRange}:sourceScore,[sourceScore,practiceRange]);
 const optionalSound=practice||dock;
 const [storedInstrument,setStoredInstrument]=useScoreInstrument();
 const [sound,setSound]=useState(()=>{if(drumAudio)return true;try{const saved=localStorage.getItem('fretiva.score.sound');if(saved!==null)return saved==='true';}catch{}return Boolean(dock&&score?.instrument==='piano');}),[pulse,setPulse]=useState(null);
 const fixedInstrument=score?.instrument==='bass'?'bass':score&&!isFretted(score.instrument)?score.instrument==='drums'?'drums':'piano':null;
 const instrument=fixedInstrument??(dock||practice?'clean-guitar':storedInstrument),setInstrument=fixedInstrument||dock||practice?()=>{}:setStoredInstrument;
 useEffect(()=>{if(dock&&fixedInstrument==='piano')setSound(true);},[dock,fixedInstrument]);
 // Imported fingerings should be audible on opening. The user can still mute
 // this document afterwards; edits and seeking do not reset that choice.
 useEffect(()=>{if(hasImportedTab(sourceScore?.document))setSound(true);},[sourceScore?.id]);
 const timbres=fixedInstrument?[[fixedInstrument,fixedInstrument==='bass'?ko['tuner.bass']:fixedInstrument==='drums'?ko["app.drums"]:ko["etudes.piano"]]]:[['clean-guitar',ko["etudes.cleanGuitar"]],['piano',ko["etudes.piano"]]];
 const voiceSettings=useRef({sound,instrument,volume});voiceSettings.current={sound:sound&&!metronomeOnly&&!drumAudio?.muted,instrument,volume};
 const session=useRef(null),trailing=useRef(null),token=useRef(0),held=useRef(null),pending=useRef(null),notify=useRef(onPosition);
 const [playing,setPlaying]=useState(false),[error,setError]=useState(''),[audible,setAudible]=useState(practice||dock),[position,setPosition]=useState(null);notify.current=onPosition;
 const [beatAccents,setBeatAccents]=useState({});
 const metro=useEtudeMetronome(bpm??60,{beatsPerBar:score?.meter?.[0]??4,beatUnit:score?.meter?.[1]??4,audible:audible&&!drumAudio?.muted,clickAccent:practice?step=>beatAccents[step.beat]==='mute'?'mute':step.subdivisionIndex===0&&(beatAccents[step.beat]??(step.beat===0)):undefined,toneSrc:metroOptions.toneSrc});
 useEffect(()=>{session.current?.output.setVolume(volume);trailing.current?.setVolume(volume);},[volume]);
 const publish=value=>{setPosition(value);notify.current?.(value);};
 const stop=()=>{token.current++;held.current=null;pending.current=null;metro.stop();trailing.current?.dispose();trailing.current=null;const s=session.current;if(s){clearInterval(s.timer);s.output.dispose();session.current=null;}setPlaying(false);setPulse(null);publish(null);};
 // Presentation/BPM edits keep the transport; only musical document changes stop it.
 useEffect(()=>{stop();return stop;},[score?.document?.measures??score,score?.meter,score?.tuning,score?.keySignature,disabled,optionalSound?null:instrument,repeatCount,practiceRange]);
 useEffect(()=>{try{localStorage.setItem('fretiva.score.sound',String(sound));}catch{}},[sound]);
 const previousBpm=useRef(bpm),previousSubdivision=useRef(metroOptions.clicksPerBeat);
 useEffect(()=>{if(previousBpm.current===bpm&&previousSubdivision.current===metroOptions.clicksPerBeat)return;previousBpm.current=bpm;previousSubdivision.current=metroOptions.clicksPerBeat;if((toolbar||practice||dock)&&session.current){const timelineTick=session.current.getTimelineTick();void play({timelineTick,route:session.current.route,resume:!session.current?.isCountingIn()});}else if((toolbar||practice||dock)&&pending.current){void play(pending.current);}else if(!toolbar&&!practice&&!dock)stop();},[bpm,metroOptions.clicksPerBeat]);
 const play=async(from=startAt)=>{
  if(practiceRange&&from.timelineTick==null&&(from.bar<practiceRange.start||from.bar>practiceRange.end))from={bar:practiceRange.start,event:0};
  stop();pending.current=from;onBeforePlay?.();const request=token.current;
  try{
   const ctx=await resumeSharedAudioContext();if(!ctx)throw Error(ko["etudes.audioCannotBeStartedInThisBrowser"]);
   const piano=optionalSound&&!(instrument==='bass'&&voiceSettings.current.sound)?null:await prepareScoreInstrument(ctx,instrument);if(request!==token.current)return;
   const route=playbackRoute(score,from);
   const timeline=optionalSound?scoreTimeline(score,bpm,false,{...route,playEmptyScore:dock||practice}):guitarVoiceTimeline(score,bpm,route),capacity=score.meter[0]*1920/score.meter[1],slots=playbackSlots(score,timeline.order),offset=seekTick(slots,from)/480*60/bpm;
   if(practice){const last=performedMeasures(score,timeline.order).at(-1);timeline.duration=(last.barStart+last.capacity)/480*60/bpm;}
   const repeats=playbackCycles({practice,route,repeatCount}),totalDuration=timeline.duration*repeats,cycleTicks=timeline.duration*480*bpm/60;
   if(from.bar!=null&&!timeline.order.includes(from.bar))throw Error(ko["etudes.theSelectedBarIsNotPlayedOnTheCurrentRepeatPathChoose"]);
   if(!timeline.duration||offset>=totalDuration-1e-7){pending.current=null;return;}
   // Prepare optional guitar audio before the clock starts, just like preview
   // playback. Cold PCM generation must not make the first note lag the cursor.
   const preparedVoiceTimeline=optionalSound&&voiceSettings.current.sound&&['clean-guitar','bass'].includes(instrument)?guitarVoiceTimeline(score,bpm,route):null;
   const voices=preparedVoiceTimeline?voicesFrom(preparedVoiceTimeline,offset):optionalSound?[]:voicesFrom(timeline,offset);
   if(instrument==='clean-guitar')voices.slice(0,6).forEach((voice,index)=>warmGuitarPhrase(ctx,voice,index));
   const clicks=practiceClicks(performedMeasures(score,timeline.order)).flatMap(c=>Array.from({length:metroOptions.clicksPerBeat??1},(_,i)=>({...c,tick:c.tick+i*1920/c.meter[1]/(metroOptions.clicksPerBeat??1),subdivisionIndex:i,downbeat:c.downbeat&&i===0}))).map(c=>({...c,time:c.tick*60/bpm/480}));
   const leadIn=practiceCountIn(practice&&countIn&&!from.resume,slotAtTick(slots,offset*480*bpm/60%cycleTicks)?.meter??score.meter,bpm);
   const clock=await metro.start({clicks,leadIn,beatOffset:(offset*480*bpm/60%capacity)/(1920/score.meter[1]),durationSeconds:totalDuration-offset,cycleSeconds:timeline.duration,cycleOffset:offset,repeatCount:repeats,onScheduledStart:from.onScheduledStart});if(request!==token.current||!clock)return;
   const s={ctx,instrument,piano,route,slots,soundReady:!optionalSound||Boolean(preparedVoiceTimeline),voices,voiceTimeline:preparedVoiceTimeline,timeline,repeats,cycleTicks,voiceCycle:Math.floor(offset/timeline.duration),nextVoices:preparedVoiceTimeline?.voices??[],output:createScoreVoiceOutput(ctx),index:0,start:clock.origin-offset,timer:0,slot:null,isCountingIn:()=>Boolean(leadIn.duration&&ctx.currentTime<clock.origin),getTimelineTick:()=>Math.max(offset*480*bpm/60,(ctx.currentTime-(clock.origin-offset))*480*bpm/60)};s.getCycleTick=()=>Math.min(s.getTimelineTick(),Number.isFinite(repeats)?cycleTicks*repeats-1e-6:Infinity)%cycleTicks;s.output.setVolume(voiceSettings.current.volume);session.current=s;if(optionalSound&&!preparedVoiceTimeline)updateSound(s);pending.current=null;setPlaying(true);setError('');
   const tick=()=>{
    if(session.current!==s)return;
    while(s.soundReady){
     if(s.index>=s.voices.length){if(!s.nextVoices.length||s.voiceCycle+1>=repeats)break;s.voices=s.nextVoices;s.index=0;s.voiceCycle++;}
     if(s.voices[s.index].start+s.start+s.voiceCycle*timeline.duration>=ctx.currentTime+BACKING_TRANSPORT_LOOKAHEAD_SECONDS)break;
     const start=s.voices[s.index].start,group=[];
     while(s.index<s.voices.length&&Math.abs(s.voices[s.index].start-start)<1e-7)group.push(s.voices[s.index++]);
     if(s.soundReady)s.output.schedule(group,s.start+start+s.voiceCycle*timeline.duration,s.instrument,s.piano);
    }
    if(s.isCountingIn()){const beat=ctx.currentTime<clock.countInOrigin?-1:Math.min(leadIn.meter[0]-1,Math.floor((ctx.currentTime-clock.countInOrigin)/leadIn.step));setPulse(p=>p?.countingIn&&p.beat===beat?p:{beat,meter:leadIn.meter,countingIn:true});return;}
    const elapsed=ctx.currentTime-s.start,currentSlot=slotAtTick(slots,s.getCycleTick());
    if(practice&&currentSlot){const beat=ctx.currentTime<clock.origin?-1:Math.min(currentSlot.meter[0]-1,Math.floor((s.getCycleTick()-currentSlot.barStart)/(1920/currentSlot.meter[1])));setPulse(p=>!p?.countingIn&&p?.beat===beat&&p?.meter.join()===currentSlot.meter.join()?p:{beat,meter:currentSlot.meter,countingIn:false});}
    const cycle=Math.floor(s.getTimelineTick()/cycleTicks);
    if(currentSlot&&(currentSlot!==s.slot||cycle!==s.cycle)){s.slot=currentSlot;s.cycle=cycle;publish({...currentSlot,route,playing:true,getTimelineTick:s.getCycleTick,getCurrentSlot:()=>({...slotAtTick(slots,s.getCycleTick()),cycle:Math.floor(s.getTimelineTick()/cycleTicks)}),getBarTick:()=>Math.max(0,Math.min(currentSlot.capacity,s.getCycleTick()-currentSlot.barStart))});}
    if(elapsed>=totalDuration){clearInterval(s.timer);metro.stop();s.output.finish();trailing.current=s.output;session.current=null;setPlaying(false);setPulse(null);publish(null);}
   };
   s.timer=setInterval(tick,25);tick();
  }catch(e){setError(e.message);stop();}
 };
 // Sound changes replace only the voice output. Async preparation is versioned
 // independently from transport start/stop, so it cannot revive a stale session.
 const updateSound=s=>{
  const version=s.voiceVersion=(s.voiceVersion??0)+1,settings=voiceSettings.current;
  s.soundReady=false;s.voices=[];s.nextVoices=[];s.index=0;s.output.dispose();s.output=createScoreVoiceOutput(s.ctx);s.output.setVolume(settings.volume);
  if(settings.sound)prepareScoreInstrument(s.ctx,settings.instrument).then(buffer=>{
   if(session.current!==s||s.voiceVersion!==version)return;
   s.instrument=settings.instrument;s.piano=buffer;s.voiceTimeline??=guitarVoiceTimeline(score,bpm,s.route);const elapsed=s.getTimelineTick()*60/bpm/480;s.voiceCycle=Math.floor(elapsed/s.timeline.duration);s.voices=voicesFrom(s.voiceTimeline,elapsed%s.timeline.duration);s.nextVoices=s.voiceTimeline.voices;s.index=0;s.soundReady=true;
  }).catch(e=>{if(session.current===s&&s.voiceVersion===version)setError(e.message);});
 };
 useEffect(()=>{if(optionalSound&&session.current)updateSound(session.current);},[sound,drumAudio?.muted,instrument,optionalSound,metronomeOnly]);
 const pause=()=>{const s=session.current;if(!s)return;const timelineTick=s.getTimelineTick(),localTick=s.getCycleTick(),slot=slotAtTick(s.slots,localTick),route=s.route;stop();held.current={timelineTick,route,resume:true};publish({...slot,route,playing:false,getTimelineTick:()=>localTick,getBarTick:()=>localTick-slot.barStart});};
 const seek=from=>{if(disabled||!score)return;if(session.current)void play({...from,resume:true});else if(toolbar||practice){const route=playbackRoute(score,from),slots=playbackSlots(score,scoreTimeline(score,bpm,false,route).order),timelineTick=seekTick(slots,from),slot=slotAtTick(slots,timelineTick);held.current={...from};publish({...slot,route,playing:false,getTimelineTick:()=>timelineTick,getBarTick:()=>timelineTick-slot.barStart});}};
 if(controller)controller.current={seek,stop,pause,isPlaying:()=>Boolean(session.current||pending.current),resume:()=>void play(held.current??startAt)};
 if(practice){const props={countingIn:Boolean(playing&&pulse?.countingIn),fixedInstrument,beatAccents,onToggleAccent:index=>setBeatAccents(values=>({...values,[index]:(values[index]??(index===0))===true?false:(values[index]??(index===0))===false?'mute':true})),bpm,onBpm,meter:pulse?.meter??position?.meter??(score?measureMeters(score)[0]:[4,4]),beat:playing?pulse?.beat??-1:position?Math.floor(position.getBarTick()/(1920/position.meter[1])):-1,playing,paused:Boolean(position&&!playing),disabled:disabled||!score,onStart:options=>void play({...startAt,onScheduledStart:options?.onScheduledStart}),onStop:stop,onPause:pause,onResume:()=>void play(held.current??startAt),click:audible,onClickSound:()=>setAudible(v=>!v),sound,onSound:()=>setSound(v=>!v),instrument,onInstrument:setInstrument,error:error||metro.error};return renderPractice?renderPractice(props):<PracticeTransport {...props}/>;}
 if(toolbar){const controls=<><button aria-label={playing||position?translateUi("etudes.stopScorePlayback"):translateUi("etudes.listenToScore")} type="button" disabled={disabled||!score} aria-pressed={playing} onClick={()=>playing||position?stop():void play()}>{playing||position?translateUi("etudes.stopScore"):translateUi("etudes.listenToScoreScorePlayback")}</button>{position&&<button type="button" onClick={()=>playing?pause():void play(held.current??startAt)}>{playing?translateUi("app.pause"):translateUi("etudes.resumePlayback")}</button>}<label><Translation id="etudes.soundScorePlayback" /><select aria-label={translateUi("etudes.scoreSoundScorePlayback")} value={instrument} onChange={e=>setInstrument(e.target.value)}>{timbres.map(([value,label])=><option key={value} value={value}>{localizeUi(label)}</option>)}</select></label><label><Translation id="etudes.playhead" /><PlaybackBarSelect disabled={disabled||!score} aria-label={translateUi("etudes.scorePlaybackBar")} bar={position?.bar??0} count={score?.measures.length??0} barLabel={translateUi("app.bar")} onChange={bar=>seek({bar,event:0})}/></label>{(error||metro.error)&&<p role="alert">{localizeUi(error||metro.error)}</p>}</>;return toolbarTarget?createPortal(controls,toolbarTarget):null;}
 if(dock)return <EditorAudioDock drumAudio={drumAudio} fixedInstrument={fixedInstrument} compact={compact} sound={sound} onSound={()=>setSound(v=>!v)} playing={playing} disabled={disabled||!score} onPlay={()=>playing?stop():void play()} bpm={bpm} onBpm={onBpm} audible={audible} onAudible={()=>setAudible(v=>!v)} status={playing&&position?translateUi("etudes.barValue1BeatValue2", { value1: position.bar+1, value2: Math.floor(score.measures[position.bar][position.event].onset/(1920/score.meter[1]))+1 }):translateUi("app.ready")} error={error||metro.error}/>;
 return <><div className="etudeSoundControls" role="group" aria-label={translateUi("app.sound")}><span><Translation id="app.sound" /></span>{timbres.map(([value,label])=><button type="button" key={value} aria-pressed={instrument===value} onClick={()=>setInstrument(value)}>{localizeUi(label)}</button>)}</div><div className={`etudeScorePlayback ${compact?'is-compact':''}`}><button type="button" disabled={disabled||!score} aria-label={compact?translateUi("etudes.stopScorePlayback"):playing?translateUi("etudes.stopScorePlayback"):translateUi("etudes.listenToScorePitchAndRhythm")} aria-pressed={playing} onClick={()=>playing?stop():void play()}>{compact?(playing?'■':'▶'):(playing?translateUi("etudes.stopScorePlayback"):translateUi("etudes.listenToScorePitchAndRhythm"))}</button>{compact?<><label><Translation id="originalUi.bpm" /><input aria-label={translateUi("etudes.scorePlaybackBpm")} type="number" min="30" max="240" value={bpm} onChange={e=>onBpm?.(Math.max(30,Math.min(240,Number(e.target.value)||60)))}/></label><div className="mobilePlaybackStatus"><span className="mobileBeatPosition">{playing&&position?translateUi("etudes.barValue1BeatValue2", { value1: position.bar+1, value2: Math.floor(score.measures[position.bar][position.event].onset/(1920/score.meter[1]))+1 }):translateUi("app.ready")}</span><button type="button" className="mobileMetro" aria-label={translateUi("etudes.clickSound")} title={audible?translateUi("etudes.turnClickOff"):translateUi("etudes.turnClickOn")} aria-pressed={audible} onClick={()=>setAudible(value=>!value)}>{audible?<Volume2 size={20} aria-hidden="true"/>:<VolumeX size={20} aria-hidden="true"/>}</button></div></>:<small>{instrument==='drums'?translateUi("etudes.drumsSynthesized"):instrument==='bass'?translateUi("tuner.bass"):instrument==='piano'?translateUi("etudes.pianoReferenceSound"):translateUi("etudes.cleanGuitarPluckedStringModel")}</small>}{(error||metro.error)&&<p role="alert">{localizeUi(error||metro.error)}</p>}</div></>;
}

