import {measureMeters,meterTicks} from './scoreMeters.js';
import {useEffect,useMemo,useRef,useState} from 'react';
import {chordProgression} from './arpeggioChords.js';
import {ArrowLeft,ChevronLeft,ChevronRight} from 'lucide-react';
import {CHORD_ACCIDENTAL_OPTIONS,CHORD_QUALITY_OPTIONS,CHORD_EXTENSION_OPTIONS,isChordExtensionAvailableForQuality,normalizeChordExtensionForQuality,getChordNameFromParts} from '../chords/chordSelection.js';
import {localizeUi,t} from '../i18n/core.js';
import {useLanguage} from '../i18n/react.jsx';
import './scoreChordDialog.css';
import './scoreChordNameDialog.css';

const roots=['C','D','E','F','G','A','B'];
const chordAt=(measure,onset)=>measure.harmonyChanges?.find(c=>c.onset===onset)?.name??(onset===0?measure.harmony??measure.chord?.name:null);

function initialSelection(name){
 for(const root of roots)for(const accidental of CHORD_ACCIDENTAL_OPTIONS)for(const quality of CHORD_QUALITY_OPTIONS)for(const extension of CHORD_EXTENSION_OPTIONS){
  if(isChordExtensionAvailableForQuality(extension,quality.id)&&getChordNameFromParts(root,accidental.id,quality.id,extension.id)===name)return {root,accidental:accidental.id,quality:quality.id,extension:extension.id};
 }
 return {root:'C',accidental:'natural',quality:'major',extension:'none'};
}
export default function ScoreChordNameDialog({document:score,bar,onset=0,mobile,onApply,onClose}){
 useLanguage();
 const ref=useRef(null),close=useRef(null);
 const progression=useMemo(()=>chordProgression(score),[score]);
 const startingName=chordAt(score.measures[bar],onset)??progression[bar]?.find(c=>c.onset===onset)?.name;
 const [target,setTarget]=useState(bar),[selection,setSelection]=useState(()=>initialSelection(startingName)),[selectedName,setSelectedName]=useState(startingName);
 const [tick,setTick]=useState(onset),[previousTick,setPreviousTick]=useState(onset),[nameEdited,setNameEdited]=useState(false),[notice,setNotice]=useState('');
 const meter=measureMeters(score)[target],capacity=meterTicks(meter);
 const {root,accidental,quality,extension}=selection;
 const originalName=chordAt(score.measures[target],previousTick);
 const name=(!nameEdited&&(originalName??selectedName))||getChordNameFromParts(root,accidental,quality,extension);
 const moveTarget=(next,carryName)=>{const nextName=chordAt(score.measures[next],0)??carryName??progression[next]?.find(c=>c.onset===0)?.name??name;setTarget(next);setTick(0);setPreviousTick(0);setSelection(initialSelection(nextName));setSelectedName(nextName);setNameEdited(false);};
 const apply=next=>{onApply(target,name,tick,previousTick,{keepOpen:next});if(next){const carryName=score.measures[target].harmonyChanges?.filter(c=>c.onset>tick&&c.onset!==previousTick).at(-1)?.name??name;setNotice(t('editor.chordSavedNext',{value1:target+1,value2:name,value3:target+2}));moveTarget(target+1,carryName);}};
 useEffect(()=>{const node=ref.current;if(mobile)node.show();else node.showModal();close.current?.focus({preventScroll:true});return()=>node.close();},[mobile]);
 const choose=(key,value)=>{setNameEdited(true);setSelection(s=>({...s,[key]:value,...(key==='quality'?{extension:normalizeChordExtensionForQuality(value,s.extension)}:{})}));};
 const category=quality==='minor'||quality==='dim'?'minor':'major';
 const extensions=CHORD_EXTENSION_OPTIONS.filter(item=>isChordExtensionAvailableForQuality(item,category)).map(item=>({id:item.id,quality:category,label:item.id==='none'?'기본':item.id==='maj7'?'M7':item.id==='maj9'?'M9':item.id==='maj11'?'M11':item.id==='maj13'?'M13':localizeUi(item.label)}));
 extensions.push(...(category==='major'?[{id:'none',quality:'aug',label:'aug'}]:[{id:'none',quality:'dim',label:'dim'},{id:'dim7',quality:'dim',label:'dim7'}]));
 const section=(label,key,items)=><fieldset><legend>{label}</legend><div className={`chordNameChoices chordNameChoices--${key}`}>{items.map(item=><button type="button" key={item.id} aria-pressed={selection[key]===item.id} onClick={()=>choose(key,item.id)}>{item.label}</button>)}</div></fieldset>;
 return <dialog ref={ref} className={`scoreChordDialog scoreChordNameDialog scoreChordDialog--${mobile?'mobile':'desktop'}`} aria-label="코드명 선택" onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onClose();}}} onCancel={e=>{e.preventDefault();onClose();}}>
  <header><button ref={close} type="button" aria-label="코드명 선택 닫기" onClick={onClose}><ArrowLeft size={22}/></button><h2>코드명 선택</h2>{mobile&&<output className="chordNamePreview" aria-live="polite">{name}</output>}{originalName&&<button type="button" aria-label="코드명 삭제" className="chordNameDelete" onClick={()=>onApply(target,null,previousTick,previousTick)}>삭제</button>}</header>
  <div className="chordDialogContent">
   {!mobile&&<output className="chordNamePreview" aria-live="polite">{name}</output>}
   <p className="chordNameTarget" aria-live="polite">{t('editor.chordEditingBar',{value1:target+1})}</p>
   {(score.measures[target].harmonyChanges?.length>1||previousTick>0)&&<label>코드 시작 위치<select aria-label="코드 시작 위치" value={tick} onChange={e=>setTick(Number(e.target.value))}>{Array.from({length:capacity/240},(_,i)=><option key={i} value={i*240}>{1+i*240/(1920/meter[1])}박</option>)}</select></label>}
   <div className="chordNameCategory" role="tablist" aria-label="코드 종류">{[['major','장조'],['minor','단조']].map(([id,label])=><button key={id} type="button" role="tab" aria-selected={category===id} aria-controls="chord-name-builder" id={`chord-name-tab-${id}`} onClick={()=>choose('quality',id)} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const next=id==='major'?'minor':'major';choose('quality',next);e.currentTarget.parentElement.querySelector(`#chord-name-tab-${next}`)?.focus();}}}>{label}</button>)}</div>
   <div className="chordNameFields" id="chord-name-builder" role="tabpanel" aria-labelledby={`chord-name-tab-${category}`}>{section('루트음','root',roots.map(id=>({id,label:id})))}
   {section('변화음','accidental',CHORD_ACCIDENTAL_OPTIONS.map(item=>({...item,label:item.id==='natural'?'♮':item.id==='flat'?'♭':'♯'})))}
   <fieldset><legend>확장 코드</legend><div className="chordNameChoices chordNameChoices--extension">{extensions.map(item=><button type="button" key={item.quality+item.id} aria-pressed={quality===item.quality&&extension===item.id} onClick={()=>{setNameEdited(true);setSelection(s=>({...s,quality:item.quality,extension:item.id}));}}>{item.label}</button>)}</div></fieldset>
   </div>
  </div>
  {notice&&<p className="chordNameNotice" role="status">{notice}</p>}
  <footer className={mobile?'mobileChordNameFooter':'desktopChordNameFooter'}><div className="chordTargetBar"><label htmlFor="chord-name-bar">적용할 마디</label><div><button type="button" aria-label="이전 적용 마디" disabled={target===0} onClick={()=>{setNotice('');moveTarget(target-1);}}><ChevronLeft size={18}/></button><select id="chord-name-bar" value={target} onChange={e=>{setNotice('');moveTarget(Number(e.target.value));}}>{score.measures.map((m,i)=><option key={m.id} value={i}>{i+1}마디{m.harmony?' · '+m.harmony:''}</option>)}</select><button type="button" aria-label="다음 적용 마디" disabled={target===score.measures.length-1} onClick={()=>{setNotice('');moveTarget(target+1);}}><ChevronRight size={18}/></button></div></div>
  <div className="chordNameActions"><button type="button" className="chordApply" onClick={()=>apply(false)}>{t('editor.chordInputDone')}</button><button type="button" className="chordApplyNext" disabled={target===score.measures.length-1} onClick={()=>apply(true)}>{t('editor.chordInputNext')} <ChevronRight size={16}/></button></div></footer>
 </dialog>;
}
