import {useEffect,useRef,useState} from 'react';
import {createMidiStepInput} from './midiStepInput.js';

export default function useMidiKeyboard(onNotes,enabled,context){
 const latest=useRef({onNotes,enabled,context});latest.current={onNotes,enabled,context};
 const [access,setAccess]=useState(null),[devices,setDevices]=useState([]),[selected,setSelected]=useState(''),[status,setStatus]=useState('미연결');
 const alive=useRef(false),busy=useRef(false),denied=useRef(false);
 const supported=typeof navigator.requestMIDIAccess==='function'&&window.isSecureContext;
 async function permission(){try{return await navigator.permissions?.query({name:'midi',sysex:false});}catch{return null;}}
 async function connect(manual=true){
  if(!supported||busy.current)return;busy.current=true;
  try{const p=await permission();if(!alive.current)return;
   if(p?.state==='denied'||(denied.current&&p?.state!=='granted')){denied.current=true;setStatus('권한 거부: 주소창의 사이트 설정 → MIDI 권한을 허용한 뒤 재시도하세요. 권한 확인이 안 되면 허용 후 페이지를 새로고침하세요.');return;}
   if(!manual&&p?.state!=='granted')return;
   setStatus('연결 중');const result=await navigator.requestMIDIAccess({sysex:false});if(alive.current){denied.current=false;setAccess(result);}
  }catch(e){if(alive.current){denied.current=e.name==='NotAllowedError'||e.name==='SecurityError';setStatus(denied.current?'권한 거부: 사이트 설정에서 MIDI를 허용한 뒤 재시도하세요.':`연결 실패: ${e.message}`);}}
  finally{busy.current=false;}
 }
 useEffect(()=>{alive.current=true;if(supported)void connect(false);else setStatus('이 브라우저에서는 MIDI 연결을 지원하지 않습니다.');return()=>{alive.current=false;};},[]);
 useEffect(()=>{if(!access)return;const update=()=>{const list=[...access.inputs.values()].filter(d=>d.state==='connected');setDevices(list);setSelected(old=>old||list[0]?.id||'');};update();access.addEventListener('statechange',update);return()=>access.removeEventListener('statechange',update);},[access]);
 useEffect(()=>{if(!access)return;const port=devices.find(d=>d.id===selected);if(!port){setStatus('장치 미연결 · 건반을 연결하거나 입력 장치를 선택하세요.');return;}
  let live=true;const engine=createMidiStepInput(notes=>latest.current.onNotes(notes),{enabled:()=>live&&latest.current.enabled(),context:()=>latest.current.context?.()});
  const message=e=>engine.message(e.data),reset=()=>engine.reset(),focus=e=>{if(!e.target.closest?.('[data-score-input]'))engine.suspend();};
  port.addEventListener('midimessage',message);window.addEventListener('blur',reset);document.addEventListener('focusin',focus);document.addEventListener('visibilitychange',reset);
  Promise.resolve().then(()=>port.open()).then(()=>{if(live)setStatus(port.state==='connected'?`연결됨 · ${port.name??'MIDI 건반'}`:'장치 미연결');}).catch(e=>{if(live)setStatus(`장치 열기 실패: ${e.message}`);});
  return()=>{live=false;engine.reset();port.removeEventListener('midimessage',message);window.removeEventListener('blur',reset);document.removeEventListener('focusin',focus);document.removeEventListener('visibilitychange',reset);};
 },[access,devices,selected]);
 return {supported,status,devices,selected,setSelected,connect:()=>connect(true)};
}
