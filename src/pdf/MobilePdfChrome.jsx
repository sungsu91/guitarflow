import { t as translateUi } from "./../i18n/core.js";
import { localizeUi } from '../i18n/core.js';
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,MoreVertical,LocateFixed} from 'lucide-react';
import './mobilePdfChrome.css';

export function MobilePdfHeader({title,editing,onBack,onLocate,canLocate,onDone,onAction,saveState,page,pageCount,original}){
  useLanguage();
 const [menu,setMenu]=useState(false),root=useRef(null);
 useEffect(()=>{const close=e=>{if(!root.current?.contains(e.target))setMenu(false);};document.addEventListener('pointerdown',close,true);return()=>document.removeEventListener('pointerdown',close,true);},[]);
 const act=name=>{setMenu(false);onAction(name);};
 return <header className="mobilePdfHud" ref={root}>
  <button type="button" aria-label={translateUi("score.backToRoom")} onClick={onBack}><ArrowLeft size={21}/></button>
  <h1>{title}</h1>
  <button type="button" aria-label={translateUi("pdf.goToCurrentPosition")} title={translateUi("pdf.goToCurrentPosition")} disabled={!canLocate} onClick={onLocate}><LocateFixed size={20}/></button>
  <button type="button" aria-label={translateUi("pdf.pdfDocumentMenu")} aria-expanded={menu} onClick={()=>{setMenu(v=>!v);}}><MoreVertical size={19}/></button>
  <button type="button" aria-label={translateUi("pdf.quickPdfEdit")} aria-pressed={editing} onClick={onDone}>{editing?translateUi("common.done"):translateUi("common.edit")}</button>
  {menu&&<div className="mobilePdfMenu" role="group" aria-label={translateUi("pdf.pdfDocumentActions")}>
   <small>{page} / {pageCount}<Translation id="pdf.pages" /><span role="status">{localizeUi(saveState)}</span></small>
   <button onClick={()=>act('export')}><Translation id="pdf.exportPracticeFile" /></button>
   <button onClick={()=>act('info')}><Translation id="pdf.documentDetails" /></button>
   <button onClick={()=>act('fit')}><Translation id="components.fitWidth" /></button><button onClick={()=>act('reset')}><Translation id="pdf.resetCrop" /></button>
   <button onClick={()=>act('original')}>{original?translateUi("pdf.editedView"):translateUi("pdf.originalView")}</button><button onClick={()=>act('fullscreen')}><Translation id="pdf.fullscreen" /></button>

  </div>}

 </header>;
}
export function MobilePdfTransport({page,pageCount,onPage,bpm,onBpm,playing,paused,onPlay,countIn,settings}){
  useLanguage();
 const [open,setOpen]=useState(false),bpmButton=useRef(null),popover=useRef(null);
 useEffect(()=>{const close=e=>{if(!popover.current?.contains(e.target)&&!bpmButton.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',close,true);return()=>document.removeEventListener('pointerdown',close,true);},[]);
 return <div className="mobilePdfTransport">
  <button aria-label={translateUi("pdf.previousPdfPage")} disabled={page<=1} onClick={()=>onPage(page-1)}><Translation id="etudes.previousEtudeStudio" /></button>
  <button className="pdfPrimary" aria-label={translateUi("pdf.startStopPdfPractice")} aria-pressed={playing} onClick={onPlay}>{playing?translateUi("pdf.iiPause"):paused?translateUi("pdf.resumePractice"):translateUi("pdf.startPractice")}</button>
  <button ref={bpmButton} aria-label={translateUi("etudes.adjustBpm")} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{countIn?translateUi("pdf.countIn"):`${bpm} BPM`}</button>
  <button aria-label={translateUi("pdf.nextPdfPage")} disabled={page>=pageCount} onClick={()=>onPage(page+1)}><Translation id="etudes.nextEtudeStudio" /></button>
  {open&&<div ref={popover} className="mobilePdfBpm" role="group" aria-label={translateUi("pdf.bpmAndPracticeSettings")}>
   <div className="mobilePdfBpmSteps"><button aria-label={translateUi("pdf.decreaseBpmBy10")} onClick={()=>onBpm(bpm-10)}>−10</button><button aria-label={translateUi("pdf.decreaseBpmBy1")} onClick={()=>onBpm(bpm-1)}>−1</button><output aria-label={translateUi("app.currentBpm")}>{bpm}<small><Translation id="originalUi.bpm" /></small></output><button aria-label={translateUi("pdf.increaseBpmBy1")} onClick={()=>onBpm(bpm+1)}>+1</button><button aria-label={translateUi("pdf.increaseBpmBy10")} onClick={()=>onBpm(bpm+10)}>+10</button></div>
   <details className="mobilePdfPracticeOptions"><summary><Translation id="pdf.practiceSettings" /></summary>{settings}</details>
  </div>}
 </div>;
}
