export async function createStaffOmrClient(signal,{timeout=120000}={}){
  signal?.throwIfAborted();const worker=new Worker('/staff-omr/worker.js'),pending=new Map();let sequence=0,closed=false;
  const stop=error=>{if(closed)return;closed=true;signal?.removeEventListener('abort',abort);worker.terminate();for(const task of pending.values()){clearTimeout(task.timer);task.reject(error);}pending.clear();};
  const failure=()=>Error('오선보 분석 엔진을 실행하지 못했습니다. 연결 상태를 확인하고 다시 분석해 주세요.');
  const abort=()=>stop(new DOMException('분석 취소','AbortError'));signal?.addEventListener('abort',abort,{once:true});
  worker.onerror=event=>{event.preventDefault?.();stop(failure());};worker.onmessageerror=()=>stop(failure());
  worker.onmessage=({data})=>{const task=pending.get(data.id);if(!task)return;if(data.error){stop(failure());return;}clearTimeout(task.timer);pending.delete(data.id);task.resolve(data.result);};
  const request=(action,payload={})=>new Promise((resolve,reject)=>{
    if(closed){reject(signal?.aborted?new DOMException('분석 취소','AbortError'):failure());return;}
    const id=++sequence,timer=setTimeout(()=>stop(Error('오선보 분석 응답 시간이 초과되었습니다. 사진을 한 장씩 분석해 보세요.')),timeout);
    pending.set(id,{resolve,reject,timer});try{worker.postMessage({id,action,...payload},payload.rgba?[payload.rgba]:[]);}catch(error){stop(error);}
  });
  try{await request('load');return {get closed(){return closed;},recognize:system=>request('recognize',system),close:()=>stop(new DOMException('분석 종료','AbortError'))};}
  catch(error){stop(error);throw error;}
}
