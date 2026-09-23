import {BackingLoopDragContext,BackingLoopFoldContext} from '../components/BackingLoopDragContext.js';
import PracticePopover from './PracticePopover.jsx';
import {createPortal} from 'react-dom';
import PracticeBeatDots from './PracticeBeatDots.jsx';
import {useEffect,useLayoutEffect,useRef,useState,useCallback} from 'react';
import {GripHorizontal, Settings2, Play, Pause, Square, AudioLines, X, ChevronLeft, ChevronRight, Timer, Volume2, VolumeX} from 'lucide-react';
import BackingLoop from '../components/BackingLoop.jsx';
import MetronomeSettingsPanel from '../components/MetronomeSettingsPanel.jsx';
import MetronomeVolumeControl from '../components/MetronomeVolumeControl.jsx';
import FollowPatternControl from './FollowPatternControl.jsx';
import {TIME_SIGNATURE_OPTIONS,METRONOME_TONE_OPTIONS} from '../metronome/options.js';
import {METRONOME_SUBDIVISION_OPTIONS} from '../metronome/subdivision.js';
import './practiceFloatingTools.css';

// Only handles capture pointers; the score and all controls retain native gestures.
function useFloatingPosition(key, edge=false, avoidPanel=false, dock=false, bottomPinned=false,initialPosition=null,defaultPosition=null,movableBottom=false) {
  const ref=useRef(null), gesture=useRef(null), moved=useRef(false);
  const [position,setPosition]=useState(()=>{if(initialPosition)return initialPosition;try{const p=JSON.parse(localStorage.getItem(key));return Number.isFinite(p?.x)&&Number.isFinite(p?.y)?p:defaultPosition;}catch{return defaultPosition;}});
  const clamp=p=>{
    const viewport=window.visualViewport, left=viewport?.offsetLeft??0,top=viewport?.offsetTop??0;
    const width=viewport?.width??innerWidth,height=viewport?.height??innerHeight;
    const rect=ref.current?.getBoundingClientRect();
    const nav=document.querySelector('.etudePracticeLayout.is-focus')?null:document.querySelector('.integratedBottomNav')?.getBoundingClientRect();
    const safe=parseFloat(getComputedStyle(ref.current).getPropertyValue('--floating-safe-bottom'))||0;
    const bottom=Math.min(top+height-safe-(bottomPinned?0:12),!bottomPinned&&nav?.height&&nav.top>top?nav.top-12:Infinity);
    const maxY=Math.max(top+12,bottom-(rect?.height??100));
    const maxX=Math.max(left+8,left+width-(rect?.width??280)-(avoidPanel&&width>=800?500:52));
    const next={x:edge?left+width-(rect?.width??40):Math.max(left+8,Math.min(p?.x??left+12,maxX)),y:avoidPanel&&width<800?maxY:Math.max(top+12,Math.min(p?.y??(edge?top+height*.42:maxY),maxY))};
    if(bottomPinned){next.x=left+(width-(rect?.width??340))/2;next.y=movableBottom?Math.max(top+12,Math.min(p?.y??maxY,maxY)):maxY;}
    const toolbar=document.querySelector('.etudePracticeLayout.is-focus .etudeViewTools')?.getBoundingClientRect();
    if(!edge&&toolbar&&next.x<toolbar.right+8&&next.x+(rect?.width??290)>toolbar.left&&next.y<toolbar.bottom+8)next.y=Math.min(maxY,toolbar.bottom+8);
    if(edge){for(const node of document.querySelectorAll(".practiceEdgeTab--movable")){if(node===ref.current)continue;const r=node.getBoundingClientRect(),h=rect?.height??52;if(next.y<r.bottom+8&&next.y+h>r.top-8){const below=r.bottom+8,above=r.top-h-8;next.y=below<=maxY?below:Math.max(top+12,above);}}}
    return next;
  };
  useLayoutEffect(()=>{
    const update=()=>!dock&&setPosition(p=>{const n=clamp(p);return p?.x===n.x&&p?.y===n.y?p:n;});
    update();const observer=new ResizeObserver(update);observer.observe(ref.current);
    window.addEventListener('resize',update);window.visualViewport?.addEventListener('resize',update);window.visualViewport?.addEventListener('scroll',update);
    return()=>{observer.disconnect();window.removeEventListener('resize',update);window.visualViewport?.removeEventListener('resize',update);window.visualViewport?.removeEventListener('scroll',update);};
  },[avoidPanel,dock,bottomPinned,movableBottom]);

  useEffect(()=>{if(position&&(!bottomPinned||movableBottom))try{localStorage.setItem(key,JSON.stringify(position));}catch{}},[key,position,bottomPinned,movableBottom]);
  const finish=e=>{const capture=gesture.current?.capture;gesture.current=null;if(capture?.hasPointerCapture(e.pointerId))capture.releasePointerCapture(e.pointerId);};
  return {ref,style:{left:position?.x??8,top:position?.y??100},handle:{
    onPointerDown:e=>{if(e.button!==0||gesture.current)return;
      // A selection can span the score and both floating panels. Cancel the
      // browser's native text drag before it steals this pointer gesture.
      e.preventDefault();e.stopPropagation();
      if(e.pointerType==='mouse')window.getSelection()?.removeAllRanges();
      // Keep stationary clicks targeted at their original control.
      const button=e.target.closest("button");
      const capture=button&&!button.disabled?button:e.currentTarget;
      capture.focus?.({preventScroll:true});
      moved.current=false;gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,origin:position??clamp(null),capture};capture.setPointerCapture(e.pointerId);},
    onPointerMove:e=>{const g=gesture.current;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.hypot(dx,dy)>6)moved.current=true;if(moved.current)setPosition(clamp({x:g.origin.x+(edge?0:dx),y:g.origin.y+dy}));},
    onDragStart:e=>{e.preventDefault();e.stopPropagation();},
    onLostPointerCapture:()=>{gesture.current=null;},
    onPointerUp:finish,onPointerCancel:e=>{moved.current=true;finish(e);},
    onClickCapture:e=>{if(moved.current&&e.detail!==0){e.preventDefault();e.stopPropagation();}moved.current=false;},
    onKeyDown:e=>{const delta={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];if(delta){e.preventDefault();e.stopPropagation();setPosition(p=>clamp({x:p.x+(edge?0:delta[0]),y:p.y+delta[1]}));}},
  }};
}

