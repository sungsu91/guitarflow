import { formatMessage } from "../i18n/format.js";
import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import EtudePicker from './EtudePicker.jsx';
import {loadScoreFolders,updateScoreFolders,SCORE_FOLDERS_KEY} from '../pdf/scoreFolders.js';
import PracticeSheet from './PracticeSheet.jsx';
import usePracticeSession,{PracticeSessionPlayback} from './usePracticeSession.jsx';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ETUDES } from './catalog.js';
import { lessonCourse, canOpenLesson } from './filters.js';
import './practiceLayout.css';
import './etudes.css';
import {toScoreDocument,compileScoreDocument} from './scoreDocument.js';
import {loadLibrary,saveLibraryDocument} from './scoreLibrary.js';
import {copyDocument,createBlankDocument} from './scoreModel.js';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { COMMON_PRACTICE_TIPS, PICKING_EXAMPLES, FINGERSTYLE_PRACTICE_TIPS, FINGERSTYLE_EXAMPLES } from './practiceTips.js';

const ScoreEditor = lazy(() => import('./ScoreEditor.jsx'));
function loadEdits(){try{return {...loadLibrary(window.localStorage,ETUDES),scores:{}};}catch{return {records:{},scores:{},errors:[ko["etudes.editedScoreStorageIsUnavailableInThisBrowser"]]};}}
const DEFAULT_ETUDE_ID = 'G-triad-start';
const DEFAULT_ETUDE_BPM = ETUDES.find(etude => etude.id === DEFAULT_ETUDE_ID)?.bpm ?? 60;

function SongPicker({ model, mobile }) {
  useLanguage();
 const {list,selected,select,savedScores,savedId,selectSaved}=model;
 const types=[...new Set(list.map(e=>e.type))],course=list.filter(e=>e.type===selected?.type),index=course.findIndex(e=>e.id===selected?.id);
 return <div className="etudeSongPicker etudeQuickBrowse">
  <EtudePicker model={model} mobile={mobile}/>
  {!savedId&&<nav className="etudeQuickPages" aria-label={translateUi("etudes.browseETudes")}><button type="button" aria-label={translateUi("etudes.previousETude")} disabled={index<0||course.length<2} onClick={()=>select(course[(index-1+course.length)%course.length].id)}><ChevronLeft aria-hidden="true"/></button><span aria-live="polite">{index+1} / {course.length}</span><button type="button" aria-label={translateUi("etudes.nextETude")} disabled={index<0||index>=course.length-1} onClick={()=>select(course[index+1].id)}><ChevronRight aria-hidden="true"/></button></nav>}
 </div>;
}

