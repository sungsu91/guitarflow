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
function loadEdits(){try{return {...loadLibrary(window.localStorage,ETUDES),scores:{}};}catch{return {records:{},scores:{},errors:['이 브라우저에서는 수정본 저장소를 사용할 수 없습니다.']};}}
const DEFAULT_ETUDE_ID = 'G-triad-start';
const DEFAULT_ETUDE_BPM = ETUDES.find(etude => etude.id === DEFAULT_ETUDE_ID)?.bpm ?? 60;

function Select({ label, value, options, onChange }) {
  return <label className="etudeSelect"><span>{label}</span><select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>
    {options.map(o => <option key={typeof o === 'string' ? o : o.id} value={typeof o === 'string' ? o : o.id}>{typeof o === 'string' ? o : o.title}</option>)}
  </select></label>;
}

function SongPicker({ model }) {
 const {list,selected,select,savedScores,savedId,selectSaved}=model;
 const types=[...new Set(list.map(e=>e.type))],course=list.filter(e=>e.type===selected?.type),index=course.findIndex(e=>e.id===selected?.id);
 return <div className="etudeSongPicker etudeQuickBrowse">
  <div className="etudeQuickSelects"><Select label="연습 유형" value={savedId?'':selected?.type??types[0]} options={[{id:'',title:'앱 연습 유형'},...types]} onChange={type=>{if(type)select(list.find(e=>e.type===type).id);}}/><Select label="내 저장 악보" value={savedId} options={[{id:'',title:savedScores.length?'악보 선택':'저장된 악보 없음'},...savedScores.map(r=>({id:r.document.id,title:r.document.title}))]} onChange={selectSaved}/></div>
  {!savedId&&<nav className="etudeQuickPages" aria-label="에튀드 쪽넘김"><button type="button" aria-label="이전 연습곡" disabled={index<=0} onClick={()=>select(course[index-1].id)}><ChevronLeft aria-hidden="true"/></button><span aria-live="polite">{index+1} / {course.length}</span><button type="button" aria-label="다음 연습곡" disabled={index<0||index>=course.length-1} onClick={()=>select(course[index+1].id)}><ChevronRight aria-hidden="true"/></button></nav>}
 </div>;
}

function LessonTips({ model }) {
  const { selected } = model;
  if (!selected) return null;
  const course = lessonCourse(selected, model.filters);
  const index = course.findIndex(e => e.id === selected.id);
  const commonTips = selected.accompaniment ? FINGERSTYLE_PRACTICE_TIPS : COMMON_PRACTICE_TIPS;
  const examples = selected.accompaniment ? FINGERSTYLE_EXAMPLES : PICKING_EXAMPLES;
  return <section className="etudeLesson" aria-label="연습 커리큘럼">
    <div className="etudeLessonNav"><button type="button" disabled={index <= 0} onClick={() => model.openLesson(course[index - 1])}>‹ 이전</button><span><span>{selected.type} · {selected.level}</span><strong>{index + 1} / {course.length}</strong></span><button type="button" disabled={index < 0 || index === course.length - 1} onClick={() => model.openLesson(course[index + 1])}>다음 ›</button></div>
    <details key={selected.id} className="etudeTips"><summary><strong>TIP · 연습 방법</strong><ChevronDown size={24} aria-hidden="true" /></summary>
      <p><strong>학습목표</strong> · {selected.pedagogy.objective}</p><p className="etudePrerequisite">{selected.pedagogy.preparation}</p>
      {selected.pedagogy.prerequisites.length>0&&<p>선행 연습: {selected.pedagogy.prerequisites.map(id=>ETUDES.find(e=>e.templateId===id)?.title??id).join(' → ')}</p>}
      <p>{selected.pedagogy.instructions}</p><ul>{selected.tips.map((tip,i)=><li key={i}>{tip}</li>)}</ul><ul>{selected.pedagogy.keyBars.map(k=><li key={k.bar}><strong>{k.bar}마디 {k.event}음</strong> · {k.text}</li>)}</ul>
      <p>준비 {selected.pedagogy.tempo.start} BPM → 기준 {selected.pedagogy.tempo.target} BPM</p><strong>완료 점검</strong><ul>{selected.pedagogy.checks.map(c=><li key={c}>{c}</li>)}</ul><p>{selected.pedagogy.review}</p>
      <p>{selected.accompaniment?'표기: 세로 TAB은 동시 뜯기 · let ring은 잔향 유지':'표기: H 해머온 · P 풀오프 · SL 슬라이드'}</p></details>
    <details className="etudeTips etudeCommonTips"><summary><strong>공통 TIP · {selected.accompaniment ? '핑거스타일 반주' : '피킹과 연습 기본'}</strong><ChevronDown size={24} aria-hidden="true" /></summary>
      <ul>{commonTips.map(tip=><li key={tip.title}><strong>{tip.title}</strong><div>{tip.text}</div></li>)}</ul>
      <div className="etudePickingExamples"><table><caption>{selected.accompaniment ? '오른손 예시 · p 엄지 / i 검지 / m 중지 / a 약지 · +는 동시에' : '일정한 박에 맞추는 피킹 예시 · D 다운 / U 업'}</caption><thead><tr><th>리듬</th><th>세는 법</th><th>{selected.accompaniment?'오른손':'피킹'}</th></tr></thead><tbody>{examples.map(row=><tr key={row.rhythm}><th scope="row">{row.rhythm}</th><td>{row.count}</td><td>{row.strokes}</td></tr>)}</tbody></table></div>
      <p>공통 연습 예시이며 모든 음의 피킹 방향을 지정한 악보는 아닙니다.</p>
    </details>
  </section>;
}


