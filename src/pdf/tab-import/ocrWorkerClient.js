import {OEM} from 'tesseract.js';
import {abortable} from './abortable.js';

// Tesseract.js 6's createWorker returns its handle only AFTER initialization.
// Own the browser Worker from the start so failed/cancelled initialization can
// always be terminated. This is the pinned v6 worker message protocol.
export async function createOcrWorker(signal,{loadTimeout=60000,jobTimeout=30000}={}){
  signal?.throwIfAborted();
  const worker=new Worker('/tab-ocr/worker.min.js'),pending=new Map();let sequence=0,closed=false;
  const failure=message=>new Error(`TAB 인식 엔진을 실행하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요. (${message})`);
  const stop=error=>{
    if(closed)return;closed=true;signal?.removeEventListener('abort',abort);
    worker.terminate();for(const job of pending.values()){clearTimeout(job.timer);job.reject(error);}pending.clear();
  };
  const abort=()=>stop(new DOMException('분석 취소','AbortError'));
  signal?.addEventListener('abort',abort,{once:true});
  worker.onerror=e=>{e.preventDefault?.();stop(failure(e.message||'worker error'));};
  worker.onmessageerror=()=>stop(failure('invalid worker response'));
  worker.onmessage=({data})=>{
    const job=pending.get(data.jobId);if(!job||data.status==='progress')return;
    if(data.status==='reject'){stop(failure(String(data.data)));return;}
    if(data.status==='resolve'){pending.delete(data.jobId);clearTimeout(job.timer);job.resolve({data:data.data});}
  };
  const request=(action,payload,timeout=jobTimeout)=>new Promise((resolve,reject)=>{
    if(closed){reject(signal?.aborted?new DOMException('분석 취소','AbortError'):failure('worker closed'));return;}
    const jobId=String(++sequence),timer=setTimeout(()=>stop(failure('응답 시간 초과')),timeout);
    pending.set(jobId,{resolve,reject,timer});
    try{worker.postMessage({workerId:'riff-tab-ocr',jobId,action,payload});}catch(error){stop(failure(error.message));}
  });
  try{
    await request('load',{options:{lstmOnly:true,corePath:new URL('/tab-ocr/core',location.href).href,logging:false}},loadTimeout);
    await request('loadLanguage',{langs:'eng',options:{langPath:new URL('/tab-ocr/lang',location.href).href,cacheMethod:'none',gzip:true,lstmOnly:true}},loadTimeout);
    await request('initialize',{langs:'eng',oem:OEM.LSTM_ONLY,config:{}},loadTimeout);
    return {
      setParameters:params=>request('setParameters',{params}),
      recognize:async(canvas,options={},output={blocks:true,text:true})=>{
        const blob=await abortable(new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(failure('image encoding failed')))),signal);
        const image=new Uint8Array(await abortable(blob.arrayBuffer(),signal));
        return request('recognize',{image,options,output});
      },
      terminate:async()=>stop(new DOMException('분석 종료','AbortError')),
    };
  }catch(error){stop(error);throw error;}
}