function LessonTips({ model }) {
  useLanguage();
  const { selected } = model;
  if (!selected) return null;
  const course = lessonCourse(selected, model.filters);
  const index = course.findIndex(e => e.id === selected.id);
  const commonTips = selected.accompaniment ? FINGERSTYLE_PRACTICE_TIPS : COMMON_PRACTICE_TIPS;
  const examples = selected.accompaniment ? FINGERSTYLE_EXAMPLES : PICKING_EXAMPLES;
  return <section className="etudeLesson" aria-label={translateUi("etudes.practiceCurriculum")}>
    <div className="etudeLessonNav"><button type="button" disabled={index <= 0} onClick={() => model.openLesson(course[index - 1])}><Translation id="etudes.previousEtudeStudio" /></button><span><span>{localizeUi(selected.type)} · {localizeUi(selected.level)}</span><strong>{index + 1} / {course.length}</strong></span><button type="button" disabled={index < 0 || index === course.length - 1} onClick={() => model.openLesson(course[index + 1])}><Translation id="etudes.nextEtudeStudio" /></button></div>
    <details key={selected.id} className="etudeTips"><summary><strong><Translation id="app.tipPracticeGuide" /></strong><ChevronDown size={24} aria-hidden="true" /></summary>
      <p><strong><Translation id="etudes.learningGoal" /></strong> · {localizeUi(selected.pedagogy.objective)}</p><p className="etudePrerequisite">{localizeUi(selected.pedagogy.preparation)}</p>
      {selected.pedagogy.prerequisites.length>0&&<p><Translation id="etudes.prerequisite" />{selected.pedagogy.prerequisites.map(id=>localizeUi(ETUDES.find(e=>e.templateId===id)?.title??id)).join(' → ')}</p>}
      <p>{localizeUi(selected.pedagogy.instructions)}</p><ul>{selected.tips.map((tip,i)=><li key={i}>{localizeUi(tip)}</li>)}</ul><ul>{selected.pedagogy.keyBars.map(k=><li key={k.bar}><strong>{k.bar}<Translation id="etudes.bar" />{k.event}<Translation id="etudes.note" /></strong> · {localizeUi(k.text)}</li>)}</ul>
      <p><Translation id="etudes.warmUp" />{selected.pedagogy.tempo.start}<Translation id="etudes.bpmTarget" />{selected.pedagogy.tempo.target}<Translation id="originalUi.bpmApp" /></p><strong><Translation id="etudes.completionChecklist" /></strong><ul>{selected.pedagogy.checks.map(c=><li key={c}>{localizeUi(c)}</li>)}</ul><p>{localizeUi(selected.pedagogy.review)}</p>
      <p>{selected.accompaniment?translateUi("etudes.notationVerticallyAlignedTabNotesArePluckedTogetherLetRingSustainsNotes"):translateUi("etudes.notationHHammerOnPPullOffSlSlide")}</p></details>
    <details className="etudeTips etudeCommonTips"><summary><strong><Translation id="etudes.generalTip" />{selected.accompaniment ? translateUi("etudes.fingerstyleBacking") : translateUi("etudes.pickingAndPracticeBasics")}</strong><ChevronDown size={24} aria-hidden="true" /></summary>
      <ul>{commonTips.map(tip=><li key={tip.title}><strong>{localizeUi(tip.title)}</strong><div>{localizeUi(tip.text)}</div></li>)}</ul>
      <div className="etudePickingExamples"><table><caption>{selected.accompaniment ? translateUi("etudes.rightHandExamplePThumbIIndexMMiddleARingMeans") : translateUi("etudes.steadyBeatPickingExampleDDownUUp")}</caption><thead><tr><th><Translation id="etudes.rhythm" /></th><th><Translation id="etudes.counting" /></th><th>{selected.accompaniment?translateUi("etudes.rightHand"):translateUi("etudes.picking")}</th></tr></thead><tbody>{examples.map(row=><tr key={row.rhythm}><th scope="row">{localizeUi(row.rhythm)}</th><td>{row.count}</td><td>{localizeUi(row.strokes)}</td></tr>)}</tbody></table></div>
      <p><Translation id="etudes.theseAreGeneralPracticeExamplesNotPrescribedPickingDirectionsForEveryNote" /></p>
    </details>
  </section>;
}


