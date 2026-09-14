import {useEffect,useRef,useState} from 'react';
import {resumeSharedAudioContext,getAudioBusInput,AUDIO_BUS_IDS} from '../audio/audioBus.js';
import {scoreTimeline} from './scorePlayback.js';
export default function ScorePlayback({score,bpm=score?.bpm,disabled=false}) {
 const session=useRef(null),token=useRef(0),[playing,setPlaying]=useState(false),[error,setError]=useState('');
 const stop=()=>{token.current++;const s=session.current;if(s){clearInterval(s.timer);s.nodes.forEach(n=>{try{n.stop();}catch{}});s.gain.disconnect();session.current=null;}setPlaying(false);};
 useEffect(()=>{stop();return stop;},[score,bpm,disabled]);
 const play=async()=>{stop();const request=token.current;try{const ctx=await resumeSharedAudioContext();if(request!==token.current)return;if(!ctx||ctx.state!=='running')throw Error('오디오를 시작할 수 없습니다.');const timeline=scoreTimeline(score,bpm),gain=ctx.createGain();gain.gain.value=.17;gain.connect(getAudioBusInput(AUDIO_BUS_IDS.INSTRUMENT,ctx));const s={gain,nodes:new Set(),index:0,start:ctx.currentTime+.06,timer:0};session.current=s;setPlaying(true);setError('');
 const tick=()=>{if(session.current!==s)return;while(s.index<timeline.events.length&&timeline.events[s.index].start+s.start<ctx.currentTime+.12){const e=timeline.events[s.index++],at=s.start+e.start,o=ctx.createOscillator(),env=ctx.createGain();o.type='triangle';o.frequency.value=440*2**((e.midi-69)/12);env.gain.setValueAtTime(0.001,at);env.gain.linearRampToValueAtTime(.7,at+.005);env.gain.exponentialRampToValueAtTime(.001,at+Math.max(.02,e.duration*.94));o.connect(env);env.connect(gain);o.start(at);o.stop(at+e.duration);s.nodes.add(o);o.onended=()=>{s.nodes.delete(o);o.disconnect();env.disconnect();};}if(ctx.currentTime>s.start+timeline.duration+.1)stop();};s.timer=setInterval(tick,25);tick();
 }catch(e){setError(e.message);stop();}};
 return <div className="etudeScorePlayback"><button type="button" disabled={disabled||!score} aria-pressed={playing} onClick={playing?stop:play}>{playing?'악보 재생 정지':'악보 음정·리듬 듣기'}</button><small>합성음 확인 · H/P/SL의 실제 기타 음색·잔향 표현은 재현하지 않습니다.</small>{error&&<p role="alert">{error}</p>}</div>;
}
