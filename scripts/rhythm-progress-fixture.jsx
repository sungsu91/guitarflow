import React from 'react';
import {createRoot} from 'react-dom/client';
import Score from '../src/etudes/Score.jsx';
import Playback from '../src/etudes/ScorePlayback.jsx';
import Control from '../src/etudes/FollowPatternControl.jsx';
import {createBlankDocument,compileDocumentV2,newId} from '../src/etudes/scoreModel.js';
import {playbackSlots,slotAtTick} from '../src/etudes/scorePlaybackPosition.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import '../src/etudes/practiceDesign.css';
export function mount(width){
 const d=createBlankDocument();const e=(onset,duration,extra={})=>({id:newId(),onset,duration,rest:false,notes:[{id:newId(),string:1,fret:0}],...extra});
 const triplet={groupId:'trip',actualNotes:3,normalNotes:2};
 d.measures=[{id:newId(),events:[e(0,'8'),e(240,'16',{beamBefore:'join'}),e(360,'8',{dotted:true}),...[720,880,1040].map(t=>e(t,'8',{tuplet:triplet,rest:t===880})),e(1200,'8',{dotted:true,rest:true}),e(1560,'8',{dotted:true})]},
 {id:newId(),events:[e(0,'8',{technique:'H'}),e(240,'8',{technique:'P',notes:[{id:newId(),string:1,fret:2}]}),e(480,'8',{technique:'S'}),e(720,'8',{notes:[{id:newId(),string:1,fret:5}]}),e(960,'2',{palmMute:true,vibrato:true,pickStroke:'down'})]},
 {id:newId(),events:[e(0,'1')]},{id:newId(),events:[e(0,'1')]}];
 for(const b of [2,3])d.measures[b].events[0].notes.push({id:newId(),string:2,fret:1});
 d.measures[2].events[0].tieTo=d.measures[3].events[0].id;
 const compiled=compileDocumentV2(d);if(compiled.errors.length)throw Error(compiled.errors.join());const score=compiled.score,slots=playbackSlots(score,scoreTimeline(score).order);
 document.body.replaceChildren();document.body.style.cssText='display:block!important;margin:0;background:#faf7f1;width:100%!important';
 const style=document.createElement('style');style.textContent='.etudeScoreViewport{height:320px!important;overflow:auto!important}.etudeNotation{width:100%}';document.head.append(style);
 const host=document.createElement('div');document.body.append(host);const h=React.createElement,controller={current:null};let tick=0;
 function Harness(){const [view,setView]=React.useState('tab'),[zoom,setZoom]=React.useState(1),[follow,setFollow]=React.useState('off'),[rhythm,setRhythm]=React.useState(true),[manual,setManual]=React.useState(true),[position,setPosition]=React.useState(null),[bpm,setBpm]=React.useState(120),[subdivision,setSubdivision]=React.useState(1);
 const manualPosition=React.useMemo(()=>({playing:true,getTimelineTick:()=>tick,getCurrentSlot:()=>slotAtTick(slots,tick)}),[]);
 window.rhythmTest={score,slots,controller,setView,setZoom,setFollow,setRhythm,setManual,setBpm,setSubdivision,setTick:v=>tick=v,get position(){return position;},get controls(){return window.practiceControls;}};
 return h('div',{className:'etudePracticeLayout etudeCompactTools'},h(Control,{value:follow,onChange:setFollow,rhythm,onRhythmChange:setRhythm}),h(Playback,{practice:true,score,bpm,onBpm:setBpm,onPosition:setPosition,controller,repeatCount:0,metroOptions:{clicksPerBeat:subdivision},renderPractice:c=>{window.practiceControls=c;return h('button',{onClick:c.onStart},'테스트 연습 시작');}}),h('div',{className:'etudeScoreViewport'},h(Score,{etude:score,mobile:width<600,bpm,view,zoom,responsive:true,measuresPerRow:1,followMode:follow,rhythmProgress:rhythm,playPosition:manual?manualPosition:position})));}
 createRoot(host).render(h(Harness));
}