export default function EtudeStudio({ mobile, onOpenMenu, onExit, onImportPdf, initialId=DEFAULT_ETUDE_ID, initialSavedId='' }) {
  useLanguage();
  const [edits,setEdits]=useState(loadEdits);
  const readFavorites=()=>{try{return {values:loadScoreFolders(localStorage).favorites,error:''};}catch(e){return {values:{},error:e.message};}};
  const [favoriteStore,setFavoriteStore]=useState(readFavorites);
  useEffect(()=>{const refresh=e=>{if(!e||e.type==='focus'||e.key===SCORE_FOLDERS_KEY)setFavoriteStore(readFavorites());};window.addEventListener('storage',refresh);window.addEventListener('focus',refresh);return()=>{window.removeEventListener('storage',refresh);window.removeEventListener('focus',refresh);};},[]);
  const [editing,setEditing]=useState(null);
  const [savedId,setSavedId]=useState(initialSavedId);
  const savedScores=Object.values(edits.records).filter(r=>r.status!=='unreadable');
  const savedRecord=savedScores.find(r=>r.document.id===savedId);
  const compiled=useMemo(()=>savedRecord?compileScoreDocument(savedRecord.document):null,[savedRecord]);
  const [selectedId, setSelectedId] = useState(initialId);
  const [bpm, updateBpm] = useState(()=>edits.records[initialSavedId]?.document?.bpm??edits.scores[initialId]?.bpm??ETUDES.find(e=>e.id===initialId)?.bpm??DEFAULT_ETUDE_BPM);
  const list = useMemo(() => ETUDES.map(e=>edits.scores[e.id]??e), [edits]);
  const selected = compiled?.score ?? list.find(e => e.id === selectedId) ?? list[0];
  const session=usePracticeSession(selected,bpm,updateBpm);
  const {controller,layout}=session;
  const filters=selected?{type:selected.type,level:selected.level,style:ko["app.all"]}:undefined;
  const select = id => { controller.current?.stop(); setSavedId(''); setSelectedId(id); updateBpm((edits.scores[id]??ETUDES.find(e => e.id === id))?.bpm ?? 60); };
  const selectSaved=id=>{controller.current?.stop();setSavedId(id);updateBpm(savedScores.find(r=>r.document.id===id)?.document.bpm??list.find(e=>e.id===selectedId)?.bpm??60);};
  const saveEdit=document=>{let result;try{result=saveLibraryDocument(window.localStorage,document,ETUDES);}catch{result={saved:false,errors:[ko["etudes.thisBrowserCannotSaveLocallyExportAFileInstead"]]};}if(result.saved)setEdits(current=>({...current,records:{...current.records,[document.id]:result.record}}));return result;};
  const canEdit=Boolean(savedRecord)||import.meta.env.DEV;
  const editScore=score=>{if(!canEdit)return;controller.current?.stop();setEditing(savedRecord?structuredClone(savedRecord.document):copyDocument(toScoreDocument(score)));};
  const favoriteKey=savedId?`score:${savedId}`:`score:etude:${selected.id}`;
  const toggleFavorite=()=>{try{const data=loadScoreFolders(localStorage);const next=updateScoreFolders(localStorage,{type:'favorite',keys:[favoriteKey],value:!data.favorites[favoriteKey]});setFavoriteStore({values:next.favorites,error:''});}catch(e){setFavoriteStore(current=>({...current,error:formatMessage(ko["etudes.couldNotSaveFavoritesValue"], { value1: e.message })}));}};
  const model = { ...session, favorites:favoriteStore.values,isFavorite:Boolean(favoriteStore.values[favoriteKey]),toggleFavorite, createScore:()=>{controller.current?.stop();setEditing(createBlankDocument());},canEdit, savedScores,savedId,selectSaved,editing, saveEdit, editScore, filters, list, selected, select, bpm, onOpenMenu, onExit,
    openLesson: lesson => { if (!canOpenLesson(selected, lesson, filters)) return; select(lesson.id); },
    setBpm: v => { updateBpm(Math.min(240, Math.max(30, Math.round(Number(v) || 30)))); },
 };
  return <>{favoriteStore.error&&<p role="alert">{localizeUi(favoriteStore.error)}</p>}{edits.errors.length>0&&<p role="status" className="etudeStorageNotice">{edits.errors.map(localizeUi).join(' ')}</p>}

    <section className={"etudeStudio etudeStudio--simple "+(mobile?"etudeStudio--mobile":"etudeStudio--desktop")} >{!layout.focus&&<SongPicker model={model} mobile={mobile}/>}<PracticeSheet model={model} mobile={mobile} title={savedRecord?.document.title} heading={savedRecord?<header className="etudeSheetHeader"><h2>{savedRecord.document.title}</h2><div className="etudeSheetMeta"><span>{savedRecord.document.keySignature}</span><span>♩ = {bpm}</span></div></header>:undefined} lessonTips={savedRecord?undefined:<LessonTips model={model}/>}/></section>
    <PracticeSessionPlayback model={model} mobile={mobile} disabled={Boolean(editing)||Boolean(compiled?.issues?.length)}/>
    {editing&&<Suspense fallback={<p role="status"><Translation id="etudes.preparingTheEditor" /></p>}><ScoreEditor key={editing.id} document={editing} original={ETUDES.find(e=>e.templateId===editing.origin?.templateId)} mobile={mobile} onClose={()=>setEditing(null)} onSave={saveEdit} onImportPdf={onImportPdf}/></Suspense>}
  </>;
}

