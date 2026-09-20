import {BackingLoopDragContext} from '../components/BackingLoopDragContext.js';
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
function useFloatingPosition(key, edge=false, avoidPanel=false, dock=false) {
  const ref=useRef(null), gesture=useRef(null), moved=useRef(false);
  const [position,setPosition]=useState(()=>{try{const p=JSON.parse(localStorage.getItem(key));return Number.isFinite(p?.x)&&Number.isFinite(p?.y)?p:null;}catch{return null;}});
  const clamp=p=>{
    const viewport=window.visualViewport, left=viewport?.offsetLeft??0,top=viewport?.offsetTop??0;
    const width=viewport?.width??innerWidth,height=viewport?.height??innerHeight;
    const rect=ref.current?.getBoundingClientRect();
    const nav=document.querySelector('.etudePracticeLayout.is-focus')?null:document.querySelector('.integratedBottomNav')?.getBoundingClientRect();
    const safe=parseFloat(getComputedStyle(ref.current).getPropertyValue('--floating-safe-bottom'))||0;
    const bottom=Math.min(top+height-safe-12,nav?.height&&nav.top>top?nav.top-12:Infinity);
    const maxY=Math.max(top+12,bottom-(rect?.height??100));
    const maxX=Math.max(left+8,left+width-(rect?.width??280)-(avoidPanel&&width>=800?500:52));
    const next={x:edge?left+width-(rect?.width??40):Math.max(left+8,Math.min(p?.x??left+12,maxX)),y:avoidPanel&&width<800?maxY:Math.max(top+12,Math.min(p?.y??(edge?top+height*.42:maxY),maxY))};
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
  },[avoidPanel,dock]);

  useEffect(()=>{if(position)try{localStorage.setItem(key,JSON.stringify(position));}catch{}},[key,position]);
  const finish=e=>{gesture.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);};
  return {ref,style:{left:position?.x??8,top:position?.y??100},handle:{
    onPointerDown:e=>{if(e.button!==0||gesture.current)return;moved.current=false;gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,origin:position??clamp(null)};e.currentTarget.setPointerCapture(e.pointerId);},
    onPointerMove:e=>{const g=gesture.current;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.hypot(dx,dy)>6)moved.current=true;if(moved.current)setPosition(clamp({x:g.origin.x+(edge?0:dx),y:g.origin.y+dy}));},
    onPointerUp:finish,onPointerCancel:e=>{moved.current=true;finish(e);},
    onClickCapture:e=>{if(moved.current&&e.detail!==0){e.preventDefault();e.stopPropagation();}moved.current=false;},
    onKeyDown:e=>{const delta={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];if(delta){e.preventDefault();setPosition(p=>clamp({x:p.x+(edge?0:delta[0]),y:p.y+delta[1]}));}},
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

