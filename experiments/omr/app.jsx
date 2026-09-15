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
 const canvas=useRef(),job=useRef(),generation=useRef(0);
 const [file,setFile]=useState(null),[record,setRecord]=useState(null),[result,setResult]=useState(null),[parsed,setParsed]=useState(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false),[shift,setShift]=useState(''),[positions,setPositions]=useState({}),[bpm,setBpm]=useState(60),[editing,setEditing]=useState(null);
 const cancel=()=>{generation.current++;job.current?.terminate();job.current=null;setBusy(false);setStatus('분석 취소 · 저장한 원본은 유지됩니다.');};
 async function run(){
  const token=++generation.current;setBusy(true);setResult(null);setParsed(null);setPositions({});setStatus('1 / 1 페이지 준비');let task;
  try {
   if(!file||file.size>20*1024*1024)throw Error('시험판은 20MB 이하 PDF 한 페이지만 지원합니다.');
   const fingerprint=await fingerprintPdf(file);task=loadPdfTask(new Uint8Array(await file.arrayBuffer()));const pdf=await task.promise;
   if(pdf.numPages!==1)throw Error('이 시험판은 한 페이지·한 오선보 시스템만 지원합니다. 다중 페이지는 아직 연결하지 않았습니다.');
   const page=await pdf.getPage(1),base=page.getViewport({scale:1}),scale=Math.min(2,1800/base.width,900/base.height),v=page.getViewport({scale});
   const c=canvas.current;c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);await page.render({canvasContext:c.getContext('2d'),viewport:v}).promise;
   if(token!==generation.current)return;
   let r=await findPdf(fingerprint);
   if(!r){const thumb=document.createElement('canvas');thumb.width=220;thumb.height=Math.round(220*c.height/c.width);thumb.getContext('2d').drawImage(c,0,0,thumb.width,thumb.height);const now=new Date().toISOString();r={id:crypto.randomUUID(),fingerprint,title:file.name.replace(/\.pdf$/i,''),artist:'',thumbnail:thumb.toDataURL('image/jpeg'),pageCount:1,bpm:60,meter:[4,4],difficulty:'미지정',tags:[],memo:'OMR 시험 원본',lastPage:1,zoom:'fit',barMap:[],createdAt:now,updatedAt:now};await savePdf(r,file);}
   setRecord(r);
   if(token!==generation.current)return;
   const image=c.getContext('2d').getImageData(0,0,c.width,c.height);
   setStatus('1 / 1 페이지 · 로컬 모델 준비');
   await task.destroy();task=null;
   const worker=new Worker('/experiments/omr/worker.js');job.current=worker;
   worker.onerror=e=>{if(token===generation.current){setStatus(`분석 실패: ${e.message}. 모델 설치 여부를 확인하세요.`);setBusy(false);}worker.terminate();};
   worker.onmessage=async({data})=>{
    if(token!==generation.current)return;
    if(data.stage==='loaded'){setStatus('1 / 1 페이지 · 오선보 인식 중');return;}
    worker.terminate();job.current=null;
    if(data.stage==='error'){setStatus(data.message);setBusy(false);return;}
    const runId=crypto.randomUUID();const p=parseTromr(data.text);setResult({...data,runId});setParsed(p);
    try{await patchPdf(r.id,{omrPrototype:{runId,engine:'CrispEmbed/TrOMR Q8',raw:data.text,unsupported:p.unsupported,page:1,sourceRect:null,createdAt:new Date().toISOString()}});if(token===generation.current)setStatus(`1페이지 · ${p.measures.length}마디 후보. 원시 결과 저장됨 · 전체 음을 대조하세요.`);}catch(e){if(token===generation.current)setStatus(storageError(e));}
    if(token===generation.current)setBusy(false);
   };
   worker.postMessage({data:image.data.buffer,width:c.width,height:c.height},[image.data.buffer]);
  }catch(e){if(token===generation.current){setStatus(storageError(e));setBusy(false);}}
  finally{await task?.destroy();}
 }
 const notes=parsed?.measures.flat().filter(e=>!e.rest)??[];
 function edit(){try{const converted=convertTromr(parsed,{octaveShift:Number(shift),positions,bpm:Number(bpm),title:record.title+' · OMR 확인본',sourcePdfId:record.id,runId:result.runId});setEditing(converted.document);}catch(e){setStatus(e.message);}}
 return <main className="omrLab etudeStudio"><h1>로컬 OMR · 한 페이지 시험</h1><p>인쇄형 단일 오선보 시스템 전용. TAB·여러 악보 줄·기타 주법 인식은 지원하지 않습니다. 정식 앱 기능과 분리한 검증 화면입니다.</p>
 <p>모델 약 33MB · 데스크톱 시험에서 WASM 메모리 약 421MiB. iPhone 실기기 미검증.</p>
 <input aria-label="시험 PDF" type="file" accept="application/pdf" disabled={busy} onChange={e=>{setFile(e.target.files[0]);setResult(null);setParsed(null);setRecord(null);}}/>
 <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>PDF가 한 페이지, 오선보 한 줄이며 TAB이 포함되지 않았음을 확인</label>
 <button disabled={!file||!confirmed||busy} onClick={run}>로컬 분석 / 다시 분석</button> <button disabled={!busy} onClick={cancel}>취소</button> <a href="/#etudes">원본 PDF 보관함 열기</a>
 <p role="status">{status}</p><canvas ref={canvas} aria-label="PDF 원본 미리보기"/>
 {parsed&&<section><h2>변환 전 확인</h2><p>신뢰도 수치와 음별 원본 좌표는 검증되지 않았습니다. 모든 음을 확인 대상으로 취급합니다. 아래 TAB은 인쇄된 프렛 인식 결과가 아닙니다.</p><pre>{result.text}</pre><p>인식 {(result.inferenceMs/1000).toFixed(2)}초 · WASM {(result.heapBytes/1048576).toFixed(0)}MiB</p>
 {parsed.unsupported.length>0?<><h3>미지원 / 누락 기호 — 변환 차단</h3><ul>{parsed.unsupported.map((u,i)=><li key={i}>{u.token}</li>)}</ul></>:<>
 <label>원본 오선보 옥타브<select aria-label="원본 옥타브" value={shift} onChange={e=>{setShift(e.target.value);setPositions({});}}><option value="">선택 필요</option><option value="0">기보 음 = 실제 음</option><option value="-12">기타 기보 · 실제 음은 한 옥타브 아래</option></select></label>
 <label>BPM · 인식값 아님<input aria-label="시험 BPM" type="number" min="30" max="240" value={bpm} onChange={e=>setBpm(e.target.value)}/></label>
 {notes.map((n,i)=><label key={n.index}>음 {i+1} · {n.token}<select aria-label={`음 ${i+1} 운지`} disabled={shift===''} value={positions[n.index]?`${positions[n.index].string}:${positions[n.index].fret}`:''} onChange={e=>{const [string,fret]=e.target.value.split(':').map(Number);setPositions(p=>({...p,[n.index]:e.target.value?{string,fret}:null}));}}><option value="">직접 운지 선택</option>{fingeringCandidates(n.midi+Number(shift)).map(c=><option key={c.string} value={`${c.string}:${c.fret}`}>{c.string}번줄 · {c.fret}프렛</option>)}</select></label>)}
 <button disabled={shift===''||notes.some(n=>!positions[n.index])} onClick={edit}>확인 후 기존 편집기 열기</button></>}
 </section>}
 {editing&&<ScoreEditor key={editing.id} document={editing} mobile={window.innerWidth<768} onClose={()=>setEditing(null)} onSave={d=>saveLibraryDocument(localStorage,d)}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
