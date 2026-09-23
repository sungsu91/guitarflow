import { formatMessage } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { localizeUi } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import EditorChoiceMenu from './EditorChoiceMenu.jsx';
import DeviceConnection from '../input/DeviceConnection.jsx';
import {isFretted} from './scoreInstruments.js';
import {useCallback,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {changeTuning,maxFret,midiName,tabCandidates,tuningName,tuningPresets} from './scoreTuning.js';
import './editorSettings.css';

const KEY_PAIRS=[['Cb','Abm',-7],['Gb','Ebm',-6],['Db','Bbm',-5],['Ab','Fm',-4],['Eb','Cm',-3],['Bb','Gm',-2],['F','Dm',-1],['C','Am',0],['G','Em',1],['D','Bm',2],['A','F#m',3],['E','C#m',4],['B','G#m',5],['F#','D#m',6],['C#','A#m',7]];
function KeyControls({draft,setDraft}){
  useLanguage();
 const minor=draft.keySignature.endsWith('m'),column=minor?1:0;
 const pair=KEY_PAIRS.find(p=>p[column]===draft.keySignature)??KEY_PAIRS[7];
 const choose=keySignature=>setDraft(d=>({...d,keySignature}));
 return <section className="editorKeyControls" aria-label={translateUi("etudes.keySignatureSettings")}><strong><Translation id="etudes.keySignature" /></strong><div className="editorKeyModes" role="group" aria-label={translateUi("etudes.majorOrMinor")}><button type="button" aria-pressed={!minor} onClick={()=>choose(pair[0])}><Translation id="etudes.major" /></button><button type="button" aria-pressed={minor} onClick={()=>choose(pair[1])}><Translation id="etudes.minor" /></button></div><EditorChoiceMenu label={translateUi("etudes.chooseKeySignature")} value={draft.keySignature} onChange={choose} options={KEY_PAIRS.map(p=>({value:p[column],label:`${p[column].replace(/m$/,'')} ${minor?ko["etudes.minor"]:ko["etudes.major"]}`}))}/><small>{pair[2]===0?translateUi("etudes.noKeySignature"):translateUi("etudes.value2Value1", { value1: pair[2]>0?'♯':'♭', value2: Math.abs(pair[2]) })}</small></section>;
}

// Portalled into the modal editor (not body) so it remains in the top layer
// and inherits the active white/dark theme without copying theme state.
function EditorPopover({anchor,onClose,children,label}){
  useLanguage();
 const ref=useRef(null),[position,setPosition]=useState({visibility:'hidden'});
 useLayoutEffect(()=>{
  const v=window.visualViewport,editor=anchor.closest('dialog');
  const place=()=>{const a=anchor.getBoundingClientRect(),node=ref.current;if(!node)return;
   const top=(v?.offsetTop??0)+12,left=(v?.offsetLeft??0)+12,right=left+(v?.width??innerWidth)-24,bottom=top+(v?.height??innerHeight)-24;
   if(a.bottom<top||a.top>bottom){onClose(false);return;}
   const width=Math.min(340,right-left),above=a.top-top-12,below=bottom-a.bottom-12,up=below<Math.min(node.scrollHeight,320)&&above>below;
   const height=Math.max(80,up?above:below),x=Math.max(left,Math.min(a.left,right-width));
   setPosition({position:'fixed',left:x,top:up?Math.max(top,a.top-12-Math.min(node.scrollHeight,height)):a.bottom+12,width,maxHeight:height,'--tail-x':`${Math.max(14,Math.min(width-14,a.left+a.width/2-x))}px`,'--tail-top':up?'100%':'-7px'});
  };place();const observer=new ResizeObserver(place);observer.observe(ref.current);
  const outside=e=>{if(!ref.current.contains(e.target)&&!anchor.contains(e.target))onClose(false);};
  const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose(true);}if(e.key==='Tab'){const list=[...ref.current.querySelectorAll('button:not(:disabled),input,select')];if(!list.length)return;const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();anchor.focus({preventScroll:true});}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();onClose(true);}}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key,true);window.addEventListener('resize',place);v?.addEventListener('resize',place);editor.addEventListener('scroll',place,true);v?.addEventListener('scroll',place);
  ref.current.querySelector('button,input,select')?.focus({preventScroll:true});
  return()=>{observer.disconnect();document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key,true);window.removeEventListener('resize',place);v?.removeEventListener('resize',place);editor.removeEventListener('scroll',place,true);v?.removeEventListener('scroll',place);};
 },[anchor,onClose]);
 return createPortal(<section ref={ref} style={position} className="editorSettingsPopover" role="dialog" aria-label={localizeUi(label)} onKeyDown={e=>e.stopPropagation()}><div className="editorSettingsBody">{children}</div></section>,anchor.closest('dialog'));
}

