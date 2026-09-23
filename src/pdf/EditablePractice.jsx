import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import '../etudes/scoreSave.css';
import {useEffect,useMemo,useState} from 'react';
import {compileScoreDocument} from '../etudes/scoreDocument.js';
import PracticeSheet from '../etudes/PracticeSheet.jsx';
import usePracticeSession,{PracticeSessionPlayback} from '../etudes/usePracticeSession.jsx';

export default function EditablePractice({document,savedScores=[],onSelectScore,mobile,onClose,onEdit,onCreate,onDelete,editing}){
  useLanguage();
 const result=useMemo(()=>compileScoreDocument(document),[document]);
 const [bpm,setBpm]=useState(document.bpm);
 useEffect(()=>{setBpm(document.bpm);},[document.bpm]);
 const session=usePracticeSession(result.score,bpm,setBpm,'saved-score');
 const model={...session,createScore:()=>{session.controller.current?.stop();onCreate();},editScore:()=>{session.controller.current?.stop();onEdit();}};
 return <section className="scoreLibraryPractice">
  <header><button type="button" onClick={onClose}><Translation id="pdf.myScores" /></button><select className="savedScorePicker" aria-label={translateUi("pdf.chooseSavedScore")} value={document.id} onChange={e=>{session.controller.current?.stop();onSelectScore?.(e.target.value);}}>{savedScores.map(score=><option key={score.id} value={score.id}>{score.title}</option>)}</select></header>

  {result.errors?.length>0&&<p role="alert">{result.errors.map(localizeUi).join(' · ')}</p>}
  {result.issues?.length>0&&<p><Translation id="pdf.thisIsAnUnfinishedDraftCheckTheMeterAndInputInThe" /></p>}
  {result.score&&<><section className={'etudeStudio etudeStudio--simple '+(mobile?'etudeStudio--mobile':'etudeStudio--desktop')}><PracticeSheet model={model} mobile={mobile} title={document.title} footer={onDelete&&<footer className="scorePracticeFooter"><button type="button" className="scoreDeleteAction" onClick={onDelete}><Translation id="pdf.deleteScore" /></button></footer>} heading={<header className="etudeSheetHeader savedScoreHeading"><h2>{document.title}</h2><div className="etudeSheetMeta"><span>{[document.artist,document.keySignature].filter(Boolean).join(' · ')}</span><span>♩ = {bpm} · {document.meter.join('/')}</span></div></header>}/></section><PracticeSessionPlayback model={model} mobile={mobile} disabled={editing||Boolean(result.issues?.length)}/></>}
 </section>;
}
