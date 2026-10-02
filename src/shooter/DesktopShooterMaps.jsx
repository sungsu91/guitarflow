import {useState} from 'react';
import {useLanguage} from '../i18n/react.jsx';
import ShooterPitchMonitor from './ShooterPitchMonitor.jsx';
import MapVideoBackdrop from './MapVideoBackdrop.jsx';
import { DESKTOP_MAP_MOTION } from './mapMotionAssets.js';
import './desktop-maps.css';
import './desktop-scene.css';
import './desktop-skin-hologram.css';
const MAPS=[['01-moonlit-rooftop','달빛 옥상','Moonlit rooftop'],['02-cloud-sanctuary','구름 위 신전','Cloud sanctuary'],['03-aurora-lake','오로라 빙하 호수','Aurora lake'],['04-sunset-coast','노을빛 바다 절벽','Sunset coast'],['05-desert-observatory','별빛 사막 천문대','Desert observatory'],['06-underwater-blue','푸른 바닷속','Underwater Blue'],['07-firefly-forest','반딧불 숲','Firefly Forest']];
const KEY='fretiva-desktop-shooter-map-v1';
const source=id=>`${import.meta.env.BASE_URL}assets/shooter/desktop-maps/${id}.png`;
const videoSource=id=>DESKTOP_MAP_MOTION[id]?.videoSrc;
export function useDesktopShooterMap(){const [id,setId]=useState(()=>{try{const v=localStorage.getItem(KEY);return MAPS.some(m=>m[0]===v)?v:MAPS[0][0];}catch{return MAPS[0][0];}});return [id,value=>{setId(value);try{localStorage.setItem(KEY,value);}catch{}}];}
export function DesktopShooterMapGallery({mapId,onMap}){const lang=useLanguage();return <div className="desktopMapGallery">{MAPS.map(([id,ko,en])=><button type="button" key={id} aria-pressed={id===mapId} onClick={()=>onMap(id)}><img src={source(id)} alt="" loading="lazy"/><span>{lang==='ko'?ko:en}</span></button>)}</div>;}
export function DesktopShooterStartButton({onClick,label}) {
 const lang=useLanguage();
 return <button type="button" className="dsStartActionButton dsStartGameButton" aria-label={label} onClick={onClick}>
  {lang==='ko'?'시작':'Start'}
 </button>;
}
export function DesktopShooterSkinButton({open,onClick}) {
 const lang=useLanguage();
 return <button type="button" className="dsStartActionButton dsStartSkinButton" aria-expanded={open} onClick={onClick}>
  {lang==='ko'?'스킨 변경':'Change skin'}
 </button>;
}
export function DesktopShooterLives({lives,maxLives,label}) {
 return <div className="dsArenaLives" role="status" aria-label={label}>
  <span aria-hidden="true">LIFE</span>
  <div className="dsHearts" aria-hidden="true">
   {Array.from({length:maxLives},(_,index)=><i key={index} className={index<lives?'active':''}>♥</i>)}
  </div>
 </div>;
}
export default function DesktopShooterMaps({mapId,videoSrc,pitch,reason,micStatus,micActive,best,score,combo,target,difficulty,difficultyDisabled,difficultyOptions,onDifficulty,onSkin,onPause,onMic,playing,paused,skinOpen,hintMessage,hint,onHint,solfege,onSolfege,recordingEntryRef}){
 const lang=useLanguage(),t=(ko,en)=>lang==='ko'?ko:en;
 return <div className="desktopShooterMaps">
  <MapVideoBackdrop posterSrc={DESKTOP_MAP_MOTION[mapId]?.posterSrc??source(mapId)} videoSrc={videoSrc??videoSource(mapId)} paused={paused||skinOpen}/>
  <header className="dsHeader"><div><h1>{t('슈팅게임','Note shooter')}</h1><small>FRETIVA LAB · PLAY YOUR NOTE</small></div><div className="dsHeaderActions"><div className="dsRecordingEntry" ref={recordingEntryRef} /><button type="button" disabled={!playing&&!paused} onClick={onPause}>{paused?t('계속하기','Resume'):t('일시정지','Pause')}</button><button type="button" aria-pressed={micActive} onClick={onMic}>{t('마이크','Microphone')} · {micActive?'ON':'OFF'}</button></div></header>
  {!skinOpen&&<aside className="dsInput"><small>LIVE INPUT</small><ShooterPitchMonitor embedded pitch={pitch} reason={reason} micStatus={micStatus} active={micActive}/><p>{t('목표 음을 연주해 보세요','Play the target note')}</p></aside>}
  <div className="dsTarget"><span>{t('목표 음','Target note')}</span><strong>{target||t('대기','Ready')}</strong>{hint>0&&<small className="dsHint">{hintMessage}</small>}</div>
  <aside className="dsSession"><small>SESSION</small><span>{t('최고 기록','Best score')}</span><strong className="dsBest">{best.toLocaleString()}</strong><dl><div><dt>{t('점수','Score')}</dt><dd>{score.toLocaleString()}</dd></div><div><dt>{t('콤보','Combo')}</dt><dd>{combo}</dd></div></dl><h2>{t('게임 설정','Game settings')}</h2><label>{t('난이도','Difficulty')}<select disabled={difficultyDisabled} value={difficulty} onChange={e=>onDifficulty(e.target.value)}>{difficultyOptions.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label><label>{t('연주 힌트','Hints')}<select value={hint} onChange={e=>onHint(Number(e.target.value))}><option value={0}>OFF</option><option value={1}>1</option><option value={2}>2</option></select></label><button type="button" aria-pressed={solfege} onClick={onSolfege}>{t('계이름 표시','Solfege')} · {solfege?'ON':'OFF'}</button><button type="button" aria-expanded={skinOpen} onClick={onSkin}>{t('스킨 변경','Change skin')} <span>›</span></button></aside>
 </div>;
}
