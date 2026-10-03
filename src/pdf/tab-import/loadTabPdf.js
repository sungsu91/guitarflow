import {PDFWorker,GlobalWorkerOptions} from 'pdfjs-dist';
import {loadPdfTask} from '../pdfRenderer.js';
import {abortable} from './abortable.js';

// Retain the raw worker even before PDF.js has completed its handshake.
export function loadTabPdf(data,signal,{timeout=60000}={}){
  signal?.throwIfAborted();
  const raw=new Worker(GlobalWorkerOptions.workerSrc,{type:'module'});
  let worker,task,closed=false,rejectFailure;
  const failure=new Promise((_,reject)=>{rejectFailure=reject;});failure.catch(()=>{});
  const close=()=>{
    if(closed)return;closed=true;signal?.removeEventListener('abort',abort);
    // Worker termination must not wait for a reply from a broken worker.
    void task?.destroy().catch(()=>{});worker?.destroy();raw.terminate();
  };
  const abort=()=>{rejectFailure(new DOMException('분석 취소','AbortError'));close();};
  raw.addEventListener('error',event=>{event.preventDefault();rejectFailure(Error('PDF 분석 엔진을 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.'));close();});
  raw.addEventListener('messageerror',()=>{rejectFailure(Error('PDF 분석 응답을 읽지 못했습니다. 다시 시도해 주세요.'));close();});
  signal?.addEventListener('abort',abort,{once:true});
  try{worker=new PDFWorker({port:raw});task=loadPdfTask(data,{worker});}catch(error){close();throw error;}
  const wait=async promise=>{
    let timer;
    try{return await abortable(Promise.race([promise,failure,new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error('PDF 분석 응답 시간이 초과되었습니다. 다시 시도해 주세요.'));close();},timeout);})]),signal);}
    finally{clearTimeout(timer);}
  };
  return {promise:task.promise,wait,destroy:close};
}
