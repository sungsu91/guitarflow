// A chord is overlapping note-ons within 70 ms of its first note-on.
// Releasing any member closes the group before the next note can join it.
// Held keys remain in the down set after commit, suppressing repeated note-ons.
export function createMidiStepInput(commit,{delay=70,schedule=setTimeout,cancel=clearTimeout,enabled=()=>true,now=()=>performance.now(),context=()=>null}={}){
 const down=new Set();let pending=[],timer=null,started=0,location=null;
 const clear=()=>{if(timer!==null)cancel(timer);timer=null;pending=[];};
 const flush=()=>{const notes=[...new Set(pending.map(n=>n.pitch))],same=location===context();clear();if(notes.length&&same&&enabled())commit(notes);};
 return {message(data){const [status,pitch,velocity]=data,type=status&0xf0,key=`${status&15}:${pitch}`;
  if(type===0x80||(type===0x90&&velocity===0)){if(pending.some(n=>n.key===key))flush();down.delete(key);return;}
  if(type!==0x90||!velocity||down.has(key))return;
  down.add(key);if(!enabled()){clear();return;}
  const time=now();if(pending.length&&time-started>=delay)flush();
  pending.push({key,pitch});if(timer===null){started=time;location=context();timer=schedule(flush,delay);}
 },suspend(){clear();},reset(){clear();down.clear();},flush};
}