export default function EtudeStudio({ mobile, onOpenMenu, onExit, onImportPdf, initialId=DEFAULT_ETUDE_ID }) {
  const [edits,setEdits]=useState(loadEdits);
  const [editing,setEditing]=useState(null);
  const [savedId,setSavedId]=useState('');
  const savedScores=Object.values(edits.records).filter(r=>r.status!=='unreadable');
  const savedRecord=savedScores.find(r=>r.document.id===savedId);
  const compiled=useMemo(()=>savedRecord?compileScoreDocument(savedRecord.document):null,[savedRecord]);
  const [selectedId, setSelectedId] = useState(initialId);
  const [bpm, updateBpm] = useState(()=>edits.scores[initialId]?.bpm??ETUDES.find(e=>e.id===initialId)?.bpm??DEFAULT_ETUDE_BPM);
  const list = useMemo(() => ETUDES.map(e=>edits.scores[e.id]??e), [edits]);
  const selected = compiled?.score ?? list.find(e => e.id === selectedId) ?? list[0];
  const session=usePracticeSession(selected,bpm,updateBpm);
  const {controller,layout}=session;
  const filters=selected?{type:selected.type,level:selected.level,style:'전체'}:undefined;
  const select = id => { controller.current?.stop(); setSavedId(''); setSelectedId(id); updateBpm((edits.scores[id]??ETUDES.find(e => e.id === id))?.bpm ?? 60); };
  const selectSaved=id=>{controller.current?.stop();setSavedId(id);updateBpm(savedScores.find(r=>r.document.id===id)?.document.bpm??list.find(e=>e.id===selectedId)?.bpm??60);};
  const saveEdit=document=>{let result;try{result=saveLibraryDocument(window.localStorage,document,ETUDES);}catch{result={saved:false,errors:['이 브라우저에서는 저장할 수 없습니다. 파일로 내보내세요.']};}if(result.saved)setEdits(current=>({...current,records:{...current.records,[document.id]:result.record}}));return result;};
  const canEdit=Boolean(savedRecord)||import.meta.env.DEV;
  const editScore=score=>{if(!canEdit)return;controller.current?.stop();setEditing(savedRecord?structuredClone(savedRecord.document):copyDocument(toScoreDocument(score)));};
  const model = { ...session, createScore:()=>{controller.current?.stop();setEditing(createBlankDocument());},canEdit, savedScores,savedId,selectSaved,editing, saveEdit, editScore, filters, list, selected, select, bpm, onOpenMenu, onExit,
    openLesson: lesson => { if (!canOpenLesson(selected, lesson, filters)) return; select(lesson.id); },
    setBpm: v => { updateBpm(Math.min(240, Math.max(30, Math.round(Number(v) || 30)))); },
 };
  return <>{edits.errors.length>0&&<p role="status" className="etudeStorageNotice">{edits.errors.join(' ')}</p>}

    <section className={"etudeStudio etudeStudio--simple "+(mobile?"etudeStudio--mobile":"etudeStudio--desktop")} >{!layout.focus&&<SongPicker model={model}/>}<PracticeSheet model={model} mobile={mobile} title={savedRecord?.document.title} heading={savedRecord?<header className="etudeSheetHeader"><h2>{savedRecord.document.title}</h2><div className="etudeSheetMeta"><span>{savedRecord.document.keySignature}</span><span>♩ = {bpm}</span></div></header>:undefined} lessonTips={savedRecord?undefined:<LessonTips model={model}/>}/></section>
    <PracticeSessionPlayback model={model} mobile={mobile} disabled={Boolean(editing)||Boolean(compiled?.issues?.length)}/>
    {editing&&<Suspense fallback={<p role="status">편집기를 준비하고 있습니다…</p>}><ScoreEditor key={editing.id} document={editing} original={ETUDES.find(e=>e.templateId===editing.origin?.templateId)} mobile={mobile} onClose={()=>setEditing(null)} onSave={saveEdit} onImportPdf={onImportPdf}/></Suspense>}
  </>;
}
