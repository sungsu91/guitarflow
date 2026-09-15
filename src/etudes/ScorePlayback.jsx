import {useEffect,useRef,useState} from 'react';
import {getAudioBusInput,AUDIO_BUS_IDS} from '../audio/audioBus.js';
import {guitarVoiceTimeline,voicesFrom} from './scorePlayback.js';
import {scheduleGuitarPhrase} from '../audio/fretboardPreviewEngine.js';
import useEtudeMetronome from './useEtudeMetronome.js';
export default function ScorePlayback({score,bpm=score?.bpm,disabled=false,compact=false,onPosition,controller,startAt={bar:0,event:0},onBpm}) {
 const session=useRef(null),token=useRef(0),notify=useRef(onPosition),[playing,setPlaying]=useState(false),[error,setError]=useState(''),[audible,setAudible]=useState(false),[position,setPosition]=useState(null);notify.current=onPosition;
 const metro=useEtudeMetronome(bpm??60,{beatsPerBar:score?.meter?.[0]??4,beatUnit:score?.meter?.[1]??4,audible});
 const stop=()=>{token.current++;metro.stop();const s=session.current;if(s){clearInterval(s.timer);s.nodes.forEach(n=>{try{n.stop();}catch{}});s.gain.disconnect();session.current=null;}setPlaying(false);setPosition(null);notify.current?.(null);};
 useEffect(()=>{stop();return stop;},[score,bpm,disabled]);
 const play=async(from=startAt)=>{stop();const request=token.current;try{const clock=await metro.start({beatOffset:(score.measures[from.bar]?.[from.event]?.onset??0)/(1920/score.meter[1])});if(request!==token.current||!clock)return;const ctx=clock.context,timeline=guitarVoiceTimeline(score,bpm),gain=ctx.createGain();gain.gain.value=.65;gain.connect(getAudioBusInput(AUDIO_BUS_IDS.INSTRUMENT,ctx));
 const capacity=score.meter[0]*1920/score.meter[1],offset=(from.bar*capacity+(score.measures[from.bar]?.[from.event]?.onset??0))/480*60/bpm;
 const voices=voicesFrom(timeline,offset);
 const slots=score.measures.flatMap((m,bar)=>m.map((e,event)=>({bar,event,start:(bar*capacity+e.onset)/480*60/bpm})));const s={gain,nodes:new Set(),index:0,start:clock.origin-offset,timer:0,slot:-1};session.current=s;setPlaying(true);setError('');
 const tick=()=>{if(session.current!==s)return;while(s.index<voices.length&&voices[s.index].start+s.start<ctx.currentTime+.12){
 const voice=voices[s.index++],at=Math.max(ctx.currentTime,s.start+voice.start);
 const source=scheduleGuitarPhrase(ctx,voice,at,gain);
 s.nodes.add(source);source.addEventListener('ended',()=>s.nodes.delete(source),{once:true});
 }
 const elapsed=ctx.currentTime-s.start;let i=slots.findLastIndex(e=>e.start<=elapsed);if(i>=0&&i!==s.slot){s.slot=i;const current={...slots[i],playing:true};setPosition(current);notify.current?.(current);}if(elapsed>timeline.duration+.1)stop();};s.timer=setInterval(tick,25);tick();
 }catch(e){setError(e.message);stop();}};
 if(controller)controller.current={seek:position=>{if(session.current)void play(position);},stop};
 return <div className={`etudeScorePlayback ${compact?'is-compact':''}`}><button type="button" disabled={disabled||!score} aria-label={compact?'악보 재생 정지':playing?'악보 재생 정지':'악보 음정·리듬 듣기'} aria-pressed={playing} onClick={()=>playing?stop():void play()}>{compact?(playing?'■':'▶'):(playing?'악보 재생 정지':'악보 음정·리듬 듣기')}</button>{compact?<><label>BPM<input aria-label="악보 재생 BPM" type="number" min="30" max="240" value={bpm} onChange={e=>onBpm?.(Math.max(30,Math.min(240,Number(e.target.value)||60)))}/></label><span className="mobileBeatPosition">{playing&&position?`${position.bar+1}마디 · ${score.measures[position.bar][position.event].onset/(1920/score.meter[1])+1}박`:'준비'}</span><label className="mobileMetro"><input type="checkbox" checked={audible} onChange={e=>setAudible(e.target.checked)}/>클릭</label></>:<small>기타 합성음 · H/P 연결, 슬라이드 피치 이동, 붙임줄 지속 재생</small>}{(error||metro.error)&&<p role="alert">{error||metro.error}</p>}</div>;
}
