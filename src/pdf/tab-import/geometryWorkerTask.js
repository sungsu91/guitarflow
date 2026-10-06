const LOAD_ERROR='분석 파일을 불러오지 못했습니다. 선택한 파일은 유지됩니다. 인터넷 연결을 확인하고 다시 분석해 주세요. 계속되면 새로고침 후 파일을 다시 선택해 주세요.';
export const GEOMETRY_WORKER_PROTOCOL=1;

// Keep pixels on the main thread until the worker has loaded. An old open tab
// can recover a removed hashed asset once, without losing its image buffer.
export function geometryWorkerTask(createWorker,payload,signal,{WorkerClass=globalThis.Worker,fetcher=globalThis.fetch,baseUrl=globalThis.location?.href,timeout=30000}={}){
 return new Promise((resolve,reject)=>{
  signal?.throwIfAborted();let worker,finished=false,sent=false,recovered=false,readyTimer;
  const recovery=new AbortController();
  const finish=(error,result)=>{if(finished)return;finished=true;clearTimeout(timer);clearTimeout(readyTimer);signal?.removeEventListener('abort',abort);recovery.abort();worker?.terminate();error?reject(error):resolve(result);};
  const abort=()=>finish(new DOMException('분석 취소','AbortError'));
  const timer=setTimeout(()=>finish(Error(sent?'TAB 구조 분석 응답 시간이 초과되었습니다. 다시 시도해 주세요.':LOAD_ERROR)),timeout);
  signal?.addEventListener('abort',abort,{once:true});
  const retry=async()=>{
   if(finished)return;
   clearTimeout(readyTimer);worker?.terminate();worker=null;
   if(recovered){finish(Error(LOAD_ERROR));return;}recovered=true;
   try{
    const response=await fetcher(new URL('/tab-analysis-worker.json',baseUrl),{cache:'no-store',signal:recovery.signal});
    if(!response.ok)throw Error('manifest unavailable');
    const manifest=await response.json(),url=new URL(manifest.url,baseUrl),origin=new URL(baseUrl).origin;
    if(manifest.protocol!==GEOMETRY_WORKER_PROTOCOL||url.origin!==origin||!/^\/assets\/geometry\.worker-[\w-]+\.js$/.test(url.pathname)||url.search||url.hash)throw Error('incompatible worker');
    if(!finished)start(()=>new WorkerClass(url,{type:'module'}));
   }catch{if(!finished)finish(Error(LOAD_ERROR));}
  };
  const start=factory=>{
   if(finished)return;
   try{worker=factory();}catch{void retry();return;}
   const current=worker;
   readyTimer=setTimeout(()=>{if(!finished&&!sent&&worker===current)void retry();},Math.min(6000,timeout));
   worker.onmessage=({data})=>{
    if(finished||worker!==current)return;
    if(!sent){
     if(data?.ready!==GEOMETRY_WORKER_PROTOCOL){void retry();return;}
     sent=true;clearTimeout(readyTimer);
     try{worker.postMessage(payload,[payload.rgba]);}catch(error){finish(error);}return;
    }
    data?.error?finish(Error(data.error)):finish(null,data.result);
   };
   worker.onerror=e=>{e.preventDefault?.();if(finished||worker!==current)return;if(!sent)void retry();else finish(Error(e.message||'분석 중 오류가 발생했습니다. 완료된 페이지는 유지됩니다. 다시 분석해 주세요.'));};
   worker.onmessageerror=()=>{if(worker===current)finish(Error('TAB 구조 분석 응답을 읽지 못했습니다. 다시 시도해 주세요.'));};
  };
  start(createWorker);
 });
}
