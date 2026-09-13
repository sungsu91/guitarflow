import {useDeferredValue,useLayoutEffect,useMemo,useRef,useState} from 'react';
import Score from './Score.jsx';
import {compileScoreDocument,toScoreDocument,updateDocumentChordFret} from './scoreDocument.js';
import './scoreEditor.css';
const clone=value=>structuredClone(value);
const durations=[['1','온음표 · 4박'],['2','2분음표 · 2박'],['4','4분음표 · 1박'],['8','8분음표 · ½박'],['16','16분음표 · ¼박']];
const number=value=>value.trim()===''?'':Number(value);
const noteLabel=event=>event.rest?'쉼표':event.notes.map(n=>`${n.string}번줄 ${n.fret}`).join(' + ');

function Controls({draft,setDraft,bar,setBar,event,setEvent}) {
 const m=draft.measures[bar],n=m.events[event];
 const edit=fn=>setDraft(old=>{const next=clone(old);fn(next);return next;});
 const setNote=(tone,key,value)=>edit(d=>{d.measures[bar].events[event].notes[tone][key]=value;});
 const beats=m.events.reduce((sum,n)=>sum+4/Number(n.duration),0);
 return <div className="etudeEditorControls">
  <details><summary>제목 · BPM · 연습 설명</summary>
   <label>목록 제목<input value={draft.title} onChange={e=>edit(d=>{d.title=e.target.value;})}/></label>
   <label>악보 제목<input value={draft.english} onChange={e=>edit(d=>{d.english=e.target.value;})}/></label>
   <label>기본 BPM<input type="number" min="30" max="240" value={draft.bpm} onChange={e=>edit(d=>{d.bpm=number(e.target.value);})}/></label>
   <label>연습 설명<textarea value={draft.purpose} onChange={e=>edit(d=>{d.purpose=e.target.value;})}/></label>
   <label>TIP · 한 줄에 한 문장<textarea value={draft.tips.join('\n')} onChange={e=>edit(d=>{d.tips=e.target.value.split('\n');})}/></label>
  </details>
  <div className="etudeEditorSelectors">
   <label>마디<select aria-label="편집 마디" value={bar} onChange={e=>{setBar(Number(e.target.value));setEvent(0);}}>{draft.measures.map((_,i)=><option key={i} value={i}>{i+1}마디</option>)}</select></label>
   <label>음표 · 쉼표<select aria-label="편집 음표" value={event} onChange={e=>setEvent(Number(e.target.value))}>{m.events.map((n,i)=><option key={i} value={i}>{i+1} · {noteLabel(n)}</option>)}</select></label>
  </div>
  <p className={beats===4?'etudeEditorBeatTotal':'etudeEditorBeatTotal is-invalid'}>현재 마디 {beats} / 4박</p>
  <div className="etudeEditorEvent">
   <label>음표 길이<select aria-label="음표 길이" value={n.duration} onChange={e=>edit(d=>{d.measures[bar].events[event].duration=e.target.value;})}>{durations.map(([v,title])=><option key={v} value={v}>{title}</option>)}</select></label>
   <label className="etudeEditorCheck"><input type="checkbox" checked={n.rest} onChange={e=>edit(d=>{const target=d.measures[bar].events[event];target.rest=e.target.checked;target.technique=null;if(!target.rest&&!target.notes.length){const grip=d.measures[bar].chord;const string=grip?6-grip.frets.findIndex(f=>f!==null):1;target.notes=[{string,fret:grip?grip.frets[6-string]:0}];}})}/>쉼표</label>
   {!n.rest&&<>
    {n.notes.map((tone,i)=><div className="etudeEditorTone" key={i}>
     <label>줄<select aria-label={`음 ${i+1} 줄`} value={tone.string} onChange={e=>setNote(i,'string',Number(e.target.value))}>{[1,2,3,4,5,6].map(s=><option key={s} value={s}>{s}번줄</option>)}</select></label>
     <label>프렛<input aria-label={`음 ${i+1} 프렛`} type="number" min="0" max="24" value={tone.fret} onChange={e=>setNote(i,'fret',number(e.target.value))}/></label>
     {n.notes.length>1&&<button type="button" aria-label={`음 ${i+1} 삭제`} onClick={()=>edit(d=>{d.measures[bar].events[event].notes.splice(i,1);})}>×</button>}
    </div>)}
    <button type="button" disabled={n.notes.length>=6} onClick={()=>edit(d=>{const target=d.measures[bar].events[event];const string=[1,2,3,4,5,6].find(s=>!target.notes.some(t=>t.string===s)&&(m.chord?m.chord.frets[6-s]!==null:true));if(!string)return;target.notes.push({string,fret:m.chord?m.chord.frets[6-string]:0});target.technique=null;})}>동시음 추가</button>
    <label>다음 음과 연결<select aria-label="연결 기법" value={n.technique??''} disabled={n.notes.length>1} onChange={e=>edit(d=>{d.measures[bar].events[event].technique=e.target.value||null;})}><option value="">없음</option><option value="H">H · 해머온</option><option value="P">P · 풀오프</option><option value="S">SL · 슬라이드</option></select></label>
   </>}
   <div className="etudeEditorActions"><button type="button" disabled={m.events.length>=64} onClick={()=>{edit(d=>{d.measures[bar].events.splice(event+1,0,clone(n));});setEvent(event+1);}}>음표 복제</button><button type="button" disabled={m.events.length<=1} onClick={()=>{edit(d=>{d.measures[bar].events.splice(event,1);});setEvent(Math.max(0,event-1));}}>음표 삭제</button></div>
  </div>
  {m.chord&&<details className="etudeEditorChord"><summary>이 마디의 코드표 수정</summary>
   <label>코드명<input aria-label="코드명" value={m.chord.name} onChange={e=>edit(d=>{d.measures[bar].chord.name=e.target.value;})}/></label>
   <p>위에서 1→6번줄. 프렛을 바꾸면 이 마디의 해당 줄 음표도 함께 바뀝니다. ×는 뮤트, 0은 개방현입니다.</p>
   {[1,2,3,4,5,6].map(string=><div className="etudeEditorChordRow" key={string}><strong>{string}번줄</strong>
    <label>프렛<input aria-label={`코드 ${string}번줄 프렛`} value={m.chord.frets[6-string]??'×'} onChange={e=>{const v=e.target.value.trim();setDraft(d=>updateDocumentChordFret(d,bar,string,/^[xX×]$/.test(v)?null:number(v)));}}/></label>
    <label>손가락<select aria-label={`코드 ${string}번줄 손가락`} value={m.chord.fingers[6-string]??''} onChange={e=>edit(d=>{d.measures[bar].chord.fingers[6-string]=e.target.value?Number(e.target.value):null;})}><option value="">표시 안 함</option>{[1,2,3,4].map(f=><option key={f}>{f}</option>)}</select></label>
   </div>)}
   <label className="etudeEditorCheck"><input type="checkbox" checked={Boolean(m.chord.barre)} onChange={e=>edit(d=>{d.measures[bar].chord.barre=e.target.checked?{fret:1,from:2,to:1}:null;})}/>바레 표시</label>
   {m.chord.barre&&<div className="etudeEditorBarre">{[['fret','바레 프렛',1,24],['from','바레 시작 줄',2,6],['to','바레 끝 줄',1,5]].map(([key,label,min,max])=><label key={key}>{label}<input aria-label={label} type="number" min={min} max={max} value={m.chord.barre[key]} onChange={e=>edit(d=>{d.measures[bar].chord.barre[key]=number(e.target.value);})}/></label>)}</div>}
  </details>}
  <div className="etudeEditorActions"><button type="button" disabled={draft.measures.length>=64} onClick={()=>{edit(d=>{d.measures.splice(bar+1,0,clone(m));});setBar(bar+1);setEvent(0);}}>마디 복제</button><button type="button" disabled={draft.measures.length<=1} onClick={()=>{edit(d=>{d.measures.splice(bar,1);});setBar(Math.max(0,bar-1));setEvent(0);}}>마디 삭제</button></div>
 </div>;
}

