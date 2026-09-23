import { localizeUi } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {isFretted,PIANO_STAFF_LAYOUTS,pianoStaffLayout} from './scoreInstruments.js';
import {useEffect,useRef,useState} from 'react';
import {scoreMetadata} from './scoreMetadata.js';
import './scoreSave.css';

export default function ScoreSaveDialog({document,onSave,onClose,mode='save'}){
  useLanguage();
 const editing=mode==='edit';
 const [meter,setMeter]=useState(document.meter.join('/')),[keySignature,setKeySignature]=useState(document.keySignature),[view,setView]=useState(document.viewSettings?.notationView??'tab');
 const [pianoLayout,setPianoLayout]=useState(pianoStaffLayout(document.viewSettings?.pianoStaffLayout));
 const ref=useRef(null),[title,setTitle]=useState(document.title),[artist,setArtist]=useState(document.artist??''),[bpm,setBpm]=useState(document.bpm),[error,setError]=useState('');
 useEffect(()=>{const dialog=ref.current;dialog.showModal();return()=>dialog.close();},[]);
 const submit=e=>{e.preventDefault();try{onSave(scoreMetadata({...document,meter:meter.split('/').map(Number),keySignature,viewSettings:{...document.viewSettings,...(document.instrument==='piano'?{pianoStaffLayout:pianoLayout}:{}),notationView:isFretted(document.instrument)?view:'staff'}},{title,artist,bpm}));}catch(e){setError(e.message);}};
 return <dialog ref={ref} className="scoreSaveDialog" aria-label={editing?translateUi("etudes.scoreSettings"):translateUi("etudes.scoreSaveDetails")} onKeyDown={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();e.stopPropagation();onClose();}}>
  <form onSubmit={submit}><h2>{editing?translateUi("etudes.scoreSettings"):translateUi("etudes.saveScore")}</h2><p>{editing?translateUi("etudes.appliesToTheCurrentEditUseSaveAtTheTopToFinish"):translateUi("etudes.theTitleAndSongDetailsAppearAtTheTopOfTheFirst")}</p>
   <label><Translation id="etudes.scoreTitle" /><input autoFocus required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <label><Translation id="etudes.composerArtist" /><small><Translation id="metadata.optional" /></small><input maxLength={200} value={artist} onChange={e=>setArtist(e.target.value)}/></label>
   <label><Translation id="originalUi.bpm" /><input required type="number" min={30} max={240} step={1} value={bpm} onChange={e=>setBpm(e.target.value)}/></label>
   <div className="scoreSettingsGrid"><label><Translation id="etudes.timeSignature" /><select aria-label={translateUi("etudes.timeSignature")} value={meter} onChange={e=>setMeter(e.target.value)}>{[...new Set(['2/4','3/4','4/4','6/8',document.meter.join('/')])].map(v=><option key={v}>{v}</option>)}</select></label>{document.instrument!=='drums'&&<label><Translation id="etudes.keySignatureScoreEditor" /><select aria-label={translateUi("etudes.keySignatureScoreEditor")} value={keySignature} onChange={e=>setKeySignature(e.target.value)}>{[...new Set(['C','G','D','A','E','B','F','Bb','Eb','Am','Em','Dm','Gm',document.keySignature])].map(v=><option key={v}>{v}</option>)}</select></label>}</div>
   {document.instrument==='piano'?<label><Translation id="etudes.pianoStaffLayout" /><select aria-label={translateUi("etudes.pianoStaffLayout")} value={pianoLayout} onChange={e=>setPianoLayout(e.target.value)}>{PIANO_STAFF_LAYOUTS.map(o=><option key={o.value} value={o.value}>{localizeUi(o.label)}</option>)}</select></label>:<label><Translation id="etudes.staffView" /><select aria-label={translateUi("etudes.staffView")} value={view} onChange={e=>setView(e.target.value)}>{isFretted(document.instrument)&&<><option value="tab"><Translation id="etudes.tabOnly" /></option><option value="both"><Translation id="etudes.staffTab" /></option></>}<option value="staff"><Translation id="etudes.staffOnly" /></option></select></label>}
   {error&&<p role="alert">{localizeUi(error)}</p>}<footer><button type="button" onClick={onClose}><Translation id="common.cancel" /></button><button type="submit">{editing?translateUi("app.apply"):translateUi("etudes.save")}</button></footer>
  </form>
 </dialog>;
}