function EtudeRemote({controls:c,model,onHeight}){
 const dock=Boolean(model.layout.focus&&model.layout.viewport.width>model.layout.viewport.height&&model.hudTarget);
 const floating=useFloatingPosition('riff-etude-remote-position',false,false,dock);
 const settingsButton=useRef(null),bpmButton=useRef(null),volumeButton=useRef(null),[popup,setPopup]=useState(null);
 const close=useCallback(focus=>{setPopup(null);if(focus)(popup==='settings'?settingsButton:popup==='volume'?volumeButton:bpmButton).current?.focus({preventScroll:true});},[popup]);
 useLayoutEffect(()=>{const el=floating.ref.current;const measure=()=>onHeight(el.getBoundingClientRect().height+24);measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect();},[onHeight]);
 const remote=<section ref={floating.ref} style={dock?undefined:floating.style} className={"etudeFloatingMetro etudeSessionWidget etudeRemote"+(dock?" etudeHudRemote":"")} aria-label="악보 메트로놈">
 <div className="etudeRemoteBeats">{!dock&&<button type="button" className="etudeDragHandle" aria-label="메트로놈 이동 (방향키로 이동)" {...floating.handle}><GripHorizontal aria-hidden="true"/></button>}<PracticeBeatDots meter={c.meter} beat={c.beat} showMeter={false} beatAccents={c.beatAccents} onToggleAccent={c.onToggleAccent}/><span>{c.meter.join('/')}</span><button type="button" aria-label="메트로놈 닫기" onClick={model.minimizeMetro}><X aria-hidden="true"/></button></div>
 <div className="etudeRemoteControls"><button type="button" ref={bpmButton} className="etudeRemoteBpm" aria-label={'BPM '+c.bpm+' 조절'} aria-expanded={popup==='bpm'} onClick={()=>setPopup(p=>p==='bpm'?null:'bpm')}><strong>{c.bpm}</strong><small>BPM</small></button><button type="button" className="etudePracticeStart" aria-label={c.playing?'일시정지':c.paused?'연습 재개':'연습 시작'} disabled={c.disabled} onClick={c.playing?c.onPause:c.paused?c.onResume:c.onStart}>{c.playing?<Pause/>:<Play/>}</button><button type="button" className="etudePracticeStop" aria-label="정지" disabled={!c.playing&&!c.paused} onClick={c.onStop}><Square/></button><button type="button" ref={volumeButton} aria-label="메트로놈 볼륨" aria-expanded={popup==='volume'} onClick={()=>setPopup(p=>p==='volume'?null:'volume')}>{c.click?<Volume2/>:<VolumeX/>}</button><button type="button" ref={settingsButton} aria-label="메트로놈 상세 설정" aria-expanded={popup==='settings'} onClick={()=>setPopup(p=>p==='settings'?null:'settings')}><Settings2/></button></div>
 {popup&&<PracticePopover anchor={popup==='settings'?settingsButton:popup==='volume'?volumeButton:bpmButton} onClose={close} width={popup==='volume'?94:330} label={popup==='settings'?'메트로놈 설정':popup==='volume'?'메트로놈 볼륨':'BPM 조절'}>{popup==='volume'?<div className="etudeVerticalVolume"><MetronomeVolumeControl className="etudeVerticalVolumeControl" label="볼륨"/><button type="button" aria-label="클릭 음소거" aria-pressed={!c.click} onClick={c.onClickSound}>{c.click?<Volume2 aria-hidden="true"/>:<VolumeX aria-hidden="true"/>}</button></div>:popup==='bpm'?<><label>연습 BPM<input type="number" aria-label="연습 BPM" min="30" max="240" value={c.bpm} onChange={e=>c.onBpm(e.target.value)}/></label><div className="etudeTempoQuick">{[-10,-1,1,10].map(d=><button type="button" key={d} onClick={()=>c.onBpm(c.bpm+d)}>{d>0?'+':''}{d}</button>)}</div></>:<><MetronomeSettingsPanel renderOption={o=>o?.label??o?.longLabel??''} fields={[
 {id:'meter',label:'박자',value:c.meter.join('/'),disabled:true,options:TIME_SIGNATURE_OPTIONS,onChange:()=>{}},
 {id:'subdivision',label:'세분',value:model.subdivision,options:METRONOME_SUBDIVISION_OPTIONS,onChange:model.setSubdivision},
 {id:'tone',label:'음색',tone:true,value:model.tone,options:METRONOME_TONE_OPTIONS,onChange:model.setTone},
 {id:'repeat',label:'반복',value:model.repeatCount??0,options:[{id:0,label:'계속 반복'},...Array.from({length:16},(_,i)=>({id:i+1,label:`${i+1}회`}))],onChange:value=>model.setRepeatCount?.(Number(value))},
 ]}/><FollowPatternControl value={model.followMode} onChange={model.setFollowMode}/><details className="etudeOptionalSoundSection"><summary>악보 소리 · {c.sound?'켜짐':'끔'}</summary><label className="etudeOptionalSound"><input type="checkbox" checked={c.sound} onChange={c.onSound}/>악보 소리 듣기 (선택)</label><label>음색<select aria-label="악보 소리 음색" disabled={!c.sound} value={c.instrument} onChange={e=>c.onInstrument(e.target.value)}><option value="clean-guitar">클린 기타</option><option value="piano">피아노</option></select></label></details></> }</PracticePopover>}{c.error&&<p role="alert">{c.error}</p>}
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
 {id:'repeat',label:'반복',value:model.repeatCount??0,options:[{id:0,label:'계속 반복'},...Array.from({length:16},(_,i)=>({id:i+1,label:`${i+1}회`}))],onChange:value=>model.setRepeatCount?.(Number(value))},
 ]}/><FollowPatternControl value={model.followMode} onChange={model.setFollowMode}/><MetronomeVolumeControl/><details className="etudeOptionalSoundSection"><summary>악보 소리 듣기 · 선택</summary><label className="etudeOptionalSound"><input type="checkbox" checked={c.sound} onChange={c.onSound}/>악보 소리 듣기 (선택)</label><label>악보 소리 음색<select aria-label="악보 소리 음색" disabled={!c.sound} value={c.instrument} onChange={e=>c.onInstrument(e.target.value)}><option value="clean-guitar">클린 기타</option><option value="piano">피아노</option></select></label></details></div>}{c.error&&<p role="alert">{c.error}</p>}
 </section>;
}

