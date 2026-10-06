import SharedBpmControls from '../components/SharedBpmControls.jsx';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Play,Pause,Square,Music2,Volume2,VolumeX,Settings2,ChevronDown,ChevronUp,Plus,Minus} from 'lucide-react';
import {useLanguage} from '../i18n/react.jsx';
import {t,localizeUi} from '../i18n/core.js';
import ko from '../i18n/locales/ko.js';
import BackingLoop from '../components/BackingLoop.jsx';
import MetronomeSettingsPanel from '../components/MetronomeSettingsPanel.jsx';
import MetronomeVolumeControl from '../components/MetronomeVolumeControl.jsx';
import PracticeBeatDots from './PracticeBeatDots.jsx';
import PracticePopover from './PracticePopover.jsx';
import FollowPatternControl from './FollowPatternControl.jsx';
import {TIME_SIGNATURE_OPTIONS,METRONOME_TONE_OPTIONS} from '../metronome/options.js';
import {METRONOME_SUBDIVISION_OPTIONS} from '../metronome/subdivision.js';
import './desktopPracticeDock.css';

// A presentation of the existing session, never a second audio transport.
export default function DesktopPracticeDock({model,controls}){
 return <BackingLoop embedded hideNotice mobile={false} desktopPresentation="standalone" ownerMode="etudes"
  renderSurface={(backing,content)=><DockSurface model={model} controls={controls} backing={backing} backingContent={content}/>}/>;
}