function FloatingMetronome({model,panelOpen,onHeight}) {
  const {bpm,setBpm,metro,meter}=model;
  const floating=useFloatingPosition('riff-etude-metronome-position',false,panelOpen);
  useLayoutEffect(()=>{const measure=()=>onHeight(innerHeight-floating.ref.current.getBoundingClientRect().top);measure();const observer=new ResizeObserver(measure);observer.observe(floating.ref.current);return()=>observer.disconnect();},[onHeight,floating.style.top]);
  const [settings,setSettings]=useState(false),[tempo,setTempo]=useState(false),[draft,setDraft]=useState(String(bpm));
  useEffect(()=>setDraft(String(bpm)),[bpm]);
  const commit=()=>{if(draft.trim()&&Number.isFinite(Number(draft)))setBpm(draft);else setDraft(String(bpm));setTempo(false);};
  return <section className="etudeFloatingMetro" aria-label="악보 메트로놈" ref={floating.ref} style={floating.style}>
    <header><button type="button" className="etudeDragHandle" aria-label="메트로놈 이동 (방향키로 이동)" {...floating.handle}><GripHorizontal aria-hidden="true"/>메트로놈</button><button type="button" aria-label="메트로놈 상세 설정" aria-expanded={settings} onClick={()=>setSettings(v=>!v)}><Settings2 aria-hidden="true"/></button></header>
    <PracticeBeatDots meter={meter} beat={metro.beat}/>
    <div className="etudeFloatingTransport">{tempo?<input autoFocus aria-label="연습 BPM" type="number" min="30" max="240" value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')commit();if(e.key==='Escape'){setDraft(String(bpm));setTempo(false);}}}/>:<button type="button" aria-label={`BPM ${bpm} 조절`} onClick={()=>setTempo(true)}><strong>{bpm}</strong> BPM</button>}<button type="button" aria-pressed={metro.playing} onClick={()=>metro.toggle()}>{metro.playing?'■ 메트로놈 정지':'▶ 메트로놈 시작'}</button></div>
    {settings&&<div className="etudeFloatingSettings"><MetronomeSettingsPanel renderOption={o=>o?.label??o?.longLabel??''} fields={[
      {id:'meter',label:'박자',value:meter.join('/'),options:TIME_SIGNATURE_OPTIONS,onChange:v=>model.setMeterOverride(v.split('/').map(Number))},
      {id:'subdivision',label:'세분',value:model.subdivision,options:METRONOME_SUBDIVISION_OPTIONS,onChange:model.setSubdivision},
      {id:'tone',label:'음색',tone:true,value:model.tone,options:METRONOME_TONE_OPTIONS,onChange:model.setTone},
    ]}/><MetronomeVolumeControl/></div>}
    {metro.error&&<p role="alert">{metro.error}</p>}
  </section>;
}

function EtudeRemote({controls:c,model,mobile,onHeight}){
 const dock=Boolean(model.layout.focus&&model.layout.viewport.width>model.layout.viewport.height&&model.hudTarget);
 const floating=useFloatingPosition(mobile?'riff-etude-remote-mobile-position':'riff-etude-remote-position',false,false,dock,mobile&&!dock,null,null,mobile);
 const settingsButton=useRef(null),bpmButton=useRef(null),volumeButton=useRef(null),[popup,setPopup]=useState(null);
 const close=useCallback(focus=>{setPopup(null);if(focus)(popup==='settings'?settingsButton:popup==='volume'?volumeButton:bpmButton).current?.focus({preventScroll:true});},[popup]);
 useLayoutEffect(()=>{const el=floating.ref.current;const measure=()=>onHeight(el.getBoundingClientRect().height+24);measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect();},[onHeight]);
 const panelDrag=!dock?{...floating.handle,onPointerDown:undefined,onKeyDown:undefined,onPointerDownCapture:e=>{if(e.currentTarget.contains(e.target))floating.handle.onPointerDown(e);}}:{};
 const remote=<section {...panelDrag} ref={floating.ref} style={dock?undefined:floating.style} className={"etudeFloatingMetro etudeSessionWidget etudeRemote"+(dock?" etudeHudRemote":mobile?" etudeRemote--mobileBottom":"")} aria-label="악보 메트로놈">
 <div className="etudeRemoteBeats" {...(!dock?{onKeyDown:floating.handle.onKeyDown,tabIndex:0,role:"group","aria-label":"메트로놈 이동 (드래그 또는 방향키)"}:{})}><PracticeBeatDots meter={c.meter} beat={c.beat} showMeter={false} beatAccents={c.beatAccents} onToggleAccent={c.onToggleAccent}/>{model.followMode!=='off'&&<span className="practiceCurrentBar" aria-label="진행 마디">{(model.playPosition?.bar??model.startBar??0)+1}/{model.selected?.measures.length??1}마디</span>}<span>{c.meter.join('/')}</span><button type="button" aria-label="메트로놈 닫기" onClick={model.minimizeMetro}><X aria-hidden="true"/></button></div>
 <div className="etudeRemoteControls"><button type="button" ref={bpmButton} className="etudeRemoteBpm" aria-label={'BPM '+c.bpm+' 조절'} aria-expanded={popup==='bpm'} onClick={()=>setPopup(p=>p==='bpm'?null:'bpm')}><strong>{c.bpm}</strong><small>BPM</small></button><button type="button" className="etudePracticeStart" aria-label={c.playing?'일시정지':c.paused?'연습 재개':'연습 시작'} disabled={c.disabled} onClick={c.playing?c.onPause:c.paused?c.onResume:c.onStart}>{c.playing?<Pause/>:<Play/>}</button><button type="button" className="etudePracticeStop" aria-label="정지" disabled={!c.playing&&!c.paused} onClick={c.onStop}><Square/></button><button type="button" ref={volumeButton} aria-label="메트로놈 볼륨" aria-expanded={popup==='volume'} onClick={()=>setPopup(p=>p==='volume'?null:'volume')}>{c.click?<Volume2/>:<VolumeX/>}</button><button type="button" ref={settingsButton} aria-label="메트로놈 상세 설정" aria-expanded={popup==='settings'} onClick={()=>setPopup(p=>p==='settings'?null:'settings')}><Settings2/></button></div>
 {popup&&<PracticePopover anchor={popup==='settings'?settingsButton:popup==='volume'?volumeButton:bpmButton} onClose={close} width={popup==='volume'?94:330} label={popup==='settings'?'메트로놈 설정':popup==='volume'?'메트로놈 볼륨':'BPM 조절'}>{popup==='volume'?<div className="etudeVerticalVolume"><MetronomeVolumeControl className="etudeVerticalVolumeControl" label="볼륨"/><button type="button" aria-label="클릭 음소거" aria-pressed={!c.click} onClick={c.onClickSound}>{c.click?<Volume2 aria-hidden="true"/>:<VolumeX aria-hidden="true"/>}</button></div>:popup==='bpm'?<><label>연습 BPM<input type="number" aria-label="연습 BPM" min="30" max="240" value={c.bpm} onChange={e=>c.onBpm(e.target.value)}/></label><div className="etudeTempoQuick">{[-10,-1,1,10].map(d=><button type="button" key={d} onClick={()=>c.onBpm(c.bpm+d)}>{d>0?'+':''}{d}</button>)}</div></>:<><MetronomeSettingsPanel renderOption={o=>o?.label??o?.longLabel??''} fields={[
 {id:'meter',label:'박자',value:c.meter.join('/'),disabled:true,options:TIME_SIGNATURE_OPTIONS,onChange:()=>{}},
 {id:'subdivision',label:'세분',value:model.subdivision,options:METRONOME_SUBDIVISION_OPTIONS,onChange:model.setSubdivision},
 {id:'tone',label:'음색',tone:true,value:model.tone,options:METRONOME_TONE_OPTIONS,onChange:model.setTone},
 ]}/><PracticeRepeatControls model={model}/><FollowPatternControl value={model.followMode} onChange={model.setFollowMode}/><label className="etudeOptionalSoundToggle"><input type="checkbox" checked={Boolean(c.sound&&model.followMode!=='off')} disabled={model.followMode==='off'} onChange={c.onSound}/><span>악보 소리</span></label></> }</PracticePopover>}{c.error&&<p role="alert">{c.error}</p>}
 </section>;
 return dock?createPortal(remote,model.hudTarget):remote;
}

function FloatingPractice({controls:c,model,panelOpen,onHeight}) {
 const dock=model.layout.focus;
 const floating=useFloatingPosition('riff-'+(model.scope??'etude')+'-metronome-position',false,panelOpen,dock);
 const [settings,setSettings]=useState(false),[tempo,setTempo]=useState(false),[draft,setDraft]=useState(String(c.bpm));
 useEffect(()=>setDraft(String(c.bpm)),[c.bpm]);
 useLayoutEffect(()=>{const measure=()=>onHeight(innerHeight-floating.ref.current.getBoundingClientRect().top);measure();const observer=new ResizeObserver(measure);observer.observe(floating.ref.current);return()=>observer.disconnect();},[onHeight,floating.style.top]);
 const commit=()=>{c.onBpm(draft);setTempo(false);};
 return <section className={"etudeFloatingMetro etudeSessionWidget"+(dock?" is-docked":"")+(settings?" settings-open":"")} aria-label="악보 메트로놈" onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();model.minimizeMetro();}}} ref={floating.ref} style={dock?{right:12+model.layout.viewport.left,top:8+model.layout.viewport.top}:floating.style}>
 <header><button type="button" className="etudeDragHandle" aria-label="메트로놈 이동 (방향키로 이동)" {...(dock?{}:floating.handle)} disabled={dock}><GripHorizontal aria-hidden="true"/><span>메트로놈</span></button><span className="etudeWidgetMeter">{c.meter.join("/")}</span><button type="button" aria-label="메트로놈 상세 설정" aria-expanded={settings} onClick={()=>setSettings(v=>!v)}><Settings2 aria-hidden="true"/></button><button type="button" className="etudePanelClose" aria-label="메트로놈 닫기" onClick={model.minimizeMetro}><X aria-hidden="true"/></button></header>
 <PracticeBeatDots meter={c.meter} beat={c.beat} showMeter={false} beatAccents={c.beatAccents} onToggleAccent={c.onToggleAccent}/>
 <div className="etudeFloatingTransport">{tempo?<input autoFocus type="number" aria-label="연습 BPM" min="30" max="240" value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/>:<button type="button" aria-expanded={tempo} aria-label={'BPM '+c.bpm+' 조절'} onClick={()=>setTempo(true)}>{c.bpm} BPM</button>}
 <button type="button" className="etudePracticeStart" disabled={c.disabled} onClick={c.playing?c.onPause:c.paused?c.onResume:c.onStart}>{c.playing?<Pause aria-hidden="true"/>:<Play aria-hidden="true"/>}<span>{c.playing?'일시정지':c.paused?'연습 재개':'연습 시작'}</span></button><button className="etudePracticeStop" aria-label="정지" type="button" disabled={!c.playing&&!c.paused} onClick={c.onStop}><Square aria-hidden="true"/></button></div>
 {tempo&&<div className="etudeTempoQuick" role="group" aria-label="BPM 빠른 조절">{[-10,-1,1,10].map(delta=><button key={delta} type="button" onPointerDown={e=>e.preventDefault()} onClick={()=>{const next=Math.max(30,Math.min(240,c.bpm+delta));c.onBpm(next);setDraft(String(next));}}>{delta>0?"+":""}{delta}</button>)}</div>}
 {settings&&<div className="etudeFloatingSettings"><button type="button" aria-pressed={c.click} onClick={c.onClickSound}>메트로놈 클릭 {c.click?'켜짐':'음소거'}</button>
 <MetronomeSettingsPanel renderOption={o=>o?.label??o?.longLabel??''} fields={[
 {id:'meter',label:'박자',value:c.meter.join('/'),disabled:true,options:TIME_SIGNATURE_OPTIONS,onChange:()=>{}},
 {id:'subdivision',label:'세분',value:model.subdivision,options:METRONOME_SUBDIVISION_OPTIONS,onChange:model.setSubdivision},
 {id:'tone',label:'음색',tone:true,value:model.tone,options:METRONOME_TONE_OPTIONS,onChange:model.setTone},
 ]}/><PracticeRepeatControls model={model}/><FollowPatternControl value={model.followMode} onChange={model.setFollowMode}/><MetronomeVolumeControl/><label className="etudeOptionalSoundToggle"><input type="checkbox" checked={Boolean(c.sound&&model.followMode!=='off')} disabled={model.followMode==='off'} onChange={c.onSound}/><span>악보 소리</span></label></div>}{c.error&&<p role="alert">{c.error}</p>}
 </section>;
}

