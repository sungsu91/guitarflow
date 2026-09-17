import {useEffect,useRef,useState} from 'react';
import {scoreMetadata} from './scoreMetadata.js';
import './scoreSave.css';

export default function ScoreSaveDialog({document,onSave,onClose}){
 const ref=useRef(null),[title,setTitle]=useState(document.title),[artist,setArtist]=useState(document.artist??''),[bpm,setBpm]=useState(document.bpm),[error,setError]=useState('');
 useEffect(()=>{const dialog=ref.current;dialog.showModal();return()=>dialog.close();},[]);
 const submit=e=>{e.preventDefault();try{onSave(scoreMetadata(document,{title,artist,bpm}));}catch(e){setError(e.message);}};
 return <dialog ref={ref} className="scoreSaveDialog" aria-label="악보 저장 정보" onKeyDown={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();e.stopPropagation();onClose();}}>
  <form onSubmit={submit}><h2>악보 저장</h2><p>제목과 곡 정보가 악보 첫 페이지 상단에 표시됩니다.</p>
   <label>악보 제목<input autoFocus required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <label>작곡가 / 아티스트 <small>선택</small><input maxLength={200} value={artist} onChange={e=>setArtist(e.target.value)}/></label>
   <label>BPM<input required type="number" min={30} max={240} step={1} value={bpm} onChange={e=>setBpm(e.target.value)}/></label>
   <p>박자 {document.meter.join('/')} · 조성 {document.keySignature} <small>(현재 악보 설정)</small></p>
   {error&&<p role="alert">{error}</p>}<footer><button type="button" onClick={onClose}>취소</button><button type="submit">저장하기</button></footer>
  </form>
 </dialog>;
}
