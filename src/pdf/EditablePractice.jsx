import {scoreCredit} from '../etudes/scoreMetadata.js';
import '../etudes/scoreSave.css';
import {useEffect,useMemo,useState} from 'react';
import {compileScoreDocument} from '../etudes/scoreDocument.js';
import PracticeSheet from '../etudes/PracticeSheet.jsx';
import usePracticeSession,{PracticeSessionPlayback} from '../etudes/usePracticeSession.jsx';

export default function EditablePractice({document,mobile,onClose,onEdit,onDelete,editing}){
 const result=useMemo(()=>compileScoreDocument(document),[document]);
 const [bpm,setBpm]=useState(document.bpm);
 useEffect(()=>{setBpm(document.bpm);},[document.bpm]);
 const session=usePracticeSession(result.score,bpm,setBpm,'saved-score');
 const model={...session,editScore:()=>{session.controller.current?.stop();onEdit();}};
 return <section className="scoreLibraryPractice">
  <header><button type="button" onClick={onClose}>‹ 내 악보</button><h1>{document.title}</h1></header>
  <small>편집 악보 · {document.measures.length}마디 · {document.meter.join('/')}</small>
  {result.errors?.length>0&&<p role="alert">{result.errors.join(' · ')}</p>}
  {result.issues?.length>0&&<p>미완성 초안입니다. 악보 편집에서 박자와 입력 내용을 확인하세요.</p>}
  {result.score&&<><section className={'etudeStudio etudeStudio--simple '+(mobile?'etudeStudio--mobile':'etudeStudio--desktop')}><PracticeSheet model={model} mobile={mobile} footer={onDelete&&<footer className="scorePracticeFooter"><button type="button" className="scoreDeleteAction" onClick={onDelete}>악보 삭제</button></footer>} heading={<div className="savedScoreHeading"><h2>{document.title}</h2><p>{scoreCredit({...document,bpm})}</p></div>}/></section><PracticeSessionPlayback model={model} mobile={mobile} disabled={editing||Boolean(result.issues?.length)}/></>}
 </section>;
}
