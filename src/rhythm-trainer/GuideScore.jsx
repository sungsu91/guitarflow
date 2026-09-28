import React,{useEffect,useState} from 'react';
import RhythmScore from './RhythmScore.jsx';
import {guideCursorX} from './notationLayout.js';

const actions={hit:['●','치기','Play'],hold:['—','유지','Hold'],rest:['·','쉼','Rest'],mute:['×','뮤트','Mute']};

function GuideScoreRows({compiled,perRow,playing,tick,progressStyle,stemDirection,language}){
 const t=(ko,en)=>language==='ko'?ko:en;
 const rows=Array.from({length:Math.ceil(compiled.groups.length/perRow)},(_,i)=>compiled.groups.slice(i*perRow,(i+1)*perRow));
 return <div className="rt-guide-score rt-guide-connected" aria-label={t('한 마디의 박과 분할','Beats and subdivisions of one bar')}>
  {rows.map((groups,row)=>{
   const offset=row*perRow,first=groups[0],last=groups.at(-1);
   const event=playing&&tick>=first.at&&tick<last.at+last.ticks?groups.flatMap((g,beat)=>g.events.map(e=>({...e,beat}))).find(e=>tick+1e-9>=e.at&&tick<e.at+e.ticks-1e-9):null;
   const position=event?{measure:0,tick:tick-first.at,event:{...event,measure:0,at:event.at-first.at}}:null;
   return <article className="rt-guide-staff-row" key={offset} aria-label={t(`${offset+1}~${offset+groups.length}박 읽는 법`,`How to read beats ${offset+1}–${offset+groups.length}`)} style={{'--row-beats':groups.length,width:`${groups.length/perRow*100}%`}}>
    <div className="rt-guide-beat-labels">{groups.map((g,i)=><small key={i}>{t(`${offset+i+1}${compiled.compound?' 큰':''}박`,`${compiled.compound?'Main beat':'Beat'} ${offset+i+1}`)}</small>)}</div>
    <RhythmScore measures={[groups.map(g=>g.notes)]} meter={groups.length} timeAligned cellTicks={groups.map(g=>g.step)} previousMeasure={offset?[compiled.groups[offset-1].notes]:undefined} position={position} progressStyle={progressStyle} stemDirection={stemDirection} label={t(`${offset+1}~${offset+groups.length}박 가이드 악보`,`Guide score for beats ${offset+1}–${offset+groups.length}`)}/>
    <div className="rt-guide-count-row">{groups.map((g,i)=><div key={i} className="rt-guide-counts" data-dense={g.cells.length>7||undefined} role="table" aria-label={t(`${offset+i+1}박 분할 표`,`Subdivisions of beat ${offset+i+1}`)}>
     <div role="row">{g.cells.map((cell,j)=><span role="columnheader" key={j} style={{left:`${guideCursorX(g.notes,cell.at-g.at,g.step)/180*100}%`}}>{cell.label}</span>)}</div>
     <div role="row">{g.cells.map((cell,j)=><span role="cell" key={j} data-action={cell.kind} aria-label={t(actions[cell.kind][1],actions[cell.kind][2])} style={{left:`${guideCursorX(g.notes,cell.at-g.at,g.step)/180*100}%`}}><b aria-hidden="true">{actions[cell.kind][0]}</b>{g.cells.length<=7&&<small>{t(actions[cell.kind][1],actions[cell.kind][2])}</small>}</span>)}</div>
    </div>)}</div>
   </article>;
  })}
 </div>;
}

export function GuideMobileScore(props){
 const [landscape,setLandscape]=useState(()=>matchMedia('(min-width:700px) and (max-height:600px) and (orientation:landscape)').matches);
 useEffect(()=>{const query=matchMedia('(min-width:700px) and (max-height:600px) and (orientation:landscape)');const update=()=>setLandscape(query.matches);query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
 return <GuideScoreRows {...props} perRow={landscape?props.compiled.groups.length:2}/>;
}

export function GuideDesktopScore(props){
 return <GuideScoreRows {...props} perRow={props.compiled.groups.length}/>;
}