function Preview({score,mobile}) {
 return <div className="etudeEditorPreview">{score?<><h3>{score.english}</h3><p>♩ = {score.bpm} · 4/4</p><Score etude={score} bpm={score.bpm} mobile={mobile}/></>:<p>아래 수정 사항을 해결하면 악보 미리보기가 표시됩니다.</p>}</div>;
}

export default function ScoreEditor({score,original,mobile,onClose,onSave,onRestore}) {
 const [draft,setDraft]=useState(()=>toScoreDocument(score));
 const [bar,setBar]=useState(0),[event,setEvent]=useState(0),[tab,setTab]=useState('edit'),[message,setMessage]=useState('');
 const dialog=useRef(null),file=useRef(null);
 const result=useMemo(()=>compileScoreDocument(draft,original),[draft,original]);
 const preview=useDeferredValue(result.score);
 const barIndex=Math.min(bar,draft.measures.length-1),eventIndex=Math.min(event,draft.measures[barIndex].events.length-1);
 useLayoutEffect(()=>{const node=dialog.current,overflow=document.body.style.overflow;document.body.style.overflow='hidden';node.showModal();return()=>{node.close();document.body.style.overflow=overflow;};},[]);
 const download=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`${draft.templateId}.fretiva.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setMessage('악보 파일을 내려받았습니다. 나중에 불러와 계속 수정할 수 있습니다.');
 };
 const importFile=async e=>{
  const selected=e.target.files?.[0];e.target.value='';if(!selected)return;
  try{if(selected.size>2*1024*1024)throw new Error('2MB 이하의 악보 파일을 선택하세요.');const next=JSON.parse((await selected.text()).replace(/^\uFEFF/,''));const checked=compileScoreDocument(next,original);if(!checked.score)throw new Error(checked.errors.join(' / '));setDraft(next);setBar(0);setEvent(0);setMessage('파일을 불러왔습니다. 확인한 뒤 이 브라우저에 저장하세요.');}
  catch(error){setMessage(error.message||'악보 파일을 읽지 못했습니다.');}
 };
 const save=()=>{const saved=onSave(draft);if(saved.score)onClose();else setMessage(saved.errors.join(' / '));};
 const controls=<Controls {...{draft,setDraft,bar:barIndex,setBar,event:eventIndex,setEvent}}/>;
 return <dialog ref={dialog} className={`etudeEditor etudeEditor--${mobile?'mobile':'desktop'}`} aria-label="악보 편집" onCancel={onClose}>
  <header><div><h2>악보 편집</h2><p>이 브라우저의 수정본 · 원본은 복원할 수 있습니다.</p></div><button type="button" onClick={onClose}>취소 · 닫기</button></header>
  {mobile?<><nav className="etudeEditorTabs" aria-label="편집 화면"><button type="button" aria-pressed={tab==='edit'} onClick={()=>setTab('edit')}>편집</button><button type="button" aria-pressed={tab==='preview'} onClick={()=>setTab('preview')}>미리보기</button></nav>{tab==='edit'?controls:<Preview score={preview} mobile/>}</>:<div className="etudeEditorDesktopBody">{controls}<Preview score={preview} mobile={false}/></div>}
  {result.errors.length>0&&<div className="etudeEditorErrors" role="alert"><strong>저장 전에 확인하세요.</strong><ul>{result.errors.slice(0,8).map(error=><li key={error}>{error}</li>)}</ul></div>}
  {message&&<p role="status">{message}</p>}
  <footer><button type="button" onClick={()=>{setDraft(toScoreDocument(original));setBar(0);setEvent(0);const restored=onRestore();setMessage(restored.score?'이 브라우저의 수정본을 지우고 기본 악보로 복원했습니다.':restored.errors.join(' / '));}}>기본 악보 복원</button><button type="button" onClick={()=>file.current.click()}>파일 불러오기</button><input ref={file} type="file" accept=".json,application/json" aria-label="악보 파일 선택" hidden onChange={importFile}/><button type="button" disabled={!result.score} onClick={download}>파일 내려받기</button><button type="button" className="etudeEditorSave" disabled={!result.score} onClick={save}>이 브라우저에 저장</button></footer>
 </dialog>;
}
