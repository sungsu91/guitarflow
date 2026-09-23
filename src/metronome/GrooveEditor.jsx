import ko from "./../i18n/locales/ko.js";
import { localizeUi } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import GrooveTonePicker from './GrooveTonePicker.jsx';
import React, {useEffect, useRef, useState, useSyncExternalStore, useCallback} from 'react';
import {applyGrooveQuick, createGrooveRow, GROOVE_TONES} from './groove.js';
import './groove.css';


const GrooveTrackName=GrooveTonePicker;

const GrooveTrack=React.memo(function GrooveTrack({row,r,beats,divisions,paint,quick,changeRow,canRemove,removing}) {
  useLanguage();
  const groups=Array.from({length:beats},(_,b)=>b);
  return <div className={`grooveTrack ${row.muted?'is-muted':''}`}>
        <div className="grooveSteps">{groups.map(b=><div className="grooveBeat" key={b}>{Array.from({length:divisions},(_,s)=>{
          const i=b*divisions+s,velocity=row.velocities?.[i]??70;
          return <button type="button" key={s} aria-label={translateUi("metronome.rowValue1StepValue2", { value1: r+1, value2: i+1 })} aria-pressed={row.steps[i]} data-strength={velocity>=85?"strong":velocity>=55?"medium":velocity>=35?"soft":"ghost"} title={translateUi("metronome.rowValue1StepValue2VelocityValue3", { value1: r+1, value2: i+1, value3: velocity })} onClick={()=>{
            if(quick!=='default') {changeRow(r,applyGrooveQuick(row,quick,i,beats,divisions,paint));return;}
            const steps=[...row.steps],velocities=Array.from({length:72},(_,k)=>row.velocities?.[k]??70);
            steps[i]=!(steps[i] && velocities[i]===Number(paint));
            velocities[i]=Number(paint);
            changeRow(r,{steps,velocities});
          }}><i/></button>;
        })}</div>)}</div>
        {removing && <button className="grooveRemoveTrack" type="button" aria-label={translateUi("metronome.deleteRowValue1", { value1: r+1 })} title={translateUi("etudes.deleteRow")} disabled={!canRemove} onClick={()=>changeRow(r,null)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button>}
      </div>;
});

function Grid({store,pattern, onChange, beats, divisions, clock, playing, paint, quick, removing, mobile}) {
  useLanguage();
  const root=useRef(null);
  const viewport=useRef(null);
  const zoomRef=useRef(1);
  const suppressClickUntil=useRef(0);
  const [zoom,setZoom]=useState(1);
  const playhead=useRef(null);
  useEffect(()=>{
    if(!mobile || !viewport.current)return;
    const element=viewport.current;
    let gesture=null;
    const distance=touches=>Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
    const start=event=>{if(event.touches.length===2){gesture={distance:distance(event.touches),zoom:zoomRef.current};suppressClickUntil.current=Date.now()+400;}};
    const move=event=>{
      if(event.touches.length!==2)return;
      event.preventDefault();
      suppressClickUntil.current=Date.now()+400;
      if(!gesture)gesture={distance:distance(event.touches),zoom:zoomRef.current};
      const next=Math.max(1,Math.min(2.5,gesture.zoom*distance(event.touches)/Math.max(1,gesture.distance)));
      const scroller=root.current;
      const middle=(event.touches[0].clientX+event.touches[1].clientX)/2-(scroller?.getBoundingClientRect().left??0);
      const contentPosition=((scroller?.scrollLeft??0)+middle)/zoomRef.current;
      zoomRef.current=next;
      setZoom(next);
      if(scroller)requestAnimationFrame(()=>{scroller.scrollLeft=contentPosition*next-middle;});
    };
    const end=event=>{if(event.touches.length<2)gesture=null;};
    element.addEventListener('touchstart',start,{passive:true});
    element.addEventListener('touchmove',move,{passive:false});
    element.addEventListener('touchend',end);
    element.addEventListener('touchcancel',end);
    return()=>{
      element.removeEventListener('touchstart',start);
      element.removeEventListener('touchmove',move);
      element.removeEventListener('touchend',end);
      element.removeEventListener('touchcancel',end);
    };
  },[mobile]);
  useEffect(()=>{if(root.current)root.current.scrollLeft=0;},[beats,divisions]);
  useEffect(()=>{
    let frame,animation,key,lastMeasure=-1;
    const update=()=>{
      const {audio,origin,stepSeconds,running}=clock();
      if(audio && running && audio.state==='running' && playhead.current) {
        const duration=stepSeconds*beats*divisions*1000;
        const travel=Math.max(0,(playhead.current.parentElement?.clientWidth??0)-playhead.current.offsetWidth);
        const nextKey=`${origin}:${duration}:${travel}`;
        if(key!==nextKey || !animation) {
          animation?.cancel();
          animation=playhead.current.animate(
            [{transform:'translate3d(0,0,0)'},{transform:`translate3d(${travel}px,0,0)`}],
            {duration,iterations:Infinity,easing:'linear',fill:'both'},
          );
          const audioNow=audio.currentTime;
          animation.startTime=performance.now()-(audioNow-origin)*1000;
          key=nextKey;
          lastMeasure=Math.floor(Math.max(0,(audioNow-origin)*1000)/duration);
        } else {
          const elapsedMs=Math.max(0,(audio.currentTime-origin)*1000);
          const measure=Math.floor(elapsedMs/duration);
          if(measure!==lastMeasure) {
            // Re-anchor every wrap to the immutable Web Audio origin. This keeps
            // the first step of every measure on the same frame as its sound.
            const audioNow=audio.currentTime;
            animation.startTime=performance.now()-(audioNow-origin)*1000;
            lastMeasure=measure;
          }
        }
      } else if(animation) {
        animation.pause();
        key=null;
        lastMeasure=-1;
      }
      frame=requestAnimationFrame(update);
    };
    if(playing)update();return()=>{cancelAnimationFrame(frame);animation?.cancel();};
  },[clock,playing,beats,divisions]);
  const groups=Array.from({length:beats},(_,b)=>b);
  const label=s=>divisions===4?['1','e','&','a'][s]:divisions===3?['1','trip','let'][s]:divisions===2?['1','&'][s]:s+1;
  const changeRow=useCallback((r,patch)=>{const current=store.getSnapshot();onChange({...current,name:'custom',rows:patch?current.rows.map((v,i)=>i===r?{...v,...patch}:v):current.rows.filter((_,i)=>i!==r)});},[store,onChange]);
  return <div ref={viewport} className="grooveGridViewport" onClickCapture={event=>{if(Date.now()<suppressClickUntil.current){event.preventDefault();event.stopPropagation();}}} style={{'--groove-beats':beats,'--groove-divisions':divisions,'--groove-zoom':zoom}}>
    <div className="grooveTrackRail" aria-label={translateUi("metronome.grooveSoundSettings")}>
      <span className="grooveTrackRailHeader" aria-hidden="true"/>
      {pattern.rows.map((row,r)=><GrooveTrackName key={r} row={row} r={r} changeRow={changeRow}/>)}
    </div>
    <div ref={root} className="grooveHorizontalScroll" aria-label={translateUi("metronome.grooveEditingGrid")}><div className={`grooveGrid grooveGrid--tracks ${removing?'is-removing':''}`} style={{width:zoom>1?`${zoom*100}%`:'100%',minWidth:beats*divisions>16?`calc(${removing?34:0}px + ${beats*divisions*18*zoom}px)`:undefined}}>
      <div className="grooveTrackHeader"><div className="grooveSteps grooveLabels">{groups.map(b=><div className="grooveBeat" key={b}>{Array.from({length:divisions},(_,s)=><span key={s}>{localizeUi(s===0?b+1:label(s))}</span>)}</div>)}</div>{removing && <div/>}</div>
      <div className="grooveTrackList" aria-label={translateUi("metronome.grooveTrackList")}>
        {pattern.rows.map((row,r)=><GrooveTrack key={r} row={row} r={r} beats={beats} divisions={divisions} paint={paint} quick={quick} changeRow={changeRow} canRemove={pattern.rows.length>1} removing={removing}/> )}
      </div>
      <div className="groovePlayTrack" aria-hidden="true"><i ref={playhead} style={{visibility:playing?'visible':'hidden'}}/></div>
    </div></div>
  </div>;
}
function GrooveEditor({store,...options}) {
  useLanguage();
  const pattern=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
  const props={...options,pattern,store};
  const [paint,setPaint]=useState('70');
  const [removing,setRemoving]=useState(false);
  const [quick,setQuick]=useState('default');
  const resetDialog=useRef(null);
  const strength=<><label className="grooveStrengthControl"><Translation id="metronome.velocity" /><select className="grooveStrengthSelect" aria-label={translateUi("metronome.velocityGrooveEditor")} value={paint} onChange={e=>setPaint(e.target.value)}><option value="70"><Translation id="app.default" /></option><option value="100"><Translation id="metronome.strong" /></option><option value="45"><Translation id="metronome.soft" /></option></select></label><label className="grooveStrengthControl grooveQuickControl"><Translation id="metronome.quick" /><select className="grooveStrengthSelect" aria-label={translateUi("metronome.quickGrooveEditor")} value={quick} onChange={e=>setQuick(e.target.value)}><option value="default"><Translation id="app.default" /></option><option value="bulk"><Translation id="etudes.fill" /></option><option value="partial"><Translation id="metronome.partial" /></option></select></label></>;
  return <section className={`grooveEditor grooveEditor--${props.mobile?'mobile':'desktop'}`} aria-label={translateUi("app.groovePacksApp")}>
    <div className="grooveToolbar">{strength}<span className="grooveRowLabel"><Translation id="metronome.rows" /></span><button type="button" aria-label={translateUi("metronome.addRow")} onClick={()=>props.onChange({...props.pattern,name:'custom',rows:[...props.pattern.rows,createGrooveRow(GROOVE_TONES.find(([id])=>!props.pattern.rows.some(row=>row.tone===id))?.[0]??'clap')]})}><Translation id="metronome.add" /></button><button type="button" className="grooveDeleteToggle" aria-label={translateUi("etudes.deleteRow")} aria-pressed={removing} onClick={()=>setRemoving(value=>!value)}><Translation id="common.delete" /></button><button type="button" className="grooveSaveButton" onClick={props.onSave}><Translation id="common.save" /></button><button type="button" onClick={()=>resetDialog.current?.showModal()}><Translation id="app.reset" /></button></div>
    <Grid {...props} paint={paint} quick={quick} removing={removing}/>
    <dialog ref={resetDialog} className="grooveResetDialog" aria-labelledby="groove-reset-title">
      <p id="groove-reset-title"><Translation id="metronome.resetThePattern" /></p>
      <div><button type="button" autoFocus onClick={()=>resetDialog.current?.close()}><Translation id="components.no" /></button><button type="button" onClick={()=>{
        const current=store.getSnapshot();
        props.onChange({...current,name:'custom',rows:current.rows.map(row=>({...row,steps:Array(72).fill(false)}))});
        resetDialog.current?.close();
      }}><Translation id="etudes.yes" /></button></div>
    </dialog>
  </section>;
}

export default React.memo(GrooveEditor);

export function MetronomeDockHandle({collapsed, onChange}) {
  useLanguage();
  const start = useRef(null), swiped = useRef(false);
  const label=collapsed?ko["metronome.expandTracker"]:ko["metronome.collapseTracker"];
  return <button type="button" className="metronomeDockHandle" aria-expanded={!collapsed} aria-label={localizeUi(label)} onPointerDown={e => {start.current = e.clientY; swiped.current = false; e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e => {if(start.current !== null && Math.abs(e.clientY-start.current)>18) {onChange(e.clientY<start.current); swiped.current=true;} start.current=null;}} onPointerCancel={() => {start.current=null;}} onClick={() => {if(!swiped.current) onChange(!collapsed);}}><span>{localizeUi(label)}</span><svg className="metronomeDockChevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={collapsed?'m6 9 6 6 6-6':'m18 15-6-6-6 6'}/></svg></button>;
}