function MovableBackingPanel({scope,close,children,origin,mobile}){
 const position=useFloatingPosition('riff-'+scope+'-backing-panel-position',false,false,false,false,origin,!mobile?{x:innerWidth-464,y:100}:null);
 const fold=()=>{const el=position.ref.current;if(!el||matchMedia('(prefers-reduced-motion: reduce)').matches){close();return;}const distance=innerWidth-el.getBoundingClientRect().left;el.animate([{transform:'translateX(0)',opacity:1},{transform:'translateX('+distance+'px)',opacity:0}],{duration:180,easing:'ease-in',fill:'forwards'}).finished.then(close,()=>{});};
 return <aside {...position.handle} onPointerDown={undefined} onPointerDownCapture={e=>{if(!e.currentTarget.contains(e.target)||e.target.closest('input,select,textarea,[role="slider"],[role="dialog"],.backingLoopPlaylist'))return;position.handle.onPointerDown(e);}} id="etude-backing-panel" className={"etudeBackingDrawer etudeBackingDrawer--movable"+(!mobile?" etudeBackingDrawer--desktop":"")} ref={position.ref} style={position.style} aria-label="백킹루프" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>
 <BackingLoopFoldContext.Provider value={fold}><BackingLoopDragContext.Provider value={position.handle}>{children}</BackingLoopDragContext.Provider></BackingLoopFoldContext.Provider></aside>;
}

