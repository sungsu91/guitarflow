import {useRef,useState} from 'react';
import usePracticeLayout from './usePracticeLayout.js';
import ScorePlayback from './ScorePlayback.jsx';
import PracticeFloatingTools from './PracticeFloatingTools.jsx';
import {METRONOME_TONE_OPTIONS} from '../metronome/options.js';
import {getMetronomeSubdivisionOption} from '../metronome/subdivision.js';
// Separate hook instances retain each screen's own score, tempo and view preferences.
export default function usePracticeSession(selected,bpm,updateBpm,scope='etude'){
 const [playPosition,setPlayPosition]=useState(null),controller=useRef(null),layout=usePracticeLayout();
 const [followMode,setFollowMode]=useState('line'),[zoom,setZoom]=useState(1),[toolsVisible,setToolsVisible]=useState(true);
 const [measuresPerRow,setMeasuresPerRow]=useState(0),[hudTarget,setHudTarget]=useState(null);
 const [metroMinimized,setMetroMinimized]=useState(false);
 const minimizeMetro=()=>{setToolsVisible(false);setMetroMinimized(true);};
 const toggleMetro=()=>{if(toolsVisible||metroMinimized){controller.current?.stop();setToolsVisible(false);setMetroMinimized(false);}else setToolsVisible(true);};
 const [backingTarget,setBackingTarget]=useState(null),[backingOpen,setBackingOpen]=useState(false),[tipsOpen,setTipsOpen]=useState(false);
 const [notationView,setNotationView]=useState(selected?.document?.viewSettings?.notationView??'tab');
 const [repeatCount,setRepeatCount]=useState(0);
 const [subdivision,setSubdivision]=useState('quarter'),[tone,setTone]=useState('tick');
 return {compactTools:true,repeatCount,setRepeatCount,measuresPerRow,setMeasuresPerRow,hudTarget,setHudTarget,metroMinimized,setMetroMinimized,minimizeMetro,toggleMetro,scope,selected,bpm,setBpm:v=>updateBpm(Math.min(240,Math.max(30,Math.round(Number(v)||30)))),playPosition,setPlayPosition,controller,layout,followMode,setFollowMode,zoom,setZoom,toolsVisible,setToolsVisible,backingTarget,setBackingTarget,backingOpen,setBackingOpen,tipsOpen,setTipsOpen,notationView,setNotationView,subdivision,setSubdivision,tone,setTone};
}
export function PracticeSessionPlayback({model,mobile,disabled=false}){
 return <ScorePlayback practice repeatCount={model.repeatCount} controller={model.controller} score={model.selected} bpm={model.bpm} onBpm={model.setBpm} disabled={disabled} onPosition={model.setPlayPosition} metroOptions={{toneSrc:METRONOME_TONE_OPTIONS.find(o=>o.id===model.tone)?.src,clicksPerBeat:getMetronomeSubdivisionOption(model.subdivision).clicksPerBeat}} renderPractice={controls=><div className="etudeFloatingTheme"><PracticeFloatingTools model={model} mobile={mobile} practiceControls={controls}/></div>}/>;
}
