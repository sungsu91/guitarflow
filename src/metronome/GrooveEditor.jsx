import React, {useEffect, useRef, useState, useSyncExternalStore, useCallback} from 'react';
import {createGrooveRow, GROOVE_TONES} from './groove.js';
import './groove.css';


const GrooveTrack=React.memo(function GrooveTrack({row,r,beats,divisions,paint,changeRow,canRemove,removing}) {
  const groups=Array.from({length:beats},(_,b)=>b);
  return <div className={`grooveTrack ${row.muted?'is-muted':''}`}>
        <div className="grooveTrackName"><select aria-label={`${r+1}행 음색`} value={row.tone} onChange={e=>e.target.value==='mute'?changeRow(r,{muted:!row.muted}):changeRow(r,{tone:e.target.value})}>{GROOVE_TONES.map(([id,text])=><option key={id} value={id}>{text}{row.muted && id===row.tone ? ' (음소거)' : ''}</option>)}<option value="mute">{row.muted?'음소거 해제':'음소거'}</option></select>
        </div>
        <div className="grooveSteps">{groups.map(b=><div className="grooveBeat" key={b}>{Array.from({length:divisions},(_,s)=>{
          const i=b*divisions+s,velocity=row.velocities?.[i]??70;
          return <button type="button" key={s} aria-label={`${r+1}행 ${i+1}칸`} aria-pressed={row.steps[i]} data-strength={velocity>=85?"strong":velocity>=55?"medium":velocity>=35?"soft":"ghost"} title={`${r+1}행 ${i+1}칸 · 강약 ${velocity}`} onClick={()=>{
            const steps=[...row.steps],velocities=Array.from({length:72},(_,k)=>row.velocities?.[k]??70);
            steps[i]=!(steps[i] && velocities[i]===Number(paint));
            velocities[i]=Number(paint);
            changeRow(r,{steps,velocities});
          }}><i/></button>;
        })}</div>)}</div>
        {removing && <button className="grooveRemoveTrack" type="button" aria-label={`${r+1}행 삭제`} title="줄 삭제" disabled={!canRemove} onClick={()=>changeRow(r,null)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button>}
      </div>;
});

function Grid({store,pattern, onChange, beats, divisions, clock, playing, paint, removing}) {
  const root=useRef(null);
  const playhead=useRef(null);
  useEffect(()=>{if(root.current)root.current.scrollLeft=0;},[beats,divisions]);
  useEffect(()=>{
    let frame,animation,key;
    const update=()=>{
      const {audio,origin,stepSeconds,running}=clock();
      if(audio && running && audio.state==='running' && playhead.current) {
        const duration=stepSeconds*beats*divisions*1000;
        const nextKey=`${origin}:${duration}`;
        if(key!==nextKey || !animation) {
          animation?.cancel();
          // Anchor once to the audio transport. Seeking or adjusting playbackRate
          // while running introduces visible speed changes and boundary jumps.
          animation=playhead.current.animate(
            [{transform:'translate3d(0,0,0)'},{transform:'translate3d(100%,0,0)'}],
            {duration,iterations:Infinity,easing:'linear',fill:'both'},
          );
          animation.startTime=document.timeline.currentTime-(audio.currentTime-origin)*1000;
          key=nextKey;
        }
      } else if(animation) {
        animation.pause();
        // A resumed audio context needs a new anchor; ordinary bar wraps do not.
        key=null;
      }
      frame=requestAnimationFrame(update);
    };
    if(playing)update();return()=>{cancelAnimationFrame(frame);animation?.cancel();};
  },[clock,playing,beats,divisions]);
  const groups=Array.from({length:beats},(_,b)=>b);
  const label=s=>divisions===4?['1','e','&','a'][s]:divisions===3?['1','trip','let'][s]:divisions===2?['1','&'][s]:s+1;
  const changeRow=useCallback((r,patch)=>{const current=store.getSnapshot();onChange({...current,name:'custom',rows:patch?current.rows.map((v,i)=>i===r?{...v,...patch}:v):current.rows.filter((_,i)=>i!==r)});},[store,onChange]);
  return <div ref={root} className="grooveHorizontalScroll" aria-label="그루브 편집 격자"><div className={`grooveGrid grooveGrid--tracks ${removing?'is-removing':''}`} style={{'--groove-beats':beats,'--groove-divisions':divisions,minWidth:beats*divisions>16?`calc(var(--groove-label-width) + ${removing?40:6}px + ${beats*divisions*18}px)`:undefined}}>
    <div className="grooveTrackHeader"><span/><div className="grooveSteps grooveLabels">{groups.map(b=><div className="grooveBeat" key={b}>{Array.from({length:divisions},(_,s)=><span key={s}>{s===0?b+1:label(s)}</span>)}</div>)}</div>{removing && <div/>}</div>
    <div className="grooveTrackList" aria-label="그루브 트랙 목록">
      {pattern.rows.map((row,r)=><GrooveTrack key={r} row={row} r={r} beats={beats} divisions={divisions} paint={paint} changeRow={changeRow} canRemove={pattern.rows.length>1} removing={removing}/> )}
    </div>
    <div className="groovePlayTrack" aria-hidden="true"><i ref={playhead} style={{visibility:playing?'visible':'hidden'}}/></div>
  </div></div>;
}
function GrooveEditor({store,...options}) {
  const pattern=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
  const props={...options,pattern,store};
  const [paint,setPaint]=useState('70');
  const [removing,setRemoving]=useState(false);
  const resetDialog=useRef(null);
  const strength=<label className="grooveStrengthControl">표기:<select className="grooveStrengthSelect" aria-label="표기 방식" value={paint} onChange={e=>setPaint(e.target.value)}><option value="70">기본</option><option value="100">강</option><option value="45">약</option></select></label>;
  return <section className={`grooveEditor grooveEditor--${props.mobile?'mobile':'desktop'}`} aria-label="그루브팩">
    <div className="grooveToolbar">{strength}<button type="button" onClick={()=>props.onChange({...props.pattern,name:'custom',rows:[...props.pattern.rows,createGrooveRow(GROOVE_TONES.find(([id])=>!props.pattern.rows.some(row=>row.tone===id))?.[0]??'clap')]})}>+ 줄 추가</button><button type="button" className="grooveDeleteToggle" aria-pressed={removing} onClick={()=>setRemoving(value=>!value)}>줄 삭제</button><button type="button" className="grooveSaveButton" onClick={props.onSave}>저장</button><button type="button" onClick={()=>resetDialog.current?.showModal()}>초기화</button></div>
    <Grid {...props} paint={paint} removing={removing}/>
    <dialog ref={resetDialog} className="grooveResetDialog" aria-labelledby="groove-reset-title">
      <p id="groove-reset-title">패턴을 초기화할까요?</p>
      <div><button type="button" autoFocus onClick={()=>resetDialog.current?.close()}>아니오</button><button type="button" onClick={()=>{
        const current=store.getSnapshot();
        props.onChange({...current,name:'custom',rows:current.rows.map(row=>({...row,steps:Array(72).fill(false)}))});
        resetDialog.current?.close();
      }}>예</button></div>
    </dialog>
  </section>;
}

export default React.memo(GrooveEditor);

export function MetronomeDockHandle({collapsed, onChange}) {
  const start = useRef(null), swiped = useRef(false);
  const label=collapsed?'트래커 펼치기':'트래커 접기';
  return <button type="button" className="metronomeDockHandle" aria-expanded={!collapsed} aria-label={label} onPointerDown={e => {start.current = e.clientY; swiped.current = false; e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e => {if(start.current !== null && Math.abs(e.clientY-start.current)>18) {onChange(e.clientY<start.current); swiped.current=true;} start.current=null;}} onPointerCancel={() => {start.current=null;}} onClick={() => {if(!swiped.current) onChange(!collapsed);}}><span>{label}</span><svg className="metronomeDockChevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={collapsed?'m6 9 6 6 6-6':'m18 15-6-6-6 6'}/></svg></button>;
}