function MovableEdgeTab({scope,kind,onOpen,playing}){
 const floating=useFloatingPosition('riff-'+scope+'-'+kind+'-edge',true);
 return <button ref={floating.ref} style={floating.style} type="button" className="practiceEdgeTab practiceEdgeTab--movable" aria-label={(kind==='metro'?'메트로놈':'백킹루프')+' 패널 펼치기'} title="눌러 열기 · 위아래로 끌어 이동" {...floating.handle} onClick={onOpen}>{kind==='metro'?<Timer aria-hidden="true"/>:<AudioLines aria-hidden="true"/>}<ChevronLeft aria-hidden="true"/>{playing&&<i aria-label="재생 중"/>}</button>;
}
function BackingSurface({controller,children,open,setOpen,scope,triggerTarget,mobile}) {
  const trigger=useRef(null),panel=useRef(null);
  const [minimized,setMinimized]=useState(false),[openOrigin,setOpenOrigin]=useState(null);
  const floating=useFloatingPosition(`riff-${scope}-backing-position`,true);
  const close=()=>{setOpen(false);setMinimized(true);controller.closeDialog();trigger.current?.focus({preventScroll:true});};
  useEffect(()=>{if(open)panel.current?.querySelector('button')?.focus({preventScroll:true});else controller.closeDialog();},[open]);
  return <>
    {triggerTarget?createPortal(<span ref={floating.ref} className="etudeBackingToggle"><button ref={trigger} type="button" aria-label="백킹루프" aria-pressed={open||minimized} aria-expanded={open} aria-controls="etude-backing-panel" onClick={()=>{if(open||minimized){controller.pausePlayback();controller.resetPlayback();controller.closeDialog();setOpen(false);setMinimized(false);}else{setOpen(true);}}}><AudioLines aria-hidden="true"/>백킹루프{controller.isPlaying&&<i role="status" aria-label="백킹루프 재생 중"> ·</i>}</button></span>,triggerTarget):(<div ref={floating.ref} className="etudeBackingHandle" style={floating.style}><button ref={trigger} type="button" aria-label={open?'백킹루프 패널 접기':'백킹루프 패널 펼치기'} aria-expanded={open} aria-controls="etude-backing-panel" {...floating.handle} onClick={e=>{if(open)close();else{const r=e.currentTarget.getBoundingClientRect();setOpenOrigin({x:r.left,y:r.top});setOpen(true);}}}><span aria-hidden="true">{open?'›':'‹'}</span>{controller.isPlaying&&<i role="status" aria-label="백킹루프 재생 중"/>}</button></div>)}
    {triggerTarget&&minimized&&!open&&<MovableEdgeTab scope={scope} kind="backing" playing={controller.isPlaying} onOpen={e=>{const r=e.currentTarget.getBoundingClientRect();setOpenOrigin({x:r.left,y:r.top});setMinimized(false);setOpen(true);}}/>}
    {open&&<MovableBackingPanel scope={scope} close={close} origin={openOrigin} mobile={mobile}>{children}</MovableBackingPanel>}
  </>;
}

