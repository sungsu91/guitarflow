import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ETUDES, LEVELS } from './catalog.js';
import { filterEtudes, changeEtudeFilter, lessonCourse, canOpenLesson, availableStyles, DEFAULT_FILTERS } from './filters.js';
import { TYPES, getTrack } from './tracks.js';
import useEtudeMetronome from './useEtudeMetronome.js';
import './etudes.css';
import { ChevronDown } from 'lucide-react';
import { COMMON_PRACTICE_TIPS, PICKING_EXAMPLES, FINGERSTYLE_PRACTICE_TIPS, FINGERSTYLE_EXAMPLES } from './practiceTips.js';

const Score = lazy(() => import('./Score.jsx'));
const DEFAULT_ETUDE_ID = 'G-triad-start';
const DEFAULT_ETUDE_BPM = ETUDES.find(etude => etude.id === DEFAULT_ETUDE_ID)?.bpm ?? 60;

function Select({ label, value, options, onChange }) {
  return <label className="etudeSelect"><span>{label}</span><select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>
    {options.map(o => <option key={typeof o === 'string' ? o : o.id} value={typeof o === 'string' ? o : o.id}>{typeof o === 'string' ? o : o.title}</option>)}
  </select></label>;
}

function Filters({ model, mobile = false }) {
  const { filters, setFilter, list, selected, select } = model;
  const track = getTrack(filters.type);
  const fields = <>
    <div className="etudeStyleFilter">
      <Select label="스타일" value={filters.style} options={availableStyles(filters)} onChange={v => setFilter('style', v)} />
    </div>
  </>;
  return <div className="etudeFilters">
    <div className="etudeTrackPicker">
      <Select label="연습 유형" value={filters.type} options={TYPES} onChange={v => setFilter('type', v)} />
      <p className="etudeTrackSummary">{track.summary}</p>
      <div className="etudeLevelChoices" role="group" aria-label="난이도">
        {LEVELS.map((level,index) => <button type="button" key={level} aria-label={level} aria-pressed={filters.level===level} onClick={()=>setFilter('level',level)}><strong>{level}</strong><small>{track.stages[index][1].length}개</small></button>)}
      </div>
      <p className="etudeTrackGoal">{track.stages[LEVELS.indexOf(filters.level)][0]}</p>
    </div>
    {mobile ? <details className="etudeMobileFilterDetails"><summary><strong>스타일 · {filters.style}</strong><span className="etudeFilterToggle"><ChevronDown aria-hidden="true" size={26} strokeWidth={2.5} /></span></summary>{fields}</details> : fields}
    {list.length ? <Select label={`연습곡 · ${list.length}개`} value={selected.id} options={list.map((e,index) => ({id:e.id,title:`${String(index+1).padStart(2,'0')} · ${e.title}`}))} onChange={select} /> : <div className="etudeEmpty" role="status">이 조건의 연습곡은 아직 없습니다.<button type="button" onClick={model.reset}>필터 초기화</button></div>}
    {selected && <p className="etudePurpose">{selected.purpose}</p>}
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
    <details key={selected.id} className="etudeTips"><summary><strong>TIP · 연습 방법</strong><ChevronDown size={24} aria-hidden="true" /></summary><p className="etudePrerequisite">{getTrack(selected.type).prerequisite}</p><ul>{selected.tips.map(tip => <li key={tip}>{tip}</li>)}</ul><p>{selected.accompaniment?'표기: 세로 TAB은 동시 뜯기 · let ring은 잔향 유지':'표기: H 해머온 · P 풀오프 · SL 슬라이드'}</p></details>
    <details className="etudeTips etudeCommonTips"><summary><strong>공통 TIP · {selected.accompaniment ? '핑거스타일 반주' : '피킹과 연습 기본'}</strong><ChevronDown size={24} aria-hidden="true" /></summary>
      <ul>{commonTips.map(tip=><li key={tip.title}><strong>{tip.title}</strong><div>{tip.text}</div></li>)}</ul>
      <div className="etudePickingExamples"><table><caption>{selected.accompaniment ? '오른손 예시 · p 엄지 / i 검지 / m 중지 / a 약지 · +는 동시에' : '일정한 박에 맞추는 피킹 예시 · D 다운 / U 업'}</caption><thead><tr><th>리듬</th><th>세는 법</th><th>{selected.accompaniment?'오른손':'피킹'}</th></tr></thead><tbody>{examples.map(row=><tr key={row.rhythm}><th scope="row">{row.rhythm}</th><td>{row.count}</td><td>{row.strokes}</td></tr>)}</tbody></table></div>
      <p>공통 연습 예시이며 모든 음의 피킹 방향을 지정한 악보는 아닙니다.</p>
    </details>
  </section>;
}

