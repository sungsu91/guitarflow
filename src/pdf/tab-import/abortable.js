export function abortable(promise,signal){
  if(!signal)return promise;
  return new Promise((resolve,reject)=>{
    const abort=()=>{signal.removeEventListener('abort',abort);reject(new DOMException('분석 취소','AbortError'));};
    signal.addEventListener('abort',abort,{once:true});
    Promise.resolve(promise).then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});
    if(signal.aborted)abort();
  });
}