export function PracticeBackingPanel({mobile,scope='etude',open:controlledOpen,onOpenChange,clearance=0,triggerTarget=null}){
 const [localOpen,setLocalOpen]=useState(false),[navClearance,setNavClearance]=useState(0);
 const open=controlledOpen??localOpen,setOpen=onOpenChange??setLocalOpen;
 useLayoutEffect(()=>{const measure=()=>{const nav=document.querySelector('.integratedBottomNav')?.getBoundingClientRect();setNavClearance(nav?.height?innerHeight-nav.top:0);};measure();window.addEventListener('resize',measure);return()=>window.removeEventListener('resize',measure);},[]);
 return <div className="etudeFloatingTheme" style={{'--etude-metro-height':Math.max(clearance,navClearance)+'px'}}><BackingLoop mobile={mobile} desktopPresentation="standalone" ownerMode="etudes" renderSurface={(controller,content)=><BackingSurface mobile={mobile} controller={controller} open={open} setOpen={setOpen} scope={scope} triggerTarget={triggerTarget}>{content}</BackingSurface>}/></div>;
}
export default function PracticeFloatingTools({model,mobile,practiceControls}) {
 const [localOpen,setLocalOpen]=useState(false),[metroHeight,setMetroHeight]=useState(150);
 const open=practiceControls?model.backingOpen:localOpen;
 const setOpen=value=>{if(practiceControls){model.setBackingOpen(value);if(value)model.setTipsOpen(false);}else setLocalOpen(value);};
 return <>{practiceControls&&model.metroMinimized&&!model.toolsVisible&&<div className="etudeFloatingTheme"><MovableEdgeTab scope={model.scope??'etude'} kind="metro" playing={practiceControls.playing} onOpen={()=>{model.setMetroMinimized(false);model.setToolsVisible(true);}}/></div>}{practiceControls?(model.toolsVisible&&(model.compactTools?<EtudeRemote controls={practiceControls} model={model} mobile={mobile} onHeight={setMetroHeight}/>:<FloatingPractice controls={practiceControls} model={model} panelOpen={open} onHeight={setMetroHeight}/>)):<FloatingMetronome model={model} panelOpen={open} onHeight={setMetroHeight}/>}<PracticeBackingPanel mobile={mobile} scope={model.scope??'etude'} triggerTarget={practiceControls?model.backingTarget:null} open={open} onOpenChange={setOpen} clearance={practiceControls&&!model.toolsVisible?0:metroHeight}/></>;
}

