import {useEffect,useRef,useState} from 'react';
import usePracticeLayout from './usePracticeLayout.js';
import ScorePlayback from './ScorePlayback.jsx';
import PracticeFloatingTools from './PracticeFloatingTools.jsx';
import {METRONOME_TONE_OPTIONS} from '../metronome/options.js';
import {getMetronomeSubdivisionOption} from '../metronome/subdivision.js';
// Separate hook instances retain each screen's own score, tempo and view preferences.
export default function usePracticeSession(selected,bpm,updateBpm,scope='etude'){
 const [playPosition,setPlayPosition]=useState(null),controller=useRef(null),layout=usePracticeLayout();
 const [followMode,setFollowMode]=useState('fingering'),[zoom,setZoom]=useState(1),[toolsVisible,setToolsVisible]=useState(true);
 const [measuresPerRow,setMeasuresPerRow]=useState(0),[hudTarget,setHudTarget]=useState(null);
 const [mobileMeasuresPerRow,setMobileMeasuresPerRow]=useState(0);
 const [metroMinimized,setMetroMinimized]=useState(false);
 const [desktopDockTarget,setDesktopDockTarget]=useState(null);
 const [countIn,setCountInEnabled]=useState(true);
 const setCountIn=value=>{controller.current?.stop();setCountInEnabled(value);};
 const minimizeMetro=()=>{setToolsVisible(false);setMetroMinimized(true);};
 const toggleMetro=()=>{if(toolsVisible||metroMinimized){controller.current?.stop();setToolsVisible(false);setMetroMinimized(false);}else setToolsVisible(true);};
 const [backingTarget,setBackingTarget]=useState(null),[backingOpen,setBackingOpen]=useState(false),[tipsOpen,setTipsOpen]=useState(false);
 const [notationView,setNotationView]=useState(selected?.document?.viewSettings?.notationView??'tab');
 const defaultRepeatCount=selected?.document?.playback?.repeatCount??1;
 const [repeatCount,setRepeatCount]=useState(defaultRepeatCount),[loopRange,updateLoopRange]=useState(null),[startBar,setStartBar]=useState(0);
 const setLoopRange=range=>{updateLoopRange(range);if(range)setRepeatCount(0);else setRepeatCount(defaultRepeatCount);};
 useEffect(()=>{updateLoopRange(null);setStartBar(0);setRepeatCount(defaultRepeatCount);},[selected?.id,defaultRepeatCount]);
 useEffect(()=>{if(selected?.document?.pdfTabImport?.sourceType==='pdf'){setMeasuresPerRow(0);setMobileMeasuresPerRow(0);}},[selected?.id]);
 const selectBar=bar=>{const selected=loopRange?Math.max(loopRange.start,Math.min(loopRange.end,bar)):bar;setStartBar(selected);controller.current?.seek({bar:selected,event:0});};
 const [subdivision,setSubdivision]=useState('quarter'),[tone,setTone]=useState('tick');
 return {desktopDockTarget,setDesktopDockTarget,countIn,setCountIn,loopRange,setLoopRange,startBar,selectBar,compactTools:true,repeatCount,setRepeatCount,measuresPerRow,setMeasuresPerRow,mobileMeasuresPerRow,setMobileMeasuresPerRow,hudTarget,setHudTarget,metroMinimized,setMetroMinimized,minimizeMetro,toggleMetro,scope,selected,bpm,setBpm:v=>updateBpm(Math.min(240,Math.max(30,Math.round(Number(v)||30)))),playPosition,setPlayPosition,controller,layout,followMode,setFollowMode,zoom,setZoom,toolsVisible,setToolsVisible,backingTarget,setBackingTarget,backingOpen,setBackingOpen,tipsOpen,setTipsOpen,notationView,setNotationView,subdivision,setSubdivision,tone,setTone};
}
export function PracticeSessionPlayback({model,mobile,disabled=false,playbackScore}){
 return <ScorePlayback practice countIn={model.countIn} metronomeOnly={model.followMode==='off'} practiceRange={model.loopRange} startAt={{bar:model.startBar,event:0}} repeatCount={model.repeatCount} controller={model.controller} score={playbackScore??model.selected} bpm={model.bpm} onBpm={model.setBpm} disabled={disabled} onPosition={model.setPlayPosition} metroOptions={{toneSrc:METRONOME_TONE_OPTIONS.find(o=>o.id===model.tone)?.src,clicksPerBeat:getMetronomeSubdivisionOption(model.subdivision).clicksPerBeat}} renderPractice={controls=><div className="etudeFloatingTheme"><PracticeFloatingTools model={model} mobile={mobile} practiceControls={{...controls,countIn:model.countIn,onCountInChange:model.setCountIn}}/></div>}/>;
}
