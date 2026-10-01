import {timeSignature} from './meter.js';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {GuideMobileScore,GuideDesktopScore} from './GuideScore.jsx';
import ProgressStyleSelect from './ProgressStyleSelect.jsx';
import {GUIDE_METERS,GUIDE_FAMILIES,meterInfo,guidePatterns,compileGuideBar,GuideTransport} from './guideModel.js';
import {clone} from './model.js';
import {getSharedAudioContext,getAudioBusInput,AUDIO_BUS_IDS} from '../audio/audioBus.js';
import {prepareBeatSounds} from './beatSounds.js';
import {BEAT_SOUND_OPTIONS} from './beatSoundOptions.js';
import './guideRoom.css';
import {useLanguage} from '../i18n/react.jsx';
import {GUIDE_FAMILY_EN,guidePatternTitle} from './guideLabels.js';
export default function GuideRoom({progressStyle,onProgressStyle,initialPack,initialTone,initialBpm,mobile,stemDirection,beatSound,onBeatSound,onClose}){
 const language=useLanguage();const t=(ko,en)=>language==='ko'?ko:en;
 const title=pattern=>guidePatternTitle(pattern,meter,language);
 const [meter,setMeter]=useState(timeSignature(initialPack||4));
 const [selected,setSelected]=useState(()=>initialPack?{id:'pack-core',family:'pack',title:initialPack.title+' · 핵심 패턴',groups:clone(initialPack.core||initialPack.measures[0])}:guidePatterns('4/4')[3]);
 const [family,setFamily]=useState(initialPack?'pack':'sixteenth');
 const [bpm,setBpm]=useState(initialPack?.bpm||initialBpm||80),[tone,setTone]=useState(initialPack?.tone||initialTone||'wood');
 const [audible,setAudible]=useState(false);const [running,setRunning]=useState(false),[tick,setTick]=useState(0),[error,setError]=useState('');
 const engine=useRef(),request=useRef(0),root=useRef();
 const patterns=useMemo(()=>guidePatterns(meter),[meter]);
 const compiled=useMemo(()=>compileGuideBar(selected,meter),[selected,meter]);
 const local=tick>=0&&tick<compiled.total?tick:((tick%compiled.total)+compiled.total)%compiled.total;
 function stop(){request.current++;engine.current?.pause();setRunning(false);}
 useEffect(()=>{setRunning(false);const background=document.querySelector('.rt-workspace:not(.rt-guide)');const prior=background?.inert;const focus=document.activeElement;if(background)background.inert=true;root.current?.focus({preventScroll:true});return()=>{if(background)background.inert=prior;focus?.focus({preventScroll:true});request.current++;engine.current?.dispose();engine.current=null;};},[]);
 useEffect(()=>{const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 function choose(pattern){stop();setTick(0);setSelected(pattern);}
 function changeMeter(next){stop();setTick(0);setMeter(next);setFamily('basic');setSelected(guidePatterns(next)[0]);}
 async function play(){if(running){stop();return;}const id=++request.current;try{const ctx=getSharedAudioContext();await ctx.resume();const buffers=await prepareBeatSounds(ctx,beatSound);if(id!==request.current)return;if(ctx.state!=='running')throw Error();engine.current?.dispose();engine.current=new GuideTransport(ctx,getAudioBusInput(AUDIO_BUS_IDS.SFX,ctx),(at,playing,heard=true)=>{setTick(at);setRunning(playing);setAudible(heard);});engine.current.configureGuide(compiled,bpm,tone);engine.current.setBeatSound(beatSound,buffers);engine.current.start(false);root.current?.querySelector('.rt-guide-score')?.scrollIntoView({block:'nearest',behavior:'smooth'});setError('');}catch{setError(t('소리를 시작하지 못했습니다. 다시 눌러 주세요.','Could not start audio. Please try again.'));}}
 const info=meterInfo(meter);
 return createPortal(<section ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t("리듬 가이드실","Rhythm guide")} className={`rt-guide rt-workspace ${mobile?'rt-guide-mobile':'rt-guide-desktop'}`} onKeyDown={e=>{if(e.key==='Escape'){stop();onClose();}if(e.key==='Tab'){const elements=[...root.current.querySelectorAll('button,input,select')];if(e.shiftKey&&document.activeElement===elements[0]){e.preventDefault();elements.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===elements.at(-1)){e.preventDefault();elements[0].focus();}}}}>
 <header><div><strong>{t("리듬 가이드실","Rhythm guide")}</strong><small>{t("세고, 치고, 유지하는 순간","When to count, play and hold")}</small></div><button aria-label={t("가이드실 닫기","Close rhythm guide")} onClick={()=>{stop();onClose();}}>×</button></header>
 <div className="rt-guide-body">
 <label className="rt-guide-meter">{t("박자표 선택","Time signature")}<select value={meter} onChange={e=>changeMeter(e.target.value)}>{GUIDE_METERS.map(m=><option key={m}>{m}</option>)}</select><span>{info.compound?t(`${Array(info.beats).fill(3).join('+')} · 큰 박 ${info.beats}개`,`${Array(info.beats).fill(3).join('+')} · ${info.beats} main beats`):t(`4분음표 ${info.beats}박`,`${info.beats} quarter-note beats`)}</span></label>
 <div className="rt-guide-select"><label>{t("리듬 패턴 유형","Pattern family")}<select value={family} onChange={e=>{setFamily(e.target.value);const next=e.target.value==='pack'?{id:'pack-core',family:'pack',title:initialPack.title+' · 핵심 패턴',groups:clone(initialPack.core||initialPack.measures[0])}:patterns.find(p=>p.family===e.target.value);if(next)choose(next);}}>{initialPack&&meter===timeSignature(initialPack)&&<option value="pack">{t("연습팩 핵심 패턴","Practice pack core pattern")}</option>}{GUIDE_FAMILIES.map(([id,name])=><option key={id} value={id}>{language==='ko'?name:GUIDE_FAMILY_EN[id]}</option>)}</select></label>
 <nav aria-label={t("리듬 패턴 선택","Choose a rhythm pattern")}>{(family==='pack'?[{id:'pack-core',family:'pack',title:initialPack.title+' · 핵심 패턴',groups:clone(initialPack.core||initialPack.measures[0])}]:patterns.filter(p=>p.family===family)).map(p=><button key={p.id} aria-pressed={selected.id===p.id} onClick={()=>choose(p)}>{title(p)}</button>)}</nav></div>
 <div className="rt-guide-heading">{!mobile&&<strong>{title(selected)}</strong>}<small>{t(`한 마디 · ${compiled.groups.length}${info.compound?' 큰 박':'박'} · 반복 듣기`,`One bar · ${compiled.groups.length} ${info.compound?'main beats':'beats'} · loop playback`)}</small></div>
 <div className="rt-guide-legend">{t("● 치기　× 뮤트　— 유지　· 쉼","● Play　× Mute　— Hold　· Rest")}</div>
 {mobile?<GuideMobileScore compiled={compiled} playing={running&&audible} tick={local} progressStyle={progressStyle} stemDirection={stemDirection} language={language}/>:<GuideDesktopScore compiled={compiled} playing={running&&audible} tick={local} progressStyle={progressStyle} stemDirection={stemDirection} language={language}/>}
 <p className="rt-guide-explanation">{t("음표 아래 카운트에 맞춰 칩니다. ●는 치기, ×는 뮤트 타격, —는 앞 음 유지, ·는 쉼입니다.","Play on the count under each note. ● Play, × muted hit, — hold, · rest.")}</p>
 </div>
 <footer className="rt-guide-controls"><ProgressStyleSelect value={progressStyle} onChange={onProgressStyle}/><div><label className="rt-guide-tempo">{info.compound?t('점4분음표','Dotted quarter'):t('4분음표','Quarter')} = <input aria-label={t("가이드 BPM","Guide BPM")} type="number" min="30" max="240" value={bpm} onChange={e=>{stop();setBpm(Math.max(30,Math.min(240,Number(e.target.value)||30)));}}/> BPM</label><label>{t("치는 소리","Hit sound")}<select aria-label={t("가이드 치는 소리","Guide hit sound")} value={tone} onChange={e=>{stop();setTone(e.target.value);}}><option value="wood">{t("우드","Wood")}</option><option value="rim">{t("림","Rim")}</option><option value="clap">{t("손뼉","Clap")}</option></select></label></div>
 <label className="rt-guide-sound">{t("박자 소리","Beat sound")}<select aria-label={t("가이드 박자 소리","Guide beat sound")} value={beatSound} onChange={e=>{stop();onBeatSound(e.target.value);}}>{BEAT_SOUND_OPTIONS.map(o=><option key={o.id} value={o.id}>{t(o.ko,o.en)}</option>)}</select></label>
 <button className="rt-primary" onClick={play}>{running?t('Ⅱ 듣기 멈춤','Ⅱ Stop listening'):t('▶ 패턴 반복 듣기','▶ Loop pattern')}</button>{error&&<p role="alert">{error}</p>}
 </footer></section>,document.body);
}
