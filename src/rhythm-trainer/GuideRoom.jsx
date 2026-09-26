import {timeSignature} from './meter.js';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import RhythmScore from './RhythmScore.jsx';
import ProgressStyleSelect from './ProgressStyleSelect.jsx';
import {GUIDE_METERS,GUIDE_FAMILIES,meterInfo,guidePatterns,compileGuide,GuideTransport} from './guideModel.js';
import {clone} from './model.js';
import {getSharedAudioContext,getAudioBusInput,AUDIO_BUS_IDS} from '../audio/audioBus.js';
import {prepareBeatSounds} from './beatSounds.js';
import {METRONOME_TONE_OPTIONS} from '../metronome/options.js';
import './guideRoom.css';
import {useLanguage} from '../i18n/react.jsx';
import {localizeUi} from '../i18n/core.js';
import {GUIDE_FAMILY_EN,guidePatternTitle} from './guideLabels.js';
const actions={hit:['●','치기'],hold:['—','앞 음 유지'],rest:['×','쉼']};
export default function GuideRoom({progressStyle,onProgressStyle,initialPack,initialTone,initialBpm,mobile,stemDirection,beatSound,onBeatSound,onClose}){
 const language=useLanguage();const t=(ko,en)=>language==='ko'?ko:en;
 const title=pattern=>guidePatternTitle(pattern,meter,language);
 const [meter,setMeter]=useState(timeSignature(initialPack||4));
 const [selected,setSelected]=useState(()=>initialPack?{id:'pack-core',family:'pack',title:initialPack.title+' · 핵심 패턴',groups:clone(initialPack.core||initialPack.measures[0])}:guidePatterns('4/4')[3]);
 const [family,setFamily]=useState(initialPack?'pack':'sixteenth');
 const [bpm,setBpm]=useState(initialPack?.bpm||initialBpm||80),[tone,setTone]=useState(initialPack?.tone||initialTone||'wood');
 const [running,setRunning]=useState(false),[tick,setTick]=useState(0),[error,setError]=useState('');
 const engine=useRef(),request=useRef(0),root=useRef();
 const patterns=useMemo(()=>guidePatterns(meter),[meter]);
 const compiled=useMemo(()=>compileGuide(selected,meter),[selected,meter]);
 const local=((tick%compiled.total)+compiled.total)%compiled.total;
 function stop(){request.current++;engine.current?.pause();setRunning(false);}
 useEffect(()=>{setRunning(false);const background=document.querySelector('.rt-workspace:not(.rt-guide)');const prior=background?.inert;const focus=document.activeElement;if(background)background.inert=true;root.current?.focus({preventScroll:true});return()=>{if(background)background.inert=prior;focus?.focus({preventScroll:true});request.current++;engine.current?.dispose();engine.current=null;};},[]);
 useEffect(()=>{const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 function choose(pattern){stop();setTick(0);setSelected(pattern);}
 function changeMeter(next){stop();setTick(0);setMeter(next);setFamily('basic');setSelected(guidePatterns(next)[0]);}
 async function play(){if(running){stop();return;}const id=++request.current;try{const ctx=getSharedAudioContext();await ctx.resume();const buffers=await prepareBeatSounds(ctx,beatSound);if(id!==request.current)return;if(ctx.state!=='running')throw Error();engine.current?.dispose();engine.current=new GuideTransport(ctx,getAudioBusInput(AUDIO_BUS_IDS.SFX,ctx),(at,playing)=>{setTick(at);setRunning(playing);});engine.current.configureGuide(compiled,bpm,tone);engine.current.setBeatSound(beatSound,buffers);engine.current.start(false);setError('');}catch{setError(t('소리를 시작하지 못했습니다. 다시 눌러 주세요.','Could not start audio. Please try again.'));}}
 const info=meterInfo(meter);
 return createPortal(<section ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t("리듬 가이드실","Rhythm guide")} className={`rt-guide rt-workspace ${mobile?'rt-guide-mobile':'rt-guide-desktop'}`} onKeyDown={e=>{if(e.key==='Escape'){stop();onClose();}if(e.key==='Tab'){const elements=[...root.current.querySelectorAll('button,input,select')];if(e.shiftKey&&document.activeElement===elements[0]){e.preventDefault();elements.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===elements.at(-1)){e.preventDefault();elements[0].focus();}}}}>
 <header><div><strong>{t("리듬 가이드실","Rhythm guide")}</strong><small>{t("세고, 치고, 유지하는 순간","When to count, play and hold")}</small></div><button aria-label={t("가이드실 닫기","Close rhythm guide")} onClick={()=>{stop();onClose();}}>×</button></header>
 <div className="rt-guide-body">
 <label className="rt-guide-meter">{t("박자표 선택","Time signature")}<select value={meter} onChange={e=>changeMeter(e.target.value)}>{GUIDE_METERS.map(m=><option key={m}>{m}</option>)}</select><span>{info.compound?t(`${Array(info.beats).fill(3).join('+')} · 큰 박 ${info.beats}개`,`${Array(info.beats).fill(3).join('+')} · ${info.beats} main beats`):t(`4분음표 ${info.beats}박`,`${info.beats} quarter-note beats`)}</span></label>
 <div className="rt-guide-select"><label>{t("리듬 패턴 유형","Pattern family")}<select value={family} onChange={e=>{setFamily(e.target.value);const next=e.target.value==='pack'?{id:'pack-core',family:'pack',title:initialPack.title+' · 핵심 패턴',groups:clone(initialPack.core||initialPack.measures[0])}:patterns.find(p=>p.family===e.target.value);if(next)choose(next);}}>{initialPack&&meter===timeSignature(initialPack)&&<option value="pack">{t("연습팩 핵심 패턴","Practice pack core pattern")}</option>}{GUIDE_FAMILIES.map(([id,name])=><option key={id} value={id}>{language==='ko'?name:GUIDE_FAMILY_EN[id]}</option>)}</select></label>
 <nav aria-label={t("리듬 패턴 선택","Choose a rhythm pattern")}>{(family==='pack'?[{id:'pack-core',family:'pack',title:initialPack.title+' · 핵심 패턴',groups:clone(initialPack.core||initialPack.measures[0])}]:patterns.filter(p=>p.family===family)).map(p=><button key={p.id} aria-pressed={selected.id===p.id} onClick={()=>choose(p)}>{title(p)}</button>)}</nav></div>
 <div className="rt-guide-heading"><strong>{title(selected)}</strong><small>{t(`${compiled.groups.length} ${info.compound?'큰 박':'박'} 패턴 · 반복 듣기`,`${compiled.groups.length} ${info.compound?(compiled.groups.length===1?'main beat':'main beats'):(compiled.groups.length===1?'beat':'beats')} · loop playback`)}</small></div>
 <div className="rt-guide-legend">{t("● 치기　— 앞 음 유지　× 쉼","● Play　— Hold previous note　× Rest")}</div>
 <div className="rt-guide-score">
 {compiled.groups.map((group,i)=>{const active=running&&local>=group.at&&local<group.at+group.ticks;const ev=group.events.find(e=>local>=e.at&&local<e.at+e.ticks);const hit=group.cells.filter(c=>c.kind==='hit').map(c=>c.label).join(', '),hold=group.cells.filter(c=>c.kind==='hold').map(c=>c.label).join(', '),rest=group.cells.filter(c=>c.kind==='rest').map(c=>c.label).join(', ');return <article key={i} aria-label={t(`${i+1}${info.compound?' 큰':''}박 읽는 법`,`How to read ${info.compound?'main ':''}beat ${i+1}`)}>
 <small className="rt-guide-beat-label">{t(`${i+1}${info.compound?' 큰':''}박`,`${info.compound?'Main beat':'Beat'} ${i+1}`)}{group.notes.some(n=>n.tuplet)?t(` · ${group.notes.find(n=>n.tuplet).tuplet.count}등분 연음`,` · ${group.notes.find(n=>n.tuplet).tuplet.count}-note tuplet`):''}</small>
 <RhythmScore progressStyle={progressStyle} measures={[[group.notes]]} previousMeasure={i?[compiled.groups[i-1].notes]:undefined} meter={1} timeAligned cellTicks={group.step} stemDirection={stemDirection} label={t(`${i+1}박 가이드 악보`,`Guide score for beat ${i+1}`)} position={active?{measure:0,tick:local-group.at,event:ev?{...ev,measure:0,at:ev.at-group.at}:null}:null}/>
 <div className="rt-guide-grid" role="table" aria-label={t(`${i+1}박 분할 표`,`Subdivisions of beat ${i+1}`)} style={{gridTemplateColumns:`repeat(${group.cells.length},minmax(0,1fr))`}}>{group.cells.map((c,j)=><div role="columnheader" key={'label'+j} className={active&&local>=c.at&&local<c.at+c.ticks?'is-current':''}>{c.label}</div>)}{group.cells.map((c,j)=><div role="cell" key={j} data-action={c.kind} className={active&&local>=c.at&&local<c.at+c.ticks?'is-current':''}><b>{actions[c.kind][0]}</b><small>{t(actions[c.kind][1],{hit:'Play',hold:'Hold',rest:'Rest'}[c.kind])}</small></div>)}</div>
 <p>{hit&&t(`${hit}에서 칩니다. `,`Play on ${hit}. `)}{hold&&t(`${hold}에서는 앞 음을 유지합니다. `,`Hold on ${hold}. `)}{rest&&t(`${rest}에서는 쉽니다.`,`Rest on ${rest}.`)}</p>
 </article>;})}
 </div>
 </div>
 <footer className="rt-guide-controls"><ProgressStyleSelect value={progressStyle} onChange={onProgressStyle}/><div><label className="rt-guide-tempo">{info.compound?t('점4분음표','Dotted quarter'):t('4분음표','Quarter')} = <input aria-label={t("가이드 BPM","Guide BPM")} type="number" min="30" max="240" value={bpm} onChange={e=>{stop();setBpm(Math.max(30,Math.min(240,Number(e.target.value)||30)));}}/> BPM</label><label>{t("치는 소리","Hit sound")}<select aria-label={t("가이드 치는 소리","Guide hit sound")} value={tone} onChange={e=>{stop();setTone(e.target.value);}}><option value="wood">{t("우드","Wood")}</option><option value="rim">{t("림","Rim")}</option><option value="clap">{t("손뼉","Clap")}</option></select></label></div>
 <label className="rt-guide-sound">{t("박자 소리","Beat sound")}<select aria-label={t("가이드 박자 소리","Guide beat sound")} value={beatSound} onChange={e=>{stop();onBeatSound(e.target.value);}}><option value="voice">{t("원·투·쓰리·포","One · two · three · four")}</option>{METRONOME_TONE_OPTIONS.map(o=><option value={o.id} key={o.id}>{localizeUi(o.label)}</option>)}</select></label>
 <button className="rt-primary" onClick={play}>{running?t('Ⅱ 듣기 멈춤','Ⅱ Stop listening'):t('▶ 패턴 반복 듣기','▶ Loop pattern')}</button>{error&&<p role="alert">{error}</p>}
 </footer></section>,document.body);
}