function DockSurface({model,controls:c,backing,backingContent}){
 const language=useLanguage(),korean=language==='ko';
 const folded=false;
 const [popup,setPopup]=useState(null),[syncPlayback,setSyncPlayback]=useState(false);
 const syncPending=useRef(false),syncOwned=useRef(false),syncRequest=useRef(0),wasPlaying=useRef(false);
 const [syncBusy,setSyncBusy]=useState(false),[syncError,setSyncError]=useState('');
 const settingsRef=useRef(null),volumeRef=useRef(null),bpmRef=useRef(null),taps=useRef([]);
 const backingOpen=Boolean(model.backingOpen||backing.isPlaying||backing.isRecording);
 const anchor=popup==='settings'?settingsRef:popup==='volume'?volumeRef:bpmRef;
 const close=useCallback(focus=>{setPopup(null);if(focus)anchor.current?.focus({preventScroll:true});},[anchor]);
 const changeBpm=value=>c.onBpm(Math.min(240,Math.max(30,Math.round(Number(value)||30))));
 const tap=()=>{
  const now=performance.now();taps.current=[...taps.current.filter(time=>now-time<2200),now].slice(-6);
  if(taps.current.length<2)return;
  const interval=(now-taps.current[0])/(taps.current.length-1);
  if(Number.isFinite(interval)&&interval>0)changeBpm(60000/interval);
 };

 const toggleBacking=()=>{
  if(backingOpen){syncRequest.current++;setSyncBusy(false);syncOwned.current=false;setSyncPlayback(false);if(backing.isPlaying)backing.togglePlayerPlayback();backing.closeDialog();model.setBackingOpen(false);}
  else{model.setBackingOpen(true);}
 };
 const pauseTogether=()=>{syncPending.current=false;if(syncOwned.current){backing.pausePlayback();}c.onPause();};
 const stopTogether=()=>{syncRequest.current++;setSyncBusy(false);setSyncPlayback(false);syncPending.current=false;if(syncOwned.current){backing.stopPlayback();syncOwned.current=false;}c.onStop();};
 const startTogether=()=>{syncOwned.current=false;if(c.paused)c.onResume();else c.onStart();};
 const playTogether=async()=>{
  if(syncBusy)return;
  if(syncOwned.current&&c.playing){stopTogether();setSyncPlayback(false);return;}
  const request=++syncRequest.current;setSyncBusy(true);setSyncError('');c.onStop();
  try{
   const schedule=await backing.prepareSynchronizedPlayback();
   if(request!==syncRequest.current)return;
   syncOwned.current=true;setSyncPlayback(true);
   c.onStart({onScheduledStart:schedule});
  }catch(error){syncOwned.current=false;setSyncPlayback(false);setSyncError(error.message);}
  finally{if(request===syncRequest.current)setSyncBusy(false);}
 };
 useEffect(()=>{if(c.error&&syncOwned.current){backing.stopPlayback();syncOwned.current=false;setSyncPlayback(false);}},[c.error,backing]);
 useEffect(()=>{if(wasPlaying.current&&!c.playing&&!c.paused&&syncOwned.current){backing.stopPlayback();syncOwned.current=false;setSyncPlayback(false);}wasPlaying.current=c.playing;},[c.playing,c.paused,backing]);
 useEffect(()=>()=>{syncRequest.current++;if(syncOwned.current)backing.stopPlayback();},[]);
 const play=<button type="button" className="desktopDockPlay" aria-label={c.playing?t('app.pause'):c.paused?t('etudes.resumePractice'):t('app.startPractice')} aria-pressed={c.playing} disabled={c.disabled} onClick={c.playing?pauseTogether:startTogether}>{c.playing?<Pause size={20}/>:<Play size={20}/>}</button>;
 const stop=<button type="button" className="desktopDockIcon" aria-label={t('app.stopApp')} disabled={!c.playing&&!c.paused} onClick={stopTogether}><Square size={16}/></button>;
 const measures=Math.max(1,model.selected?.measures?.length??1);
 const bar=Math.min(measures,Math.max(1,(model.playPosition?.bar??model.startBar??0)+1));
 const range=model.loopRange??{start:0,end:measures-1};
 const setRange=(start,end)=>model.setLoopRange?.(start===0&&end===measures-1?null:{start,end});
 return <section className={'desktopPracticeDock'+(folded?' is-folded':'')+(backingOpen?' has-backing':'')} aria-label={korean?'악보 재생 패널':'Score playback panel'}>
  <div className="desktopDockToolbar">
   <button type="button" disabled={backing.isRecording} aria-pressed={backingOpen} onClick={toggleBacking}>{backingOpen?<Minus size={13}/>:<Plus size={13}/>} {korean?(backingOpen?'백킹 닫기':'백킹 추가'):(backingOpen?'Close backing':'Add backing')}</button>

  </div>
  {backingOpen&&<div className="desktopDockSync"><button type="button" aria-label={korean?"동시재생":"Play together"} aria-pressed={syncPlayback} disabled={syncBusy||c.disabled} aria-busy={syncBusy} onClick={playTogether}><span>{korean?"동시":"Sync"}</span>{syncOwned.current&&c.playing?<Square size={16} aria-hidden="true"/>:<Play size={16} aria-hidden="true"/>}</button></div>}
  {syncError&&<p role="alert">{syncError}</p>}
  {<div className="desktopDockPanels">
   <section className="desktopDockMetro" aria-label={t('etudes.scoreMetronome')}>
    <div className="desktopDockBeatLine">
     <PracticeBeatDots meter={c.meter} beat={c.beat} showMeter={false} beatAccents={c.beatAccents} onToggleAccent={c.onToggleAccent}/>
     <div className="desktopDockBeatInfo">{c.countingIn?<span role="status">{t('pdf.countIn')}</span>:<span>{bar}/{measures}{t('app.bar')}</span>}<span>{c.meter.join('/')}</span><button type="button" className="desktopDockIcon" ref={settingsRef} aria-label={t('etudes.detailedMetronomeSettings')} aria-expanded={popup==='settings'} onClick={()=>setPopup(p=>p==='settings'?null:'settings')}><Settings2 size={17}/></button></div>
    </div>
    <div className="desktopDockTempo desktopDockSharedBpm">
     <SharedBpmControls bpm={c.bpm} changeBpmBy={(delta,id,event)=>{event.stopPropagation();changeBpm(c.bpm+delta);}}/>
    </div>
    <div className="desktopDockTransport">
     <button type="button" className="desktopDockTap" aria-label={t('app.tapToSetBpm')} onClick={tap}>TAP</button>
     <div className="desktopDockPlayGroup">{play}{stop}</div>
     <button type="button" className="desktopDockCountIn" aria-label={t('pdf.countIn')} aria-pressed={c.countIn!==false} disabled={!c.onCountInChange} onClick={()=>c.onCountInChange?.(c.countIn===false)}>{t('pdf.countIn')}<small>{c.countIn!==false?'ON':'OFF'}</small></button>
     <button type="button" className="desktopDockIcon" ref={volumeRef} aria-label={t('components.metronomeVolume')} aria-expanded={popup==='volume'} onClick={()=>setPopup(p=>p==='volume'?null:'volume')}>{c.click?<Volume2 size={17}/>:<VolumeX size={17}/>}</button>
     <button type="button" className="desktopDockScoreSound" aria-label={t('etudes.scoreSound')} aria-pressed={Boolean(c.sound&&model.followMode!=='off')} disabled={model.pdfMode||model.followMode==='off'} onClick={c.onSound}><Music2 size={16}/><span>{t('etudes.scoreSound')}</span><small>{c.sound&&model.followMode!=='off'?'ON':'OFF'}</small></button>
    </div>
    {c.error&&<p role="alert">{localizeUi(c.error)}</p>}
   </section>
   {backingOpen&&<div className="desktopDockBacking">{backingContent}</div>}
  </div>}
  {popup&&!folded&&<PracticePopover anchor={anchor} onClose={close} width={popup==='volume'?140:340} label={popup==='volume'?t('components.metronomeVolume'):popup==='bpm'?t('etudes.adjustBpm'):t('etudes.metronomeSettings')}>
   {popup==='bpm'?<label>{t('etudes.practiceBpm')}<input type="number" min="30" max="240" aria-label={t('etudes.practiceBpm')} value={c.bpm} onChange={event=>changeBpm(event.target.value)}/></label>:popup==='volume'?<><MetronomeVolumeControl/><button type="button" aria-label={t('etudes.muteClick')} aria-pressed={!c.click} onClick={c.onClickSound}>{c.click?<Volume2/>:<VolumeX/>}</button></>:<>
    <MetronomeSettingsPanel renderOption={option=>option?.label??option?.longLabel??''} fields={[
     {id:'meter',label:ko['app.meter'],value:c.meter.join('/'),disabled:!model.setMeterOverride,options:TIME_SIGNATURE_OPTIONS,onChange:value=>model.setMeterOverride?.(value.split('/').map(Number))},
     {id:'subdivision',label:ko['app.subdivision'],value:model.subdivision,options:METRONOME_SUBDIVISION_OPTIONS,onChange:model.setSubdivision},
     {id:'tone',label:ko['app.sound'],tone:true,value:model.tone,options:METRONOME_TONE_OPTIONS,onChange:model.setTone},
    ]}/>
    {!model.pdfMode&&<><fieldset className="practiceRepeatControls"><legend>{t('app.repeat')}</legend><select aria-label={t('etudes.repeatCount')} value={model.repeatCount??0} onChange={e=>model.setRepeatCount(Number(e.target.value))}><option value="0">{t('etudes.repeatContinuously')}</option>{Array.from({length:16},(_,i)=><option key={i} value={i+1}>{i+1}{t('app.times')}</option>)}</select><div className="practiceRepeatRangeRow"><select aria-label={t('etudes.loopStartBar')} value={range.start} onChange={e=>{const start=Number(e.target.value);setRange(start,Math.max(start,range.end));}}>{Array.from({length:measures},(_,i)=><option key={i} value={i}>{i+1}</option>)}</select><span>~</span><select aria-label={t('etudes.loopEndBar')} value={range.end} onChange={e=>setRange(range.start,Number(e.target.value))}>{Array.from({length:measures-range.start},(_,i)=><option key={i} value={i+range.start}>{i+range.start+1}</option>)}</select></div></fieldset><FollowPatternControl value={model.followMode} onChange={model.setFollowMode}/></>}
   </>}
  </PracticePopover>}
 </section>;
}
