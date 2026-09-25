import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ChevronLeft,ChevronRight} from 'lucide-react';
import {CHORD_ACCIDENTAL_OPTIONS,CHORD_QUALITY_OPTIONS,CHORD_EXTENSION_OPTIONS,isChordExtensionAvailableForQuality,normalizeChordExtensionForQuality,getChordNameFromParts} from '../chords/chordSelection.js';
import {localizeUi} from '../i18n/core.js';
import './scoreChordDialog.css';
import './scoreChordNameDialog.css';

const roots=['C','D','E','F','G','A','B'];

function initialSelection(name){
 for(const root of roots)for(const accidental of CHORD_ACCIDENTAL_OPTIONS)for(const quality of CHORD_QUALITY_OPTIONS)for(const extension of CHORD_EXTENSION_OPTIONS){
  if(isChordExtensionAvailableForQuality(extension,quality.id)&&getChordNameFromParts(root,accidental.id,quality.id,extension.id)===name)return {root,accidental:accidental.id,quality:quality.id,extension:extension.id};
 }
 return {root:'C',accidental:'natural',quality:'major',extension:'none'};
}
export default function ScoreChordNameDialog({document:score,bar,mobile,onApply,onClose}){
 const ref=useRef(null),close=useRef(null);
 const [target,setTarget]=useState(bar),[selection,setSelection]=useState(()=>initialSelection(score.measures[bar].harmony));
 const {root,accidental,quality,extension}=selection;
 const name=getChordNameFromParts(root,accidental,quality,extension);
 useEffect(()=>{const node=ref.current;node.show();close.current?.focus({preventScroll:true});return()=>node.close();},[]);
 const choose=(key,value)=>setSelection(s=>({...s,[key]:value,...(key==='quality'?{extension:normalizeChordExtensionForQuality(value,s.extension)}:{})}));
 const category=quality==='minor'||quality==='dim'?'minor':'major';
 const extensions=CHORD_EXTENSION_OPTIONS.filter(item=>isChordExtensionAvailableForQuality(item,category)).map(item=>({id:item.id,quality:category,label:item.id==='none'?'기본':item.id==='maj7'?'M7':item.id==='maj9'?'M9':item.id==='maj11'?'M11':item.id==='maj13'?'M13':localizeUi(item.label)}));
 extensions.push(...(category==='major'?[{id:'none',quality:'aug',label:'aug'}]:[{id:'none',quality:'dim',label:'dim'},{id:'dim7',quality:'dim',label:'dim7'}]));
 const section=(label,key,items)=><fieldset><legend>{label}</legend><div className={`chordNameChoices chordNameChoices--${key}`}>{items.map(item=><button type="button" key={item.id} aria-pressed={selection[key]===item.id} onClick={()=>choose(key,item.id)}>{item.label}</button>)}</div></fieldset>;
 return <dialog ref={ref} className={`scoreChordDialog scoreChordNameDialog scoreChordDialog--${mobile?'mobile':'desktop'}`} aria-label="코드명 선택" onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onClose();}}} onCancel={e=>{e.preventDefault();onClose();}}>
  <header><button ref={close} type="button" aria-label="코드명 선택 닫기" onClick={onClose}><ArrowLeft size={22}/></button><h2>코드명 선택</h2>{mobile&&<output className="chordNamePreview" aria-live="polite">{name}</output>}{score.measures[target].harmony&&<button type="button" aria-label="코드명 삭제" className="chordNameDelete" onClick={()=>onApply(target,null)}>삭제</button>}</header>
  <div className="chordDialogContent">
   {!mobile&&<output className="chordNamePreview" aria-live="polite">{name}</output>}
   <div className="chordNameCategory" role="tablist" aria-label="코드 종류">{[['major','장조'],['minor','단조']].map(([id,label])=><button key={id} type="button" role="tab" aria-selected={category===id} aria-controls="chord-name-builder" id={`chord-name-tab-${id}`} onClick={()=>choose('quality',id)} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const next=id==='major'?'minor':'major';choose('quality',next);e.currentTarget.parentElement.querySelector(`#chord-name-tab-${next}`)?.focus();}}}>{label}</button>)}</div>
   <div className="chordNameFields" id="chord-name-builder" role="tabpanel" aria-labelledby={`chord-name-tab-${category}`}>{section('루트음','root',roots.map(id=>({id,label:id})))}
   {section('변화음','accidental',CHORD_ACCIDENTAL_OPTIONS.map(item=>({...item,label:item.id==='natural'?'♮':item.id==='flat'?'♭':'♯'})))}
   <fieldset><legend>확장 코드</legend><div className="chordNameChoices chordNameChoices--extension">{extensions.map(item=><button type="button" key={item.quality+item.id} aria-pressed={quality===item.quality&&extension===item.id} onClick={()=>setSelection(s=>({...s,quality:item.quality,extension:item.id}))}>{item.label}</button>)}</div></fieldset>
   </div>
  </div>
  <footer><div className="chordTargetBar"><label htmlFor="chord-name-bar">적용할 마디</label><div><button type="button" aria-label="이전 적용 마디" disabled={target===0} onClick={()=>setTarget(n=>n-1)}><ChevronLeft size={18}/></button><select id="chord-name-bar" value={target} onChange={e=>setTarget(Number(e.target.value))}>{score.measures.map((m,i)=><option key={m.id} value={i}>{i+1}마디{m.harmony?' · '+m.harmony:''}</option>)}</select><button type="button" aria-label="다음 적용 마디" disabled={target===score.measures.length-1} onClick={()=>setTarget(n=>n+1)}><ChevronRight size={18}/></button></div></div>
  <button type="button" className="chordApply" onClick={()=>onApply(target,name)}>불러오기</button></footer>
 </dialog>;
}