function MovableBackingPanel({scope,close,children}){
 const position=useFloatingPosition('riff-'+scope+'-backing-panel-position');
 const fold=()=>{const el=position.ref.current;if(!el||matchMedia('(prefers-reduced-motion: reduce)').matches){close();return;}const distance=innerWidth-el.getBoundingClientRect().left;el.animate([{transform:'translateX(0)',opacity:1},{transform:'translateX('+distance+'px)',opacity:0}],{duration:180,easing:'ease-in',fill:'forwards'}).finished.then(close,()=>{});};
 return <aside id="etude-backing-panel" className="etudeBackingDrawer etudeBackingDrawer--movable" ref={position.ref} style={position.style} aria-label="백킹루프" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>
 <button type="button" className="backingPanelClose" aria-label="백킹루프 오른쪽으로 접기" title="오른쪽으로 접기" onClick={fold}><ChevronRight size={20} aria-hidden="true"/></button><BackingLoopDragContext.Provider value={position.handle}>{children}</BackingLoopDragContext.Provider></aside>;
}

function MovableEdgeTab({scope,kind,onOpen,playing}){
 const floating=useFloatingPosition('riff-'+scope+'-'+kind+'-edge',true);
 return <button ref={floating.ref} style={floating.style} type="button" className="practiceEdgeTab practiceEdgeTab--movable" aria-label={(kind==='metro'?'메트로놈':'백킹루프')+' 패널 펼치기'} title="눌러 열기 · 위아래로 끌어 이동" {...floating.handle} onClick={onOpen}>{kind==='metro'?<Timer aria-hidden="true"/>:<AudioLines aria-hidden="true"/>}<ChevronLeft aria-hidden="true"/>{playing&&<i aria-label="재생 중"/>}</button>;
}
function BackingSurface({controller,children,open,setOpen,scope,triggerTarget}) {
  const trigger=useRef(null),panel=useRef(null);
  const [minimized,setMinimized]=useState(false);
  const floating=useFloatingPosition(`riff-${scope}-backing-position`,true);
  const close=()=>{setOpen(false);setMinimized(true);controller.closeDialog();trigger.current?.focus({preventScroll:true});};
  useEffect(()=>{if(open)panel.current?.querySelector('button')?.focus({preventScroll:true});else controller.closeDialog();},[open]);
  return <>
    {triggerTarget?createPortal(<span ref={floating.ref} className="etudeBackingToggle"><button ref={trigger} type="button" aria-label="백킹루프" aria-pressed={open||minimized} aria-expanded={open} aria-controls="etude-backing-panel" onClick={()=>{if(open||minimized){controller.pausePlayback();controller.resetPlayback();controller.closeDialog();setOpen(false);setMinimized(false);}else{setOpen(true);}}}><AudioLines aria-hidden="true"/>백킹루프{controller.isPlaying&&<i role="status" aria-label="백킹루프 재생 중"> ·</i>}</button></span>,triggerTarget):(<div ref={floating.ref} className="etudeBackingHandle" style={floating.style}><button ref={trigger} type="button" aria-label={open?'백킹루프 패널 접기':'백킹루프 패널 펼치기'} aria-expanded={open} aria-controls="etude-backing-panel" {...floating.handle} onClick={()=>open?close():setOpen(true)}><span aria-hidden="true">{open?'›':'‹'}</span>{controller.isPlaying&&<i role="status" aria-label="백킹루프 재생 중"/>}</button></div>)}
    {triggerTarget&&minimized&&!open&&<MovableEdgeTab scope={scope} kind="backing" playing={controller.isPlaying} onOpen={()=>{setMinimized(false);setOpen(true);}}/>}
    {open&&<MovableBackingPanel scope={scope} close={close}>{children}{controller.notice&&<p role="status">{controller.notice}</p>}</MovableBackingPanel>}
  </>;
}

