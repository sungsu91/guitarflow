import {useEffect,useRef,useState} from 'react';
import {FolderOpen,X} from 'lucide-react';
import {t,localizeUi} from '../i18n/core.js';
import {Translation,useLanguage} from '../i18n/react.jsx';
import {scoreInstrument} from './scoreInstruments.js';
import './scoreOpen.css';

export default function ScoreOpenDialog({records,onOpen,onImportFile,onClose}) {
 useLanguage();
 const ref=useRef(null),file=useRef(null),[query,setQuery]=useState('');
 useEffect(()=>{const dialog=ref.current;dialog.showModal();return()=>dialog.close();},[]);
 const search=query.trim().toLocaleLowerCase();
 const scores=records.filter(r=>r.status!=='unreadable').sort((a,b)=>String(b.updatedAt??'').localeCompare(String(a.updatedAt??'')));
 const matches=scores.filter(({document:d})=>`${d.title} ${d.artist??''}`.toLocaleLowerCase().includes(search));
 return <dialog ref={ref} className="scoreOpenDialog" aria-labelledby="score-open-title" onKeyDown={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();e.stopPropagation();onClose();}}>
  <div className="scoreOpenHeading"><h2 id="score-open-title"><Translation id="editor.openCreatedScores" /></h2><button type="button" aria-label={t('common.close')} onClick={onClose}><X size={20}/></button></div>
  <p><Translation id="editor.chooseSavedScore" /></p>
  {onImportFile&&<><button type="button" onClick={()=>file.current?.click()}>제작 악보 파일(.json) 불러오기</button><input ref={file} type="file" accept=".json,application/json" aria-label="제작 악보 파일 선택" hidden onChange={e=>{if(e.target.files?.length){onImportFile(e);onClose();}}}/></>}
  <input autoFocus type="search" aria-label={t('etudes.searchScores')} placeholder={t('etudes.searchScores')} value={query} onChange={e=>setQuery(e.target.value)}/>
  <ul className="scoreOpenList">
   {matches.map(({document:d,status})=><li key={d.id}><button type="button" className="scoreOpenItem" onClick={()=>onOpen(d)}>
    <FolderOpen size={21} aria-hidden="true"/><span className="scoreOpenDescription"><strong>{d.title}</strong><small>{localizeUi(scoreInstrument(d.instrument).label)} · {d.bpm} BPM · {d.meter.join('/')} {d.artist&&`· ${d.artist}`}</small></span><span className="scoreOpenStatus">{t(status==='draft'?'editor.savedDraft':'pdf.saved')}</span>
   </button></li>)}
  </ul>
  {!matches.length&&<p className="scoreOpenEmpty" role="status"><Translation id={scores.length?'etudes.noResultsFound':'editor.noCreatedScores'} /></p>}
 </dialog>;
}
