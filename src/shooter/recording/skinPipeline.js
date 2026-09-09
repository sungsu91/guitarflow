// One in-flight frame. A result is rendered only with its own source bitmap.
// Camera preview and recording both consume that completed, matched frame.
export function createSkinPipeline(video, render) {
  let worker, disposed=false, failed=false, ready=false, busy=false;
  let timer, timeout, sentTime=-1, sentAt=0, output=null, completedAt=0, level=1;
  let measured=0, slow=0;
  const fail=()=>{failed=true;output=null;clearTimeout(timer);clearTimeout(timeout);worker?.terminate();};
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(submit,Math.max(0,33-(performance.now()-sentAt)));};
  async function submit(){
    if(disposed||failed||!ready||busy)return;
    if(video.readyState<2||!video.videoWidth||video.currentTime===sentTime){timer=setTimeout(submit,16);return;}
    busy=true;sentTime=video.currentTime;sentAt=performance.now();
    try{
      const bitmap=await createImageBitmap(video);
      if(disposed||failed){bitmap.close();return;}
      worker.postMessage({type:'frame',bitmap,timestamp:sentAt},[bitmap]);
      timeout=setTimeout(fail,measured===0?15000:3000);
    }catch{fail();}
  }
  try{
    worker=new Worker(`${(import.meta.env?.BASE_URL || "/")}vendor/face-landmarker/skin-worker.js`);
    worker.onerror=fail;
    worker.onmessage=({data})=>{
      clearTimeout(timeout);
      if(disposed||failed){data.bitmap?.close();return;}
      if(data.type==='ready'){ready=true;schedule();return;}
      if(data.type!=='result'){fail();return;}
      busy=false;
      try{
        // Exclude model warm-up; do not silently turn a smooth recording into
        // an indefinitely queued/stuttering skin-effect stream on a slow device.
        measured++;
        if(measured>8)slow=data.elapsed>65?slow+1:0;
        if(slow>=8){fail();return;}
        // GPU compilation can make the first result seconds old: discard it.
        if(performance.now()-data.timestamp<150){
          output=render(data.bitmap,level,data.mask,data.balance);
          completedAt=data.timestamp;
        } else { output=null; }
      }catch{fail();}
      finally{data.bitmap.close();}
      schedule();
    };
    timeout=setTimeout(fail,20000);
    worker.postMessage({type:'init'});
  }catch{fail();}
  return {
    frame(nextLevel){level=nextLevel;return failed?video:(output&&performance.now()-completedAt<150?output:null);},
    dispose(){disposed=true;clearTimeout(timer);clearTimeout(timeout);worker?.terminate();output=null;},
  };
}