export function PracticeBackingPanel({mobile,scope='etude',open:controlledOpen,onOpenChange,clearance=0,triggerTarget=null}){
 const [localOpen,setLocalOpen]=useState(false),[navClearance,setNavClearance]=useState(0);
 const open=controlledOpen??localOpen,setOpen=onOpenChange??setLocalOpen;
 useLayoutEffect(()=>{const measure=()=>{const nav=document.querySelector('.integratedBottomNav')?.getBoundingClientRect();setNavClearance(nav?.height?innerHeight-nav.top:0);};measure();window.addEventListener('resize',measure);return()=>window.removeEventListener('resize',measure);},[]);
 return <div className="etudeFloatingTheme" style={{'--etude-metro-height':Math.max(clearance,navClearance)+'px'}}><BackingLoop mobile={mobile} ownerMode="etudes" renderSurface={(controller,content)=><BackingSurface controller={controller} open={open} setOpen={setOpen} scope={scope} triggerTarget={triggerTarget}>{content}</BackingSurface>}/></div>;
}
export default function PracticeFloatingTools({model,mobile,practiceControls}) {
 const [localOpen,setLocalOpen]=useState(false),[metroHeight,setMetroHeight]=useState(150);
 const open=practiceControls?model.backingOpen:localOpen;
 const setOpen=value=>{if(practiceControls){model.setBackingOpen(value);if(value)model.setTipsOpen(false);}else setLocalOpen(value);};
 return <>{practiceControls&&model.metroMinimized&&!model.toolsVisible&&<div className="etudeFloatingTheme"><MovableEdgeTab scope={model.scope??'etude'} kind="metro" playing={practiceControls.playing} onOpen={()=>{model.setMetroMinimized(false);model.setToolsVisible(true);}}/></div>}{practiceControls?(model.toolsVisible&&(model.compactTools?<EtudeRemote controls={practiceControls} model={model} onHeight={setMetroHeight}/>:<FloatingPractice controls={practiceControls} model={model} panelOpen={open} onHeight={setMetroHeight}/>)):<FloatingMetronome model={model} panelOpen={open} onHeight={setMetroHeight}/>}<PracticeBackingPanel mobile={mobile} scope={model.scope??'etude'} triggerTarget={practiceControls?model.backingTarget:null} open={open} onOpenChange={setOpen} clearance={practiceControls&&!model.toolsVisible?0:metroHeight}/></>;
}

import './practiceDesign.css';

import './etudeRemote.css';