function ZoomSheet({ children, onClose, mobile }) {
  const ref = useRef(null);
  const [rotationHint, setRotationHint] = useState('');
  const rotation = useRef({ live: false, locked: false, fullscreen: false });
  const releaseRotation = () => {
    if (rotation.current.locked) { window.screen.orientation?.unlock?.(); rotation.current.locked = false; }
    if (rotation.current.fullscreen && document.fullscreenElement === document.documentElement) document.exitFullscreen?.().catch(() => {});
    rotation.current.fullscreen = false;
  };
  const turnLandscape = async () => {
    const orientation = window.screen?.orientation;
    if (!orientation?.lock) { setRotationHint('휴대폰의 회전 잠금을 풀고 가로로 돌려 주세요.'); return; }
    if (window.matchMedia('(orientation: landscape)').matches) return;
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        rotation.current.fullscreen = true;
      }
      if (!rotation.current.live) { releaseRotation(); return; }
      await orientation.lock('landscape');
      rotation.current.locked = true;
      if (!rotation.current.live) { releaseRotation(); return; }
      setRotationHint('가로 보기 중입니다. 닫으면 회전 잠금이 해제됩니다.');
    } catch {
      releaseRotation();
      if (rotation.current.live) setRotationHint('이 브라우저에서는 휴대폰을 직접 가로로 돌려 주세요. 회전 잠금도 확인해 주세요.');
    }
  };
  useLayoutEffect(() => {
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    rotation.current.live = true;
    dialog.showModal();
    if (mobile) void turnLandscape();
    return () => { rotation.current.live = false; releaseRotation(); dialog.close(); document.body.style.overflow = overflow; };
  }, []);
  return <dialog ref={ref} className={`etudeZoom ${mobile ? 'etudeZoom--mobile' : 'etudeZoom--desktop'}`} aria-label="확대 악보" onCancel={onClose}><div className="etudeZoomToolbar"><span>확대 악보</span><button type="button" autoFocus onClick={onClose}>닫기 ✕</button></div>{rotationHint && <p className="etudeRotationHint" role="status">{rotationHint}</p>}<article className="etudeSheet">{children}</article></dialog>;
}

function Metronome({ model }) {
  const { bpm, setBpm, metro } = model;
  const [draft, setDraft] = useState(String(bpm));
  useEffect(() => setDraft(String(bpm)), [bpm]);
  const commit = () => {
    const value = draft.trim() === '' || !Number.isFinite(Number(draft)) ? bpm : Math.min(240, Math.max(30, Math.round(Number(draft))));
    setDraft(String(value)); setBpm(value);
  };
  return <section className="etudeMetronome" aria-label="악보 메트로놈">
    <div className="etudeBeatRow" aria-label={metro.beat < 0 ? '메트로놈 정지' : `${metro.beat + 1}박`}>
      {[0,1,2,3].map(i => <span key={i} className={`etudeBeat ${metro.beat === i ? 'is-on' : ''} ${i === 0 ? 'is-downbeat' : ''}`}><i />{i + 1}</span>)}
      <small>4/4</small>
    </div>
    <div className="etudeTempoRow">
      <button type="button" aria-label="BPM 1 낮추기" onClick={() => setBpm(bpm - 1)}>−</button>
      <label><span>BPM</span><input aria-label="연습 BPM" type="number" inputMode="numeric" min="30" max="240" value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></label>
      <button type="button" aria-label="BPM 1 높이기" onClick={() => setBpm(bpm + 1)}>+</button>
      <button type="button" className="etudePlay" aria-pressed={metro.playing} onClick={metro.toggle}>{metro.playing ? '■ 정지' : '▶ 시작'}</button>
    </div>
    <input className="etudeTempoSlider" aria-label="BPM 슬라이더" type="range" min="30" max="240" value={bpm} onChange={e => setBpm(e.target.value)} />
    {metro.error && <p role="alert">{metro.error}</p>}
  </section>;
}

