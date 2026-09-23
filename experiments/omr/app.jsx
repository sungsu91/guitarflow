import ko from '../../src/i18n/locales/ko.js';
import { t as translateUi, formatMessage, localizeUi, syncDocumentLanguage } from '../../src/i18n/core.js';
import { Translation, useLanguage } from '../../src/i18n/react.jsx';
import React,{useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {loadPdfTask} from '../../src/pdf/pdfRenderer.js';
import {fingerprintPdf,findPdf,savePdf,patchPdf,storageError} from '../../src/pdf/pdfLibrary.js';
import {parseTromr,convertTromr} from '../../src/omr/tromrAdapter.js';
import {fingeringCandidates} from '../../src/etudes/scoreModel.js';
import {saveLibraryDocument} from '../../src/etudes/scoreLibrary.js';
import ScoreEditor from '../../src/etudes/ScoreEditor.jsx';
import '../../src/etudes/etudes.css';
import './prototype.css';

function App(){
 useLanguage();
 const canvas=useRef(),job=useRef(),generation=useRef(0);
 const [file,setFile]=useState(null),[record,setRecord]=useState(null),[result,setResult]=useState(null),[parsed,setParsed]=useState(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false),[shift,setShift]=useState(''),[positions,setPositions]=useState({}),[bpm,setBpm]=useState(60),[editing,setEditing]=useState(null);
 const cancel=()=>{generation.current++;job.current?.terminate();job.current=null;setBusy(false);setStatus(ko["omrPrototype.analysisCanceledSavedOriginalsArePreserved"]);};
 async function run(){
  const token=++generation.current;setBusy(true);setResult(null);setParsed(null);setPositions({});setStatus(ko["omrPrototype.preparingPage11"]);let task;
  try {
   if(!file||file.size>20*1024*1024)throw Error(ko["omrPrototype.thisPrototypeSupportsOnePdfPageUpTo20Mb"]);
   const fingerprint=await fingerprintPdf(file);task=loadPdfTask(new Uint8Array(await file.arrayBuffer()));const pdf=await task.promise;
   if(pdf.numPages!==1)throw Error(ko["omrPrototype.thisPrototypeSupportsOnePageWithASingleStaffSystemMultiplePages"]);
   const page=await pdf.getPage(1),base=page.getViewport({scale:1}),scale=Math.min(2,1800/base.width,900/base.height),v=page.getViewport({scale});
   const c=canvas.current;c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);await page.render({canvasContext:c.getContext('2d'),viewport:v}).promise;
   if(token!==generation.current)return;
   let r=await findPdf(fingerprint);
   if(!r){const thumb=document.createElement('canvas');thumb.width=220;thumb.height=Math.round(220*c.height/c.width);thumb.getContext('2d').drawImage(c,0,0,thumb.width,thumb.height);const now=new Date().toISOString();r={id:crypto.randomUUID(),fingerprint,title:file.name.replace(/\.pdf$/i,''),artist:'',thumbnail:thumb.toDataURL('image/jpeg'),pageCount:1,bpm:60,meter:[4,4],difficulty:ko["pdf.unspecified"],tags:[],memo:ko["omrPrototype.omrTestOriginal"],lastPage:1,zoom:'fit',barMap:[],createdAt:now,updatedAt:now};await savePdf(r,file);}
   setRecord(r);
   if(token!==generation.current)return;
   const image=c.getContext('2d').getImageData(0,0,c.width,c.height);
   setStatus(ko["omrPrototype.page11LoadingLocalModel"]);
   await task.destroy();task=null;
   const worker=new Worker('/experiments/omr/worker.js');job.current=worker;
   worker.onerror=e=>{if(token===generation.current){setStatus(formatMessage(ko["omrPrototype.analysisFailedValueCheckThatTheModelIsInstalled"], { value1: e.message }));setBusy(false);}worker.terminate();};
   worker.onmessage=async({data})=>{
    if(token!==generation.current)return;
    if(data.stage==='loaded'){setStatus(ko["omrPrototype.page11RecognizingNotation"]);return;}
    worker.terminate();job.current=null;
    if(data.stage==='error'){setStatus(data.message);setBusy(false);return;}
    const runId=crypto.randomUUID();const p=parseTromr(data.text);setResult({...data,runId});setParsed(p);
    try{await patchPdf(r.id,{omrPrototype:{runId,engine:'CrispEmbed/TrOMR Q8',raw:data.text,unsupported:p.unsupported,page:1,sourceRect:null,createdAt:new Date().toISOString()}});if(token===generation.current)setStatus(formatMessage(ko["omrPrototype.page1ValueCandidateBarsRawOutputSavedCompareEveryNote"], { value1: p.measures.length }));}catch(e){if(token===generation.current)setStatus(storageError(e));}
    if(token===generation.current)setBusy(false);
   };
   worker.postMessage({data:image.data.buffer,width:c.width,height:c.height},[image.data.buffer]);
  }catch(e){if(token===generation.current){setStatus(storageError(e));setBusy(false);}}
  finally{await task?.destroy();}
 }
 const notes=parsed?.measures.flat().filter(e=>!e.rest)??[];
 function edit(){try{const converted=convertTromr(parsed,{octaveShift:Number(shift),positions,bpm:Number(bpm),title:record.title+ko["omrPrototype.omrReviewedCopy"],sourcePdfId:record.id,runId:result.runId});setEditing(converted.document);}catch(e){setStatus(e.message);}}
 return <main className="omrLab etudeStudio"><h1><Translation id="omrPrototype.localOmrSinglePageTest" /></h1><p><Translation id="omrPrototype.forASinglePrintedStaffSystemOnlyTabMultipleSystemsAndGuitar" /></p>
 <p><Translation id="omrPrototype.modelAbout33MbDesktopTestWasmMemoryAbout421MibNot" /></p>
 <input aria-label={translateUi("omrPrototype.testPdf")} type="file" accept="application/pdf" disabled={busy} onChange={e=>{setFile(e.target.files[0]);setResult(null);setParsed(null);setRecord(null);}}/>
 <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><Translation id="omrPrototype.iConfirmThePdfHasOnePageOneStaffSystemAndNo" /></label>
 <button disabled={!file||!confirmed||busy} onClick={run}><Translation id="omrPrototype.analyzeLocallyReanalyze" /></button> <button disabled={!busy} onClick={cancel}><Translation id="common.cancel" /></button> <a href="/#etudes"><Translation id="omrPrototype.openOriginalPdfLibrary" /></a>
 <p role="status">{localizeUi(status)}</p><canvas ref={canvas} aria-label={translateUi("omrPrototype.originalPdfPreview")}/>
 {parsed&&<section><h2><Translation id="omrPrototype.reviewBeforeConversion" /></h2><p><Translation id="omrPrototype.confidenceScoresAndPerNoteSourceCoordinatesAreUnverifiedReviewEveryNote" /></p><pre>{result.text}</pre><p><Translation id="omrPrototype.recognition" />{(result.inferenceMs/1000).toFixed(2)}<Translation id="omrPrototype.sWasm" />{(result.heapBytes/1048576).toFixed(0)}MiB</p>
 {parsed.unsupported.length>0?<><h3><Translation id="omrPrototype.unsupportedMissingSymbolsConversionBlocked" /></h3><ul>{parsed.unsupported.map((u,i)=><li key={i}>{u.token}</li>)}</ul></>:<>
 <label><Translation id="omrPrototype.originalStaffOctave" /><select aria-label={translateUi("omrPrototype.originalOctave")} value={shift} onChange={e=>{setShift(e.target.value);setPositions({});}}><option value=""><Translation id="omrPrototype.chooseAnOption" /></option><option value="0"><Translation id="omrPrototype.writtenPitchSoundingPitch" /></option><option value="-12"><Translation id="omrPrototype.guitarNotationSoundsOneOctaveLower" /></option></select></label>
 <label><Translation id="omrPrototype.bpmNotRecognizedFromTheScore" /><input aria-label={translateUi("omrPrototype.testBpm")} type="number" min="30" max="240" value={bpm} onChange={e=>setBpm(e.target.value)}/></label>
 {notes.map((n,i)=><label key={n.index}><Translation id="omrPrototype.note" />{i+1} · {n.token}<select aria-label={formatMessage(ko["omrPrototype.noteValueFingering"], { value1: i+1 })} disabled={shift===''} value={positions[n.index]?`${positions[n.index].string}:${positions[n.index].fret}`:''} onChange={e=>{const [string,fret]=e.target.value.split(':').map(Number);setPositions(p=>({...p,[n.index]:e.target.value?{string,fret}:null}));}}><option value=""><Translation id="omrPrototype.chooseFingeringManually" /></option>{fingeringCandidates(n.midi+Number(shift)).map(c=><option key={c.string} value={`${c.string}:${c.fret}`}>{c.string}<Translation id="etudes.string" />{c.fret}<Translation id="app.fret" /></option>)}</select></label>)}
 <button disabled={shift===''||notes.some(n=>!positions[n.index])} onClick={edit}><Translation id="omrPrototype.reviewAndOpenExistingEditor" /></button></>}
 </section>}
 {editing&&<ScoreEditor key={editing.id} document={editing} mobile={window.innerWidth<768} onClose={()=>setEditing(null)} onSave={d=>saveLibraryDocument(localStorage,d)}/>}
 </main>;
}
syncDocumentLanguage();
createRoot(document.getElementById('root')).render(<App/>);
