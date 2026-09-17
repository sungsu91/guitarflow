import {scoreCredit} from '../etudes/scoreMetadata.js';
import '../etudes/scoreSave.css';
import {useEffect,useMemo,useState} from 'react';
import {compileScoreDocument} from '../etudes/scoreDocument.js';
import Score from '../etudes/Score.jsx';
import ScorePlayback from '../etudes/ScorePlayback.jsx';
import '../etudes/etudes.css';

export default function EditablePractice({document,mobile,onClose,onEdit,onDelete,editing}){
 const result=useMemo(()=>compileScoreDocument(document),[document]);
 const [bpm,setBpm]=useState(document.bpm),[playPosition,setPlayPosition]=useState(null);
 useEffect(()=>{setBpm(document.bpm);},[document.bpm]);
 return <section className="scoreLibraryPractice">
  <header><button type="button" onClick={onClose}>‹ 내 악보</button><h1>{document.title}</h1><button type="button" onClick={onEdit}>악보 편집</button>{onDelete&&<button type="button" className="scoreDeleteAction" onClick={onDelete}>삭제</button>}</header>
  <small>편집 악보 · {document.measures.length}마디 · {document.meter.join('/')}</small>
  {result.errors?.length>0&&<p role="alert">{result.errors.join(' · ')}</p>}
  {result.issues?.length>0&&<p>미완성 초안입니다. 악보 편집에서 박자와 입력 내용을 확인하세요.</p>}
  {result.score&&<><article className="etudeSheet"><div className="savedScoreHeading"><h2>{document.title}</h2><p>{scoreCredit(document)}</p></div><Score playPosition={playPosition} etude={result.score} mobile={mobile} bpm={bpm}/></article><label className="scoreLibraryTempo">연습 BPM<input aria-label="내 악보 연습 BPM" type="number" min="30" max="240" value={bpm} onChange={e=>setBpm(Math.max(30,Math.min(240,Number(e.target.value)||60)))}/></label><ScorePlayback onPosition={setPlayPosition} score={result.score} bpm={bpm} disabled={editing||Boolean(result.issues?.length)}/></>}
 </section>;
}