function Sheet({ model, mobile }) {
  const [expanded, setExpanded] = useState(false);
  const { selected: etude, bpm } = model;
  if (!etude) return null;
  const content = (enlarged = false) => <>
    <header className="etudeSheetHeader">
      <div className="etudeSheetBrand"><img src="/icons/fretiva-lab-icon-192.png" alt="" /><span>FRETIVA LAB</span></div>
      <h2>{etude.english}</h2>
      <div className="etudeSheetMeta"><span>Standard tuning · E A D G B E · {etude.keySignature}</span><span>♩ = {bpm}</span></div>
    </header>
    <Suspense fallback={<p className="etudeLoading">악보를 준비하고 있습니다…</p>}><Score etude={etude} mobile={mobile} bpm={bpm} enlarged={enlarged} /></Suspense>
  </>;
  return <>
    <div className="etudeSheetTools"><span>{etude.level} · {etude.style} · {etude.type}</span><button type="button" onClick={() => setExpanded(true)}>{mobile ? '가로 전환 ↻' : '악보 크게 보기 ↗'}</button></div>
    <article className="etudeSheet" aria-label="연습 악보">{content()}</article>
    {expanded && <ZoomSheet mobile={mobile} onClose={() => setExpanded(false)}>{content(true)}</ZoomSheet>}
  </>;
}

function Heading() {
  return <header className="etudeHeading"><div><span className="etudeEyebrow">FRETIVA LAB / STUDIES</span><h1>에튀드 스튜디오 <b>PRO</b></h1></div><p>유형별로, 기초부터 응용까지.</p></header>;
}

function MobileLayout({ model }) {
  return <section className="etudeStudio etudeStudio--mobile"><nav className="etudeMobileNav"><button type="button" onClick={model.onExit} aria-label="홈으로 가기">홈 ⌂</button><button type="button" onClick={model.onOpenMenu} aria-label="메뉴 열기">메뉴 ☰</button></nav><Heading /><Filters model={model} mobile /><LessonTips model={model} /><Sheet model={model} mobile />{model.selected && <Metronome model={model} />}</section>;
}

function DesktopLayout({ model }) {
  return <section className="etudeStudio etudeStudio--desktop"><Heading /><div className="etudeDesktopBody"><aside><Filters model={model} /><LessonTips model={model} /></aside><div className="etudeScoreColumn"><Sheet model={model} mobile={false} />{model.selected && <Metronome model={model} />}</div></div></section>;
}

export default function EtudeStudio({ mobile, onOpenMenu, onExit }) {
  const defaults = DEFAULT_FILTERS;
  const [filters, setFilters] = useState(defaults);
  const [selectedId, setSelectedId] = useState(DEFAULT_ETUDE_ID);
  const [bpm, updateBpm] = useState(DEFAULT_ETUDE_BPM);
  const metro = useEtudeMetronome(bpm);
  const list = useMemo(() => filterEtudes(filters), [filters]);
  const selected = list.find(e => e.id === selectedId) ?? list[0];
  const select = id => { metro.stop(); setSelectedId(id); updateBpm(ETUDES.find(e => e.id === id)?.bpm ?? 60); };
  const setFilter = (key, value) => {
    metro.stop();
    const next = changeEtudeFilter(filters, key, value);
    const available = filterEtudes(next);
    const match = (key==='style' ? available.find(e => e.templateId === selected?.templateId) : null) ?? available[0];
    setFilters(next); setSelectedId(match?.id ?? ''); updateBpm(match?.bpm ?? 60);
  };
  const model = { filters, setFilter, list, selected, select, bpm, metro, onOpenMenu, onExit,
    openLesson: lesson => { if (!canOpenLesson(selected, lesson, filters)) return; select(lesson.id); },
    setBpm: v => { metro.stop(); updateBpm(Math.min(240, Math.max(30, Math.round(Number(v) || 30)))); },
    reset: () => { metro.stop(); setFilters(defaults); setSelectedId(DEFAULT_ETUDE_ID); updateBpm(DEFAULT_ETUDE_BPM); } };
  return mobile ? <MobileLayout model={model} /> : <DesktopLayout model={model} />;
}
