import {useMemo,useState} from 'react';
import {useLanguage} from '../i18n/react.jsx';
import {planArpeggio,arpeggioFitsMeter,ARPEGGIO_PATTERNS} from './arpeggioPattern.js';
import {chordProgression} from './arpeggioChords.js';
import {measureMeters} from './scoreMeters.js';

export default function useArpeggioControls(document,currentBar,onApply,onEditChord){
 const language=useLanguage();
 const [scope,setScope]=useState('bar'),[lastBar,setLastBar]=useState(currentBar);
 const [pattern,setPattern]=useState(()=>ARPEGGIO_PATTERNS.find(p=>arpeggioFitsMeter(p.id,measureMeters(document)[currentBar]))?.id??'bass-313');
 const endBar=Math.max(currentBar,Math.min(lastBar,document.measures.length-1));
 const options={start:scope==='all'?0:currentBar,end:scope==='all'?document.measures.length-1:scope==='range'?endBar:currentBar,pattern};
 const progression=useMemo(()=>chordProgression(document),[document]);
 const missingBar=progression.findIndex((changes,i)=>i>=options.start&&i<=options.end&&(changes[0]?.onset!==0||changes.some(c=>!c.shape)));
 const needsChord=missingBar!==-1;
 const meters=measureMeters(document).slice(options.start,options.end+1);
 const compatiblePatterns=ARPEGGIO_PATTERNS.filter(p=>meters.every(m=>arpeggioFitsMeter(p.id,m))).map(p=>p.id);
 const preview=useMemo(()=>{try{return {plans:planArpeggio(document,options),error:''};}catch(e){return {plans:[],error:e.message};}},[document,options.start,options.end,pattern,language]);
 return {pattern,setPattern,patternSpec:ARPEGGIO_PATTERNS.find(p=>p.id===pattern),compatiblePatterns,scope,setScope,needsChord,hasBarChords:missingBar===-1,endBar,setEndBar:setLastBar,currentBar,measures:document.measures,progressionLabel:progression.slice(options.start,options.end+1).flatMap((changes,i)=>changes.filter(c=>!c.inherited||i===0).map(c=>`${options.start+i+1}: ${c.name}`)).join(' → '),...preview,onApply:()=>onApply(options),onEditChord:()=>onEditChord(missingBar===-1?options.start:missingBar)};
}
