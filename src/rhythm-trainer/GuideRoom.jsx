import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import RhythmScore from './RhythmScore.jsx';
import {GUIDE_METERS,GUIDE_FAMILIES,meterInfo,guidePatterns,compileGuide,GuideTransport} from './guideModel.js';
import {clone} from './model.js';
import {getSharedAudioContext,getAudioBusInput,AUDIO_BUS_IDS} from '../audio/audioBus.js';
import {prepareBeatSounds} from './beatSounds.js';
import {METRONOME_TONE_OPTIONS} from '../metronome/options.js';
import './guideRoom.css';
const actions={hit:['●','치기'],hold:['—','앞 음 유지'],rest:['×','쉼']};
export default function GuideRoom({initialPack,initialTone,initialBpm,mobile,stemDirection,beatSound,onBeatSound,onClose}){
 const [meter,setMeter]=useState(`${initialPack?.meter||4}/4`);
 const [selected,setSelected]=useState(()=>initialPack?{id:'pack-core',family:'pack',title:initialPack.title+' · 핵심 패턴',groups:clone(initialPack.core||initialPack.measures[0])}:guidePatterns('4/4')[3]);
 const [family,setFamily]=useState(initialPack?'pack':'sixteenth');
 const [bpm,setBpm]=useState(initialPack?.bpm||initialBpm||80),[tone,setTone]=useState(initialPack?.tone||initialTone||'wood');
 const [running,setRunning]=useState(false),[tick,setTick]=useState(0),[error,setError]=useState('');
 const engine=useRef(),request=useRef(0),root=useRef();
 const patterns=useMemo(()=>guidePatterns(meter),[meter]);
 const compiled=useMemo(()=>compileGuide(selected,meter),[selected,meter]);
 const local=((tick%compiled.total)+compiled.total)%compiled.total;
 function stop(){request.current++;engine.current?.pause();setRunning(false);}
 useEffect(()=>{const background=document.querySelector('.rt-workspace:not(.rt-guide)');const prior=background?.inert;const focus=document.activeElement;if(background)background.inert=true;root.current?.focus({preventScroll:true});return()=>{if(background)background.inert=prior;focus?.focus({preventScroll:true});request.current++;engine.current?.dispose();};},[]);
 useEffect(()=>{const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 function choose(pattern){stop();setTick(0);setSelected(pattern);}
 function changeMeter(next){stop();setTick(0);setMeter(next);setFamily('basic');setSelected(guidePatterns(next)[0]);}
 async function play(){if(running){stop();return;}const id=++request.current;try{const ctx=getSharedAudioContext();await ctx.resume();const buffers=await prepareBeatSounds(ctx,beatSound);if(id!==request.current)return;if(ctx.state!=='running')throw Error();engine.current?.dispose();engine.current=new GuideTransport(ctx,getAudioBusInput(AUDIO_BUS_IDS.SFX,ctx),(at,playing)=>{setTick(at);setRunning(playing);});engine.current.configureGuide(compiled,bpm,tone);engine.current.setBeatSound(beatSound,buffers);engine.current.start(false);setError('');}catch{setError('소리를 시작하지 못했습니다. 다시 눌러 주세요.');}}
 const info=meterInfo(meter);
 return createPortal(<section ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="리듬 가이드실" className={`rt-guide rt-workspace ${mobile?'rt-guide-mobile':'rt-guide-desktop'}`} onKeyDown={e=>{if(e.key==='Escape'){stop();onClose();}if(e.key==='Tab'){const elements=[...root.current.querySelectorAll('button,input,select')];if(e.shiftKey&&document.activeElement===elements[0]){e.preventDefault();elements.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===elements.at(-1)){e.preventDefault();elements[0].focus();}}}}>
 <header><div><strong>리듬 가이드실</strong><small>세고, 치고, 유지하는 순간</small></div><button aria-label="가이드실 닫기" onClick={()=>{stop();onClose();}}>×</button></header>
 <div className="rt-guide-body">
 <label className="rt-guide-meter">박자표 선택<select value={meter} onChange={e=>changeMeter(e.target.value)}>{GUIDE_METERS.map(m=><option key={m}>{m}</option>)}</select><span>{info.compound?`${Array(info.beats).fill(3).join('+')} · 큰 박 ${info.beats}개`:`4분음표 ${info.beats}박`}</span></label>
 <div className="rt-guide-select"><label>리듬 패턴 유형<select value={family} onChange={e=>{setFamily(e.target.value);const next=e.target.value==='pack'?{id:'pack-core',family:'pack',title:initialPack.title+' · 핵심 패턴',groups:clone(initialPack.core||initialPack.measures[0])}:patterns.find(p=>p.family===e.target.value);if(next)choose(next);}}>{initialPack&&meter===`${initialPack.meter}/4`&&<option value="pack">연습팩 핵심 패턴</option>}{GUIDE_FAMILIES.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
 <nav aria-label="리듬 패턴 선택">{(family==='pack'?[{id:'pack-core',family:'pack',title:initialPack.title+' · 핵심 패턴',groups:clone(initialPack.core||initialPack.measures[0])}]:patterns.filter(p=>p.family===family)).map(p=><button key={p.id} aria-pressed={selected.id===p.id} onClick={()=>choose(p)}>{p.title}</button>)}</nav></div>
 <div className="rt-guide-heading"><strong>{selected.title}</strong><small>{compiled.groups.length} {info.compound?'큰 박':'박'} 패턴 · 반복 듣기</small></div>
 <div className="rt-guide-legend">● 치기　— 앞 음 유지　× 쉼</div>
 <div className="rt-guide-score">
 {compiled.groups.map((group,i)=>{const active=running&&local>=group.at&&local<group.at+group.ticks;const ev=group.events.find(e=>local>=e.at&&local<e.at+e.ticks);const hit=group.cells.filter(c=>c.kind==='hit').map(c=>c.label).join(', '),hold=group.cells.filter(c=>c.kind==='hold').map(c=>c.label).join(', '),rest=group.cells.filter(c=>c.kind==='rest').map(c=>c.label).join(', ');return <article key={i} aria-label={`${i+1}${info.compound?' 큰':''}박 읽는 법`}>
 <small className="rt-guide-beat-label">{i+1}{info.compound?' 큰':''}박{group.notes.some(n=>n.tuplet)?` · ${group.notes.find(n=>n.tuplet).tuplet.count}등분 연음`:''}</small>
 <RhythmScore measures={[[group.notes]]} previousMeasure={i?[compiled.groups[i-1].notes]:undefined} meter={1} timeAligned cellTicks={group.step} stemDirection={stemDirection} label={`${i+1}박 가이드 악보`} position={active?{measure:0,tick:local-group.at,event:ev?{...ev,measure:0,at:ev.at-group.at}:null}:null}/>
 <div className="rt-guide-grid" role="table" aria-label={`${i+1}박 분할 표`} style={{gridTemplateColumns:`repeat(${group.cells.length},minmax(0,1fr))`}}>{group.cells.map((c,j)=><div role="columnheader" key={'label'+j} className={active&&local>=c.at&&local<c.at+c.ticks?'is-current':''}>{c.label}</div>)}{group.cells.map((c,j)=><div role="cell" key={j} data-action={c.kind} className={active&&local>=c.at&&local<c.at+c.ticks?'is-current':''}><b>{actions[c.kind][0]}</b><small>{actions[c.kind][1]}</small></div>)}</div>
 <p>{hit&&`${hit}에서 칩니다. `}{hold&&`${hold}에서는 앞 음을 유지합니다. `}{rest&&`${rest}에서는 쉽니다.`}</p>
 </article>;})}
 </div>
 </div>
 <footer className="rt-guide-controls"><div><label className="rt-guide-tempo">{info.compound?'점4분음표':'4분음표'} = <input aria-label="가이드 BPM" type="number" min="30" max="240" value={bpm} onChange={e=>{stop();setBpm(Math.max(30,Math.min(240,Number(e.target.value)||30)));}}/> BPM</label><label>치는 소리<select aria-label="가이드 치는 소리" value={tone} onChange={e=>{stop();setTone(e.target.value);}}><option value="wood">우드</option><option value="rim">림</option><option value="clap">손뼉</option></select></label></div>
 <label className="rt-guide-sound">박자 소리<select aria-label="가이드 박자 소리" value={beatSound} onChange={e=>{stop();onBeatSound(e.target.value);}}><option value="voice">원·투·쓰리·포</option>{METRONOME_TONE_OPTIONS.map(o=><option value={o.id} key={o.id}>{o.label}</option>)}</select></label>
 <button className="rt-primary" onClick={play}>{running?'Ⅱ 듣기 멈춤':'▶ 패턴 반복 듣기'}</button>{error&&<p role="alert">{error}</p>}
 </footer></section>,document.body);
}