import './practiceDesign.css';

import './etudeRemote.css';

function PracticeRepeatControls({model}){
 const count=Math.max(1,model.selected?.measures.length??1);
 const range=model.loopRange??{start:0,end:count-1};
 const setRange=(start,end)=>model.setLoopRange(start===0&&end===count-1?null:{start,end});
 return <fieldset className="practiceRepeatControls">
  <legend>반복</legend>
  <select aria-label="반복 횟수" value={model.repeatCount??0} onChange={e=>model.setRepeatCount(Number(e.target.value))}><option value="0">계속 반복</option>{Array.from({length:16},(_,i)=><option key={i} value={i+1}>{i+1}회</option>)}</select>
  <div className="practiceRepeatRangeRow">
   <span>구간:</span>
   <select aria-label="반복 시작 마디" value={range.start} onChange={e=>{const start=Number(e.target.value);setRange(start,Math.max(start,range.end));}}>{Array.from({length:count},(_,i)=><option key={i} value={i}>{i+1}마디</option>)}</select>
   <span aria-hidden="true">~</span>
   <select aria-label="반복 끝 마디" value={range.end} onChange={e=>setRange(range.start,Number(e.target.value))}>{Array.from({length:count-range.start},(_,n)=>{const i=n+range.start;return <option key={i} value={i}>{i+1}마디</option>;})}</select>
  </div>
 </fieldset>;
}