export default function useEditorSettings(draft,setDraft,midi,mobile=false){
 const [menu,setMenu]=useState(null),[pending,setPending]=useState(null),[mode,setMode]=useState('pitch'),[custom,setCustom]=useState(null),[error,setError]=useState('');
 const anchor=useRef(null),layout=useRef(null);
 const close=useCallback((focus=false)=>{setMenu(null);setPending(null);setCustom(null);setError('');if(focus)anchor.current?.focus({preventScroll:true});},[]);
 const open=(id,e)=>{if(menu===id){close();return;}anchor.current=e.currentTarget;setMenu(id);setPending(null);setCustom(null);setError('');};
 const request=settings=>{try{const hasNotes=draft.measures.some(m=>m.events.some(e=>e.notes.length));if(hasNotes){setPending(settings);setMode('pitch');}else{setDraft(changeTuning(draft,settings).document);close(true);}}catch(e){setError(e.message);}};
 let preview=null;try{if(pending)preview=changeTuning(draft,pending,mode,{reassignLocked:true});}catch(e){preview={error:e.message};}
 const issues=draft.measures.flatMap((m,b)=>m.events.flatMap((e,i)=>e.notes.filter(n=>n.unplaced||n.outsidePreferred).map(n=>({n,b,i}))));
 const tuning=isFretted(draft.instrument)&&<button type="button" className="editorTuningButton" aria-expanded={menu==='tuning'} aria-haspopup="dialog" onClick={e=>open('tuning',e)}>{localizeUi(tuningName(draft),{[ko["etudes.standardTuning"]]:"editor.standardTuningCompact"})} ▾</button>;
 const capo=isFretted(draft.instrument)&&<button type="button" aria-expanded={menu==='capo'} aria-haspopup="dialog" onClick={e=>open('capo',e)}>{mobile?`${draft.keySignature} · `:''}{draft.capo?translateUi("etudes.capoValue1", { value1: draft.capo }):translateUi("etudes.noCapo")} ▾</button>;
 const edit=(active,onToggle,disabled)=>{layout.current={active,onToggle,disabled};return <button type="button" aria-expanded={menu==='edit'} aria-haspopup="dialog" onClick={e=>open('edit',e)}><Translation id="etudes.edit" /></button>;};
 const popup=menu&&<EditorPopover anchor={anchor.current} onClose={close} label={menu==='tuning'?translateUi("etudes.tuningSettings"):menu==='capo'?(mobile?translateUi("etudes.keyAndCapoSettings"):translateUi("etudes.capoSettings")):translateUi("etudes.editMenu")}>
  <header><strong>{menu==='tuning'?translateUi("etudes.tuning"):menu==='capo'?(mobile?translateUi("etudes.keyCapo"):translateUi("etudes.capo")):translateUi("common.edit")}</strong><button type="button" aria-label={translateUi("etudes.closeEditingSettings")} onClick={()=>close(true)}>×</button></header>
  {pending?<><fieldset><legend><Translation id="etudes.existingNotes" /></legend>{[['pitch',ko["etudes.keepPitch"]],['fingering',ko["etudes.keepFingering"]]].map(([id,label])=><label key={id}><input type="radio" name="tuning-change-mode" checked={mode===id} onChange={()=>setMode(id)}/>{localizeUi(label)}</label>)}</fieldset><p>{mode==='pitch'?translateUi("etudes.keepSoundingPitchesAndRecalculateTabPositionsForTheNewCapoOr"):translateUi("etudes.keepStringsAndCapoRelativeFretsChangingSoundingPitches")}</p>{preview?.conflicts?.length>0&&<p role="alert"><Translation id="etudes.manualFingerings" />{preview.conflicts.length}<Translation id="etudes.recalculated" />{preview.conflicts.slice(0,4).join(', ')}<Translation id="etudes.applyingChangesTheseStringsAndFrets" /></p>}{preview?.unplaced>0&&<p role="status"><Translation id="etudes.noTabPositionFor" />{preview.unplaced}<Translation id="etudes.notesOriginalPitchKept" /></p>}{preview?.error&&<p role="alert">{localizeUi(preview.error)}</p>}<button type="button" disabled={!preview||Boolean(preview.error)} onClick={()=>{setDraft(preview.document);close(true);}}>{mode==='pitch'&&preview?.conflicts?.length?translateUi("etudes.recalculateAndApply"):translateUi("etudes.applyChanges")}</button><button type="button" onClick={()=>setPending(null)}><Translation id="common.cancel" /></button></>:
   menu==='tuning'?<>{tuningPresets(draft.instrument).map(p=><button type="button" key={p.id} aria-pressed={tuningName(draft)===p.label} onClick={()=>request({tuning:p.tuning})}>{localizeUi(p.label)}</button>)}<button type="button" onClick={()=>setCustom([...draft.tuning])}><Translation id="etudes.custom" /></button>{custom&&<><p>{custom.length}<Translation id="etudes.1stStringSoundingOpenStringPitch" /></p>{[...custom].reverse().map((pitch,index)=>{const i=custom.length-1-index;return <label key={i}>{i+1}<Translation id="etudes.stringEditorSettings" /><select aria-label={translateUi("etudes.stringValue1OpenPitch", { value1: i+1 })} value={pitch} onChange={e=>setCustom(t=>t.map((n,j)=>i===j?Number(e.target.value):n))}>{Array.from({length:65},(_,k)=>k+24).map(n=><option key={n} value={n}>{midiName(n)}</option>)}</select></label>;})}<button type="button" onClick={()=>request({tuning:custom})}><Translation id="etudes.applyCustomTuning" /></button></>}<small>{draft.tuning.length}<Translation id="etudes.1stString" />{[...draft.tuning].reverse().map(midiName).join(' · ')}</small></>:
   menu==='capo'?<>{mobile&&<KeyControls draft={draft} setDraft={setDraft}/>}<label className="editorCapoSelect"><Translation id="etudes.capo" /><EditorChoiceMenu label={translateUi("etudes.chooseCapo")} value={draft.capo??0} onChange={capo=>{if(capo!==(draft.capo??0))request({capo});}} options={Array.from({length:Math.min(12,maxFret(draft))+1},(_,n)=>({value:n,label:n?formatMessage(ko["app.fretValue1"], { value1: n }):ko["app.none"]}))}/></label><p><Translation id="etudes.tab0OpenAtCapoHighestPhysicalFret" />{maxFret(draft)}<Translation id="app.fret" /></p></>:
   <><fieldset><legend><Translation id="etudes.editLines" /></legend><button type="button" disabled={layout.current?.disabled} aria-pressed={layout.current?.active} onClick={()=>{layout.current?.onToggle();close(true);}}><Translation id="etudes.editScoreLineBreaks" /></button>{layout.current?.disabled&&<small><Translation id="etudes.splitLinesWhenShowing2OrMoreBarsPerLine" /></small>}</fieldset>
    {isFretted(draft.instrument)&&<fieldset><legend><Translation id="etudes.autoTab" /></legend><label><Translation id="app.position" /><select aria-label={translateUi("etudes.autoTabPosition")} value={draft.autoTab?.mode??'auto'} onChange={e=>setDraft(d=>({...d,autoTab:{min:0,max:12,...d.autoTab,mode:e.target.value}}))}><option value="auto"><Translation id="etudes.auto" /></option><option value="range"><Translation id="etudes.preferredFretRange" /></option></select></label>{draft.autoTab?.mode==='range'&&<div className="editorFretRange">{[['min',ko["etudes.min"]],['max',ko["etudes.max"]]].map(([key,label])=><label key={key}>{localizeUi(label)}<input aria-label={translateUi("etudes.preferredFretValue1", { value1: label })} type="number" min="0" max={maxFret(draft)-(draft.capo??0)} value={draft.autoTab[key]} onChange={e=>{const value=Math.max(0,Math.min(maxFret(draft)-(draft.capo??0),Number(e.target.value)));setDraft(d=>({...d,autoTab:{...d.autoTab,[key]:value,[key==='min'?'max':'min']:key==='min'?Math.max(value,d.autoTab.max):Math.min(value,d.autoTab.min)}}));}}/></label>)}</div>}<small><Translation id="etudes.fretsRelativeToCapoAppliesToNewInputManualFingeringsKept" /></small></fieldset>}
    <DeviceConnection scope="score" mobile={mobile}/>
    {issues.length>0&&<fieldset><legend><Translation id="etudes.checkTabPositions" /></legend>{issues.map(({n,b,i})=><div key={n.id}><p>{b+1}<Translation id="etudes.bar" />{i+1}<Translation id="etudes.notes" />{midiName(n.midi)} · {n.unplaced?(tabCandidates(draft,n.midi).length?translateUi("etudes.checkFingering"):translateUi("etudes.unplayableWithCurrentSettings")):translateUi("etudes.outsidePreferredRange")}</p>{n.unplaced&&tabCandidates(draft,n.midi).filter(c=>!draft.measures[b].events[i].notes.some(other=>other!==n&&!other.unplaced&&other.string===c.string)).map(c=><button type="button" key={c.string} onClick={()=>setDraft(d=>({...d,measures:d.measures.map((m,bi)=>bi!==b?m:{...m,events:m.events.map((e,ei)=>ei!==i?e:{...e,notes:e.notes.map(t=>t.id===n.id?{...t,...c,harmonic:false,unplaced:false,locked:true,outsidePreferred:false}:t)})})}))}>{c.string}<Translation id="components.string" />{c.fret}<Translation id="etudes.confirmFret" /></button>)}</div>)}</fieldset>}
   </>}
  {error&&<p role="alert">{localizeUi(error)}</p>}
 </EditorPopover>;
 return {tuning,capo,edit,popup,isOpen:Boolean(menu)};
}
