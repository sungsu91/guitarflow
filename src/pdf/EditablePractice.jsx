import '../etudes/scoreSave.css';
import {useEffect,useMemo,useState} from 'react';
import {compileScoreDocument} from '../etudes/scoreDocument.js';
import PracticeSheet from '../etudes/PracticeSheet.jsx';
import usePracticeSession,{PracticeSessionPlayback} from '../etudes/usePracticeSession.jsx';

export default function EditablePractice({document,savedScores=[],onSelectScore,mobile,onClose,onEdit,onCreate,onDelete,editing}){
 const result=useMemo(()=>compileScoreDocument(document),[document]);
 const [bpm,setBpm]=useState(document.bpm);
 useEffect(()=>{setBpm(document.bpm);},[document.bpm]);
 const session=usePracticeSession(result.score,bpm,setBpm,'saved-score');
 const model={...session,createScore:()=>{session.controller.current?.stop();onCreate();},editScore:()=>{session.controller.current?.stop();onEdit();}};
 return <section className="scoreLibraryPractice">
  <header><button type="button" onClick={onClose}>‹ 내 악보</button><select className="savedScorePicker" aria-label="저장된 악보 선택" value={document.id} onChange={e=>{session.controller.current?.stop();onSelectScore?.(e.target.value);}}>{savedScores.map(score=><option key={score.id} value={score.id}>{score.title}</option>)}</select></header>

  {result.errors?.length>0&&<p role="alert">{result.errors.join(' · ')}</p>}
  {result.issues?.length>0&&<p>미완성 초안입니다. 악보 편집에서 박자와 입력 내용을 확인하세요.</p>}
  {result.score&&<><section className={'etudeStudio etudeStudio--simple '+(mobile?'etudeStudio--mobile':'etudeStudio--desktop')}><PracticeSheet model={model} mobile={mobile} title={document.title} footer={onDelete&&<footer className="scorePracticeFooter"><button type="button" className="scoreDeleteAction" onClick={onDelete}>악보 삭제</button></footer>} heading={<header className="etudeSheetHeader savedScoreHeading"><h2>{document.title}</h2><div className="etudeSheetMeta"><span>{[document.artist,document.keySignature].filter(Boolean).join(' · ')}</span><span>♩ = {bpm} · {document.meter.join('/')}</span></div></header>}/></section><PracticeSessionPlayback model={model} mobile={mobile} disabled={editing||Boolean(result.issues?.length)}/></>}
 </section>;
}
