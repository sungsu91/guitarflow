import {ensurePianoVoices,isPiano,pianoCursor,pianoPosition,pianoVoiceEdit,enterPiano,stepPiano,movePianoHand} from './pianoInput.js';
import DrumInput from './DrumInput.jsx';
import usePianoAudition from './usePianoAudition.js';
import useDrumAudition from './useDrumAudition.js';
import {advanceDrum,drumRest,enterDrumNotes,fillDrumMeasure} from './drumInput.js';
import KeyboardInput from './KeyboardInput.jsx';
import {isFretted} from './scoreInstruments.js';
import useEditorSettings from './EditorSettings.jsx';
import useMidiKeyboard from './useMidiKeyboard.js';
import {enterMidiNotes} from './enterMidiNotes.js';
import {normalizePitches,effectiveTuning,soundingMidi,tuningCaption,maxFret,midiName} from './scoreTuning.js';
import '../pdf/scoreWorkspaceTheme.css';
import {copyGripToNext,deleteGrip} from './scoreLineCommands.js';
import InstrumentChangeDialog from './InstrumentChangeDialog.jsx';
import {SCORE_INSTRUMENTS,scoreInstrument} from './scoreInstruments.js';
import {convertScoreInstrument} from './convertScoreInstrument.js';
import { lockDocumentScroll, containModalTouch } from "../ui/modalScrollLock.js";
import {setScoreNavigation} from './scoreNavigation.js';
import {setScoreRepeat,repeatIssues} from './scoreRepeats.js';
import ScoreSaveDialog from './ScoreSaveDialog.jsx';
import {ArrowLeft,Undo2,Redo2,ChevronUp,ChevronDown,Printer} from 'lucide-react';
import EditorMusicIcon from './EditorMusicIcon.jsx';
import RhythmModifiers from './RhythmModifiers.jsx';
import {inputRhythm,tripletProgress,rhythmInputLabel} from './rhythmInput.js';
import {removeTriplet} from './tuplets.js';
import {beamable,canJoinBeam,setBeamBefore,setBeamRange} from './beamOverrides.js';
import {printEditorScore} from './printScore.js';
import {SCORE_FILE_ACCEPT,isPdfScoreFile} from './scoreFile.js';
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import MobileScoreInput from './MobileScoreInput.jsx';
import MobileScoreSheets from './MobileScoreSheets.jsx';
import EditorScore from './EditorScore.jsx';
import ScorePlayback from './ScorePlayback.jsx';
import EditorInputPanel,{DurationButtons} from './EditorInputPanel.jsx';
import {tupletGroups,ticksOf,patchEvent,shareUnchanged,hasEditableShape,newId,createBlankDocument,copyDocument,blankMeasure,pitchCandidates,pitchForMidi,cloneMeasure} from './scoreModel.js';
import {deleteMeasure,setNoteConnection,setEventDuration,resolveFretInput,deleteTone,moveFingering,setRest,insertEvent,moveTone,splitEvent,applyPicking,nextEntry,cursorStep,copyBars,pasteBars} from './editorCommands.js';
import {upgradeDocument} from './scoreDocument.js';
import {compileScoreDocument,toScoreDocument,updateDocumentChordFret} from './scoreDocument.js';
import './scoreEditor.css';
import './editorDesign.css';
const clone=value=>structuredClone(value);
const durations=[['1','온음표 · 4박'],['2','2분음표 · 2박'],['4','4분음표 · 1박'],['8','8분음표 · ½박'],['16','16분음표 · ¼박']];
const number=value=>value.trim()===''?'':Number(value);
const noteLabel=event=>event.voice?`${event.voice==='left'?'왼손':'오른손'} · ${event.onset/480+1}박 · ${event.rest?(event.blank?'빈 입력 위치':'쉼표'):event.notes.map(n=>midiName(n.midi)).join(' + ')}`:event.rest?(event.blank?'빈 입력 위치':'쉼표'):event.notes.map(n=>`${n.string}번줄 ${n.dead??event.dead?'X':n.fret}`).join(' + ');

function Controls({draft,setDraft,bar,setBar,event,setEvent,section='note',mobile}) {
 const [groupError,setGroupError]=useState('');
 const m=draft.measures[bar],n=m.events[event],stringCount=draft.tuning.length;
 const edit=fn=>setDraft(old=>{const next=clone(old);fn(next);return next;});
 const setNote=(tone,key,value)=>edit(d=>{const n=d.measures[bar].events[event].notes[tone];n[key]=value;if(key==='string'||key==='fret'){n.locked=true;delete n.spelling;}});
 const beats=isPiano(draft)?Math.max(...m.events.map(e=>(e.onset+ticksOf(e))/480)):m.events.reduce((sum,n)=>sum+ticksOf(n)/480,0),capacity=draft.meter[0]*4/draft.meter[1];
 return <div className="etudeEditorControls">
  {section==='info'&&<details open><summary>제목 · BPM · 연습 설명</summary>
   <label>목록 제목<input value={draft.title} onChange={e=>edit(d=>{d.title=e.target.value;})}/></label>
   <label>악보 제목<input value={draft.english} onChange={e=>edit(d=>{d.english=e.target.value;})}/></label>
   <label>기본 BPM<input type="number" min="30" max="240" value={draft.bpm} onChange={e=>edit(d=>{d.bpm=number(e.target.value);})}/></label>
   <label>연습 설명<textarea value={draft.purpose} onChange={e=>edit(d=>{d.purpose=e.target.value;})}/></label>
   <label>TIP · 한 줄에 한 문장<textarea value={draft.tips.join('\n')} onChange={e=>edit(d=>{d.tips=e.target.value.split('\n');})}/></label>
  </details>}
  {section!=='info'&&<>{(mobile||section==='bar')&&<div className="etudeEditorSelectors">
   <label>마디<select aria-label="편집 마디" value={bar} onChange={e=>{setBar(Number(e.target.value));}}>{draft.measures.map((_,i)=><option key={i} value={i}>{i+1}마디</option>)}</select></label>
   <label>음표 · 쉼표<select aria-label="편집 음표" value={event} onChange={e=>setEvent(Number(e.target.value))}>{m.events.map((n,i)=><option key={i} value={i}>{i+1} · {noteLabel(n)}</option>)}</select></label>
  </div>}
  <p className={beats===capacity?'etudeEditorBeatTotal':'etudeEditorBeatTotal is-invalid'}>현재 마디 {beats} / {capacity}박</p>
  </>}
  {section==='note'&&<><details className="etudeNoteAdvanced"><summary>고급 옵션</summary><label>시작 시점 · 4분음표=1박<input aria-label="음표 시작 시점" type="number" min="0" step="0.25" value={n.onset/480} onChange={e=>edit(d=>{d.measures[bar].events[event].onset=Number(e.target.value)*480;})}/></label></details>
  <div className="etudeEditorEvent">
   <div className="etudeBeamControls" role="group" aria-label="선택 음 빔 설정"><span>빔</span>{[['auto','자동'],['join','← 연결'],['break','끊기']].map(([value,label])=><button key={value} type="button" aria-label={`빔 ${label}`} aria-pressed={(n.beamBefore??'auto')===value} disabled={value==='join'?!canJoinBeam(m.events,event):value==='break'?!beamable(n):false} onClick={()=>setDraft(d=>setBeamBefore(d,{bar,event},value))}>{label}</button>)}</div>
   {n.tuplet&&<div className="etudeBeamControls"><span>3연음</span><button type="button" onClick={()=>{try{setDraft(d=>removeTriplet(d,{bar,event}));}catch(e){setGroupError(e.message);}}}>묶음 해제</button><button type="button" onClick={()=>{setDraft(d=>removeTriplet(d,{bar,event},{clear:true}));setEvent(tupletGroups(m.events).find(g=>g.includes(event))?.[0]??event);}}>묶음 삭제</button></div>}{groupError&&<p role="alert">{groupError}</p>}
   <p className="etudeSelectedDuration"><strong>현재 길이</strong><span>{n.dotted?'점8분음표 · ¾박':n.tuplet?`${n.duration}분 3연음 · ${ticksOf(n)}틱`:durations.find(([value])=>value===n.duration)?.[1]??n.duration}</span></p>
   <label className="etudeEditorCheck"><input type="checkbox" checked={n.rest&&!n.blank} onChange={e=>edit(d=>{const target=d.measures[bar].events[event];target.rest=e.target.checked;target.blank=false;target.technique=null;if(!target.rest&&!target.notes.length){const grip=d.measures[bar].chord;const string=grip?stringCount-grip.frets.findIndex(f=>f!==null):1;target.notes=[{string,fret:grip?grip.frets[stringCount-string]:0}];}})}/>쉼표</label>
   {!n.rest&&<>
    <details className="etudeNoteAdvanced"><summary>주법 / 연결</summary>{n.notes.map((tone,i)=><div className="etudeEditorTone" key={`fingers-${tone.id}`}><label>왼손 손가락<select aria-label={`음 ${i+1} 왼손 손가락`} value={tone.finger??''} onChange={e=>setNote(i,'finger',e.target.value?Number(e.target.value):null)}><option value="">없음</option>{[1,2,3,4].map(f=><option key={f}>{f}</option>)}</select></label><label>오른손<select aria-label={`음 ${i+1} 오른손`} value={tone.rightFinger??''} onChange={e=>setNote(i,'rightFinger',e.target.value||null)}><option value="">없음</option>{['p','i','m','a'].map(f=><option key={f}>{f}</option>)}</select></label></div>)}
    <label>피킹 방향<select value={n.pickStroke??''} onChange={e=>edit(d=>{d.measures[bar].events[event].pickStroke=e.target.value||null;})}><option value="">지정 안 함</option><option value="down">다운 Π</option><option value="up">업 V</option></select></label>
    <button type="button" disabled={n.notes.length>=stringCount} onClick={()=>edit(d=>{const target=d.measures[bar].events[event];const string=Array.from({length:stringCount},(_,i)=>i+1).find(s=>!target.notes.some(t=>t.string===s)&&(m.chord?m.chord.frets[stringCount-s]!==null:true));if(!string)return;target.notes.push({string,fret:m.chord?m.chord.frets[stringCount-string]:0});target.technique=null;})}>동시음 추가</button>
    <label>다음 음과 연결<select aria-label="연결 기법" value={n.technique??''} onChange={e=>edit(d=>{d.measures[bar].events[event].technique=e.target.value||null;})}><option value="">없음</option><option value="H" disabled={n.notes.length>1}>H · 해머온</option><option value="P" disabled={n.notes.length>1}>P · 풀오프</option><option value="S">SL · 슬라이드</option></select></label></details>
   </>}
   <div className="etudeEditorActions"><button type="button" disabled={m.events.length>=64} onClick={()=>{setDraft(d=>insertEvent(d,{bar,event},{duplicate:true}));setEvent(event+1);}}>음표 복제</button><button type="button" disabled={m.events.length<=1} onClick={()=>{edit(d=>{const e=d.measures[bar].events[event];Object.assign(e,{rest:true,blank:true,notes:[],pickStroke:null,technique:null,tieTo:null});});}}>음표 삭제</button></div>
  </div>
  </>}
  {section==='bar'&&<>{m.chord&&<details className="etudeEditorChord"><summary>이 마디의 코드표 수정</summary>
   <label>코드명<input aria-label="코드명" value={m.chord.name} onChange={e=>edit(d=>{d.measures[bar].chord.name=e.target.value;})}/></label>
   <p>위에서 1→{stringCount}번줄. 프렛을 바꾸면 이 마디의 해당 줄 음표도 함께 바뀝니다. ×는 뮤트, 0은 개방현입니다.</p>
   {Array.from({length:stringCount},(_,i)=>i+1).map(string=><div className="etudeEditorChordRow" key={string}><strong>{string}번줄</strong>
    <label>프렛<input aria-label={`코드 ${string}번줄 프렛`} value={m.chord.frets[stringCount-string]??'×'} onChange={e=>{const v=e.target.value.trim();setDraft(d=>updateDocumentChordFret(d,bar,string,/^[xX×]$/.test(v)?null:number(v)));}}/></label>
    <label>손가락<select aria-label={`코드 ${string}번줄 손가락`} value={m.chord.fingers[stringCount-string]??''} onChange={e=>edit(d=>{d.measures[bar].chord.fingers[stringCount-string]=e.target.value?Number(e.target.value):null;})}><option value="">표시 안 함</option>{[1,2,3,4].map(f=><option key={f}>{f}</option>)}</select></label>
   </div>)}
   <label className="etudeEditorCheck"><input type="checkbox" checked={Boolean(m.chord.barre)} onChange={e=>edit(d=>{d.measures[bar].chord.barre=e.target.checked?{fret:1,from:2,to:1}:null;})}/>바레 표시</label>
   {m.chord.barre&&<div className="etudeEditorBarre">{[['fret','바레 프렛',1,24],['from','바레 시작 줄',2,stringCount],['to','바레 끝 줄',1,stringCount-1]].map(([key,label,min,max])=><label key={key}>{label}<input aria-label={label} type="number" min={min} max={max} value={m.chord.barre[key]} onChange={e=>edit(d=>{d.measures[bar].chord.barre[key]=number(e.target.value);})}/></label>)}</div>}
  </details>}
  <div className="etudeEditorActions"><button type="button" disabled={draft.measures.length>=64} onClick={()=>{edit(d=>{d.measures.splice(bar+1,0,cloneMeasure(m));});setBar(bar+1);}}>마디 복제</button><button type="button" disabled={draft.measures.length<=1} onClick={()=>{setDraft(d=>deleteMeasure(d,bar));setBar(Math.max(0,bar-1));}}>마디 삭제</button></div></>}
 </div>;
}

export default function ScoreEditor({score,document:initialDocument,original,mobile,onClose,onSave,onImportPdf,compactImport=false}) {
 const [draft,updateDraft]=useState(()=>ensurePianoVoices(normalizePitches(initialDocument??toScoreDocument(score))));
 const draftRef=useRef(draft),undoStack=useRef([]),redoStack=useRef([]),digits=useRef(null),clipboard=useRef(null),savedRef=useRef(draft),openedRef=useRef(draft);
 const zoomController=useRef(null);
 const [saveRequest,setSaveRequest]=useState(null),[instrumentChange,setInstrumentChange]=useState(null);
 const sheetRef=useRef(null);
 const [cursor,setCursor]=useState({bar:0,event:0,string:draftRef.current.tuning.length,mode:'tab'}),[tab,setTab]=useState('score'),[message,setMessage]=useState(''),[closing,setClosing]=useState(false),[zoom,setZoom]=useState(100),[rangeEnd,setRangeEnd]=useState(0),[pitch,setPitch]=useState(64),[candidates,setCandidates]=useState([]);
 const [inputHand,setInputHand]=useState('right'),[chordMode,setChordMode]=useState(false);
 const pianoPositions=useRef({left:{bar:0,onset:0},right:{bar:0,onset:0}}),pianoHistory=useRef(new WeakMap()),chordPending=useRef(null);
 const [lastEntered,setLastEntered]=useState(null);
 const [drumBatch,setDrumBatch]=useState(false),[drumHat,setDrumHat]=useState('closed');
 const [drumPreview,setDrumPreview]=useState(true),[drumVolume,setDrumVolume]=useState(.8);
 const auditionDrum=useDrumAudition(draft.instrument==='drums'&&drumPreview,drumVolume,setMessage);
 const auditionPiano=usePianoAudition(isPiano(draft),setMessage);
 const rememberPiano=()=>({positions:structuredClone(pianoPositions.current),hand:cursorRef.current.hand??'right'});
 const restorePiano=d=>{const state=pianoHistory.current.get(d)??{positions:{left:{bar:0,onset:0},right:{bar:0,onset:0}},hand:'right'};pianoPositions.current=structuredClone(state.positions);setInputHand(state.hand);const c=pianoCursor(d,state.positions[state.hand],state.hand);setCursor({...c,...{eventId:d.measures[c.bar].events[c.event].id,onset:d.measures[c.bar].events[c.event].onset}});chordPending.current=null;setLastEntered(null);};
 const [resetOpen,setResetOpen]=useState(false),[pickingOpen,setPickingOpen]=useState(false),[pickScope,setPickScope]=useState('all'),[pickPattern,setPickPattern]=useState('alternate-down'),[skipLegato,setSkipLegato]=useState(true),[toolSection,setToolSection]=useState(null),[propertySection,setPropertySection]=useState('note'),[selectedDuration,setSelectedDuration]=useState('4'),[autoAdvance,setAutoAdvance]=useState(true);
 const [panelVisible,setPanelVisible]=useState(true),[tupletMode,setTupletMode]=useState('off'),[mobileSheet,setMobileSheet]=useState(null),[mobileDrag,setMobileDrag]=useState(false),[playPosition,setPlayPosition]=useState(null);
 const [techniqueHint,setTechniqueHint]=useState('시작 음을 선택하세요.'),[dottedMode,setDottedMode]=useState('off'),[restMode,setRestMode]=useState(false),[tupletSession,setTupletSession]=useState(null);
 const tripletInput=tupletMode==='active';
 const [beamRangeMode,setBeamRangeMode]=useState(false),[beamSelection,setBeamSelection]=useState(null);
 const fretted=isFretted(draft.instrument);
 const view=fretted?(draft.viewSettings?.notationView??'tab'):'staff';
 const setView=value=>setDraft(d=>({...d,viewSettings:{...d.viewSettings,notationView:value}}));
 const tabRhythm=draft.viewSettings?.tabRhythm!==false;
 const tabBeamPosition=draft.viewSettings?.tabBeamPosition??'below',tabPickingPosition=draft.viewSettings?.tabPickingPosition??'below';
 const onTabBeam=value=>setDraft(d=>({...d,viewSettings:{...d.viewSettings,tabRhythm:value!=='hidden',...(value==='hidden'?{}:{tabBeamPosition:value})}}));
 const onPickingPosition=value=>setDraft(d=>({...d,viewSettings:{...d.viewSettings,tabPickingPosition:value}}));
 const playbackController=useRef(null);
 const afterClose=useRef(null);const finishClose=()=>{onClose();afterClose.current?.();};
 const dialog=useRef(null),file=useRef(null),cursorRef=useRef(cursor);
 const cancelDigits=useCallback(()=>{digits.current=null;},[]);
 const setDraft=useCallback((update,{coalesce=false,keepDigits=false}={})=>{if(!keepDigits)cancelDigits();const before=draftRef.current;if(isPiano(before))pianoHistory.current.set(before,rememberPiano());let after=typeof update==='function'?update(before):update;after=shareUnchanged(before,ensurePianoVoices(normalizePitches(after)));if(before===after)return;
  // Legacy form duplication gets fresh identifiers; existing ones never change.
  const seen=new Set();let repair=false;for(const m of after.measures)for(const item of [m,...m.events.flatMap(e=>[e,...e.notes])]){if(!item.id||seen.has(item.id))repair=true;seen.add(item.id);}
  if(repair){after=structuredClone(after);seen.clear();for(const m of after.measures)for(const item of [m,...m.events.flatMap(e=>[e,...e.notes])]){if(!item.id||seen.has(item.id))item.id=newId();seen.add(item.id);}after=shareUnchanged(before,after);}
  if(!coalesce){undoStack.current.push(before);if(undoStack.current.length>100)undoStack.current.shift();redoStack.current=[];}draftRef.current=after;updateDraft(after);setCandidates([]);
 },[]);
 const copyToClipboard=(start,end)=>{clipboard.current={...draftRef.current,measures:copyBars(draftRef.current,start,end)};};
 const pasteFromClipboard=d=>{if(!clipboard.current)throw Error('먼저 마디를 복사하세요.');const converted=convertScoreInstrument(clipboard.current,d.instrument??'guitar');return pasteBars(d,barIndex,converted.measures);};
 const undo=()=>{cancelDigits();const prior=undoStack.current.pop();if(prior){if(isPiano(draftRef.current))pianoHistory.current.set(draftRef.current,rememberPiano());redoStack.current.push(draftRef.current);draftRef.current=prior;updateDraft(prior);if(isPiano(prior))restorePiano(prior);}};
 const redo=()=>{cancelDigits();const next=redoStack.current.pop();if(next){undoStack.current.push(draftRef.current);draftRef.current=next;updateDraft(next);if(isPiano(next))restorePiano(next);}};
 const result=useMemo(()=>compileScoreDocument(draft,original),[draft,original]);
 const barIndex=Math.max(0,Math.min(cursor.bar,draft.measures.length-1)),eventIndex=Math.max(0,Math.min(cursor.event,draft.measures[barIndex].events.length-1));
 const active=useMemo(()=>({...cursor,...(isPiano(draft)?pianoCursor(draft,{bar:cursor.bar,id:cursor.eventId,onset:cursor.onset??draft.measures[barIndex].events[eventIndex].onset},cursor.hand??inputHand):{}),string:fretted?Math.min(cursor.string,draft.tuning.length):1,mode:fretted?cursor.mode:'staff',...(isPiano(draft)?{}:{bar:barIndex,event:eventIndex})}),[cursor,barIndex,eventIndex,draft,inputHand,fretted]);
 cursorRef.current=active;
 const event=draft.measures[active.bar].events[active.event],tone=event.notes.find(n=>n.id===cursor.noteId)??event.notes.find(n=>n.string===cursor.string)??event.notes[0];
 const select=useCallback((c,{seekPlayback=true}={})=>{if(isPiano(draftRef.current)){const selected=draftRef.current.measures[c.bar]?.events[c.event];const hand=selected?.voice??c.hand??inputHand;c={...c,hand,eventId:selected?.id,onset:selected?.onset};pianoPositions.current[hand]=pianoPosition(draftRef.current,c);setInputHand(hand);}if(isFretted(draftRef.current.instrument)&&c.string!==cursorRef.current.string||!draftRef.current.measures[c.bar]?.events[c.event]?.notes.some(n=>n.id===c.noteId))c={...c,noteId:undefined};c={...c,string:isFretted(draftRef.current.instrument)?Math.min(c.string,draftRef.current.tuning.length):1,mode:isFretted(draftRef.current.instrument)?c.mode:'staff'};setBeamSelection(null);cancelDigits();cursorRef.current=c;setCursor(c);setCandidates([]);setPropertySection(c.target==='bar'?'bar':'note');const selected=draftRef.current.measures[c.bar]?.events[c.event];if(selected&&(!selected.blank||selected.tuplet)&&dottedMode==='off'&&!tripletInput)setSelectedDuration(selected.duration);if(seekPlayback)playbackController.current?.seek(c);if(c.midi!==undefined)setPitch(c.midi);},[cancelDigits,dottedMode,tripletInput,inputHand]);
 useLayoutEffect(()=>{const node=dialog.current,unlock=lockDocumentScroll();node.showModal();const releaseTouch=containModalTouch(node);if(!mobile)node.querySelector('[data-score-input]')?.focus({preventScroll:true});return()=>{releaseTouch();node.close();unlock();};},[]);
 useEffect(()=>{const warn=e=>{if(savedRef.current!==draftRef.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
 useEffect(()=>cancelDigits,[cancelDigits]);
 useEffect(()=>{if(!mobile)return;const viewport=window.visualViewport;const resize=()=>{dialog.current?.style.setProperty('--editor-viewport-height',`${viewport?.height??window.innerHeight}px`);dialog.current?.style.setProperty('--editor-viewport-top',`${viewport?.offsetTop??0}px`);if(document.activeElement?.closest('.editorAudioDock'))requestAnimationFrame(()=>document.activeElement?.scrollIntoView?.({block:'nearest'}));};resize();viewport?.addEventListener('resize',resize);viewport?.addEventListener('scroll',resize);return()=>{viewport?.removeEventListener('resize',resize);viewport?.removeEventListener('scroll',resize);};},[mobile]);

 useEffect(()=>{if(!mobile||!message)return;const timer=setTimeout(()=>setMessage(''),3200);return()=>clearTimeout(timer);},[mobile,message]);
 const focusScore=()=>dialog.current.querySelector('[data-score-input]')?.focus({preventScroll:true});
 const closeMobileSheet=useCallback((restoreFocus=false)=>{setMobileSheet(null);if(restoreFocus)dialog.current?.querySelector('[data-score-input]')?.focus({preventScroll:true});},[]);
 const selectInScore=useCallback(c=>{chordPending.current=null;c={...c,editing:true};
  if(beamRangeMode&&c.target!=='bar'){
   if(beamSelection?.pending&&beamSelection.bar!==c.bar){setMessage('빔은 같은 마디 안에서 선택하세요.');return;}
   const next=beamSelection?.pending?{...beamSelection,end:c.event,pending:false}:{bar:c.bar,start:c.event,end:c.event,pending:true};
   select(c);setBeamSelection(next);
  }else select(c);
  if(mobile&&mobileSheet==='settings')setMobileSheet(null);
 },[select,mobile,beamRangeMode,beamSelection,mobileSheet]);
 const toggleBeamRange=()=>{setBeamRangeMode(v=>!v);setBeamSelection(null);setMobileSheet(null);};
 const applyNavigation=(kind,value)=>{try{setDraft(d=>setScoreNavigation(d,barIndex,kind,value));}catch(e){setMessage(e.message);}};
 const applyRepeat=action=>{try{setDraft(d=>setScoreRepeat(d,barIndex,action));}catch(e){setMessage(e.message);}};
 const applyBeamRange=action=>{try{setDraft(d=>{if(!isPiano(d))return setBeamRange(d,beamSelection,action);const {bar,start,end}=beamSelection,events=d.measures[bar].events;if(events[start].voice!==events[end].voice)throw Error('같은 손의 음표를 선택하세요.');return pianoVoiceEdit(d,{bar,event:start,hand:events[start].voice},(voice,c)=>setBeamRange(voice,{bar,start:c.event,end:voice.measures[bar].events.findIndex(e=>e.id===events[end].id)},action)).document;});}catch(e){setMessage(e.message);}};
 const rangeTools=beamRangeMode&&<div className="scoreBeamRangeTools" role="group" aria-label="범위 빔 편집">{beamSelection&&!beamSelection.pending&&beamSelection.start!==beamSelection.end?<>{[['join','묶기'],['break','끊기'],['auto','자동']].map(([action,label])=><button type="button" key={action} aria-label={`선택 범위 빔 ${label}`} onClick={()=>applyBeamRange(action)}>{label}</button>)}</>:<span>{beamSelection?.pending?'마지막 음을 선택하세요':'첫 음 → 마지막 음 선택'}</span>}<button type="button" aria-label="빔 범위 선택 닫기" onClick={toggleBeamRange}>×</button></div>;


 const commitRhythm=(at,kind,value,options)=>{
  const changed=inputRhythm(draftRef.current,at,{selectedDuration,dottedMode,tupletMode,session:tupletSession},kind,value);
  setDraft(changed.document,options);setDottedMode(changed.dottedMode);setTupletMode(changed.tupletMode);setRestMode(kind==='rest');
  setTupletSession(changed.completed?null:changed.session);
  if(changed.completed)setMessage('셋잇단 입력 완료');
  return changed;
 };
 const commitPiano=(pitches,{rest=false,chord=chordMode,advance=!chordMode}={})=>{
  try{const at=cursorRef.current,changed=enterPiano(draftRef.current,at,pitches,midiRhythm.current,{rest,chord,advance:advance||rest,editing:at.editing});
   setDraft(changed.document);setDottedMode(changed.dottedMode);setTupletMode(changed.tupletMode);setTupletSession(changed.completed?null:changed.session);setRestMode(false);
   midiRhythm.current={...midiRhythm.current,dottedMode:changed.dottedMode,tupletMode:changed.tupletMode,session:changed.completed?null:changed.session};
   chordPending.current=chord&&!advance&&!rest?changed.enteredId:null;setLastEntered(changed.enteredId);setMessage('');
   select({...changed.cursor,noteId:undefined,editing:false},{seekPlayback:false});
  }catch(error){setMessage(error.message);}
 };
 const pianoStep=(delta=1)=>{try{const next=stepPiano(draftRef.current,cursorRef.current,delta);setDraft(next.document);chordPending.current=null;select({...next.cursor,noteId:undefined,editing:false},{seekPlayback:false});}catch(error){setMessage(error.message);}};
 const toggleChord=value=>{if(!value&&chordPending.current)pianoStep();setChordMode(value);};
 const switchHand=hand=>{if(hand===inputHand)return;if(chordPending.current)pianoStep();pianoPositions.current[inputHand]=pianoPosition(draftRef.current,cursorRef.current);setInputHand(hand);setTupletSession(null);setTupletMode('off');midiRhythm.current={...midiRhythm.current,session:null,tupletMode:'off'};select(pianoCursor(draftRef.current,pianoPositions.current[hand],hand),{seekPlayback:false});};
 const midiRhythm=useRef(null);midiRhythm.current={selectedDuration,dottedMode,tupletMode,session:tupletSession};
 const enterPitches=(pitches,hand=inputHand,moveNext=false)=>{if(draftRef.current.instrument==='drums')moveNext=false;
  if(isPiano(draftRef.current)){if(hand!==(cursorRef.current.hand??inputHand))switchHand(hand);void auditionPiano(pitches);commitPiano(pitches,{advance:moveNext||!chordMode,chord:chordMode});return;}
  try{const at=cursorRef.current,changed=(draftRef.current.instrument==='drums'?(drumBatch?fillDrumMeasure:enterDrumNotes):enterMidiNotes)(draftRef.current,at,pitches,midiRhythm.current);
   midiRhythm.current={...midiRhythm.current,dottedMode:changed.dottedMode,tupletMode:changed.tupletMode,session:changed.completed?null:changed.session};
   if(hand!=='auto'&&!isFretted(draftRef.current.instrument)&&draftRef.current.instrument!=='drums')changed.document=patchEvent(changed.document,at.bar,at.event,e=>({...e,notes:e.notes.map(n=>pitches.includes(n.midi)?{...n,hand}:n)}));
   const next=moveNext?nextEntry(changed.document,at):{document:changed.document,cursor:at};setDraft(next.document);setDottedMode(changed.dottedMode);setTupletMode(changed.tupletMode);setTupletSession(changed.completed?null:changed.session);setRestMode(false);select(next.cursor,{seekPlayback:false});
   const entered=changed.document.measures[at.bar].events[at.event];if(entered.notes.some(n=>n.unplaced))setMessage('TAB 배치 불가 (?) · 실제 음높이는 보존했습니다. 편집 메뉴에서 확인하세요.');else if(entered.notes.some(n=>n.outsidePreferred))setMessage('선호 프렛 범위 밖에 배치했습니다.');
  }catch(e){setMessage(e.message);}
 };
 const midi=useMidiKeyboard(pitches=>enterPitches(pitches,inputHand,true),()=>Boolean(dialog.current?.open&&!settings.isOpen&&!mobileSheet&&!toolSection&&!resetOpen&&!pickingOpen&&!saveRequest&&!closing&&!instrumentChange&&!playbackController.current?.isPlaying()&&document.activeElement?.closest('[data-score-input]')&&document.activeElement?.closest('dialog')===dialog.current&&cursorRef.current.target!=='bar'&&document.visibilityState==='visible'),()=>`${draftRef.current.id}:${draftRef.current.instrument}:${inputHand}:${cursorRef.current.bar}:${cursorRef.current.event}`);
 const settings=useEditorSettings(draft,setDraft,midi);
 const tabWarnings=draft.measures.flatMap(m=>m.events.flatMap(e=>e.notes)).filter(n=>n.unplaced||n.outsidePreferred);
 const exitTuplet=()=>{
  const progress=tripletProgress(draftRef.current,tupletSession);
  if(tripletInput&&progress.indices.length&&progress.count<3){
   if(progress.count>0&&!window.confirm('셋잇단음표 입력이 완성되지 않았습니다. 취소하시겠습니까?'))return false;
   setDraft(d=>isPiano(d)?pianoVoiceEdit(d,{bar:tupletSession.bar,event:progress.indices[0],hand:inputHand},(voice,c)=>removeTriplet(voice,c,{clear:true})).document:removeTriplet(d,{bar:tupletSession.bar,event:progress.indices[0]},{clear:true}));
   select({...active,bar:tupletSession.bar,event:progress.indices[0]});
  }
  setTupletMode('off');setTupletSession(null);return true;
 };
 useEffect(()=>{if(tupletSession&&!tripletProgress(draft,tupletSession).indices.length){setTupletSession(null);setTupletMode('off');}},[draft,tupletSession]);
 const stepEntry=from=>{const next=nextEntry(draftRef.current,from);if(next.document!==draftRef.current)setDraft(next.document,{coalesce:true,keepDigits:true});return next.cursor;};
 const advance=(from=cursorRef.current)=>{if(autoAdvance||tripletInput){const next=stepEntry(from);select({...next,target:undefined});if(next.bar===from.bar&&next.event===from.event)setMessage('마디의 길이를 확인하세요. 최대 64마디까지 입력할 수 있습니다.');}};
 const showProperties=section=>{cancelDigits();setPropertySection(section);if(mobile)setMobileSheet(section);};
 const setBar=b=>select(isPiano(draft)?pianoCursor(draft,{bar:b,onset:0},inputHand):{...active,bar:b,event:0});const setEvent=i=>select({...active,event:i});
 const save=(close=false,copy=false)=>{cancelDigits();setSaveRequest({close,copy,document:copy?copyDocument(draftRef.current):draftRef.current});};
 const commitSave=document=>{
  const saved=onSave(document);if(!saved.saved&&!saved.score)throw Error(saved.errors?.join(' / ')||'저장하지 못했습니다. 다시 시도하세요.');
  if(!saveRequest.copy){setDraft(document);savedRef.current=draftRef.current;}
  setMessage(saved.record?.status==='draft'?'미완성 초안을 저장했습니다. 박자·입력 문제를 해결하면 재생할 수 있습니다.':'내 악보 보관함에 저장했습니다.');
  const close=saveRequest.close,target=saveRequest.instrumentTarget;setSaveRequest(null);if(target)startInstrumentDocument(target);else if(close)finishClose();
 };
 const saveDialog=saveRequest&&<ScoreSaveDialog document={saveRequest.document} onSave={commitSave} onClose={()=>setSaveRequest(null)}/>;
 const close=()=>{if(!exitTuplet())return;if(savedRef.current!==draftRef.current)setClosing(true);else finishClose();};
 const download=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(draftRef.current,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${draft.id}.fretiva.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('악보 데이터를 파일로 내보냈습니다.');};
 const importFile=async e=>{const selected=e.target.files?.[0];e.target.value='';if(!selected)return;try{if(isPdfScoreFile(selected)){if(!onImportPdf)throw Error('PDF는 악보 보관함의 PDF 불러오기에서 열 수 있습니다.');afterClose.current=()=>onImportPdf(selected);close();return;}if(selected.size>2*1024*1024)throw Error('악보 JSON은 2MB 이하 파일을 선택하세요.');const next=upgradeDocument(JSON.parse((await selected.text()).replace(/^\uFEFF/,'')));if(!hasEditableShape(next))throw Error('음표 구조를 확인하세요.');setDraft({...next,id:draft.id,kind:'user'});resetPianoEntry();select({bar:0,event:0,string:draftRef.current.tuning.length,mode:'tab'});setMessage('파일을 불러왔습니다. 미완성 상태도 초안으로 저장할 수 있습니다.');}catch(e){setMessage(e.message);}};
 const applyPitch=(midi,string)=>{const possible=pitchCandidates(tone,midi,effectiveTuning(draft)).filter(n=>n.fret+(draft.capo??0)<=maxFret(draft));if(!possible.length){setMessage('현재 튜닝의 0–24프렛에서 연주할 수 없는 음입니다.');return;}const choice=string?possible.find(n=>n.string===string):possible.find(n=>n.string===tone?.string);
  if(!choice){setCandidates(possible);setPitch(midi);setMessage('같은 음을 낼 수 있는 줄·프렛을 선택하세요. GP 자동 운지 내부 규칙은 확인되지 않아 임의로 포지션을 바꾸지 않습니다.');return;}
  try{if(event.blank){commitRhythm({...active,string:choice.string},'note',choice.fret);}else{setDraft(d=>patchEvent(d,barIndex,eventIndex,e=>{const n={...(tone??{id:newId('tone')}),...choice,locked:true};delete n.spelling;if(e.notes.some(t=>t!==tone&&t.string===n.string)){setMessage('선택한 줄에 이미 동시음이 있습니다.');return e;}return {...e,rest:false,blank:false,notes:tone?e.notes.map(t=>t===tone?n:t):[n]};}));}setCursor(c=>({...c,string:choice.string}));}catch(error){setMessage(error.message);}
 };
 const insert=(before=false)=>{try{setDraft(d=>insertEvent(d,active,{before}));setEvent(eventIndex+(before?0:1));setMessage(`선택 ${before?'앞':'뒤'}에 박을 넣고, 같은 마디의 뒤쪽 박을 밀었습니다. 마디가 넘치면 길이를 조절하거나 박 나누기를 사용하세요.`);}catch(e){setMessage(e.message);}focusScore();};
 const move=useCallback((from,to)=>{try{const before=draftRef.current,toneId=before.measures[from.bar].events[from.event].notes.find(n=>n.string===from.string)?.id,next=moveTone(before,from,to);if(next===before)return;const moved=next.measures[to.bar].events[to.event].notes.find(n=>n.id===toneId);setDraft(next);select({...to,string:moved.string});setMessage('음표를 이동했습니다. 실행 취소로 되돌릴 수 있습니다.');}catch(e){setMessage(e.message);}},[setDraft,select]);
 const split=()=>{try{setDraft(d=>splitEvent(d,active));setEvent(eventIndex+1);setMessage('현재 길이를 반으로 나누고 뒤 절반을 입력할 자리로 만들었습니다. 다른 박의 시점은 유지됩니다.');}catch(e){setMessage(e.message);}focusScore();};
 const keyDown=(e,tabInput=false)=>{
  if(e.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]')||e.isComposing)return;
  const surface=dialog.current.querySelector('[data-score-input]');if(surface)surface.dataset.inputAt=String(performance.now());
  const command=e.ctrlKey||e.metaKey,k=e.key;
  if(command&&k.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if(command&&k.toLowerCase()==='y'){e.preventDefault();redo();return;}
  if(command&&k.toLowerCase()==='s'){e.preventDefault();save();return;}
  if(command&&k.toLowerCase()==='c'){e.preventDefault();copyToClipboard(barIndex,Math.min(rangeEnd,draft.measures.length-1));setMessage('선택 마디를 복사했습니다.');return;}
  if(command&&k.toLowerCase()==='v'){e.preventDefault();try{setDraft(d=>pasteFromClipboard(d));}catch(err){setMessage(err.message);}return;}
  if(command)return;
  if(!fretted&&(['Tab','x','X','h','H','s','S'].includes(k)||/^\d$/.test(k)))return;
  if(!fretted&&k==='Enter'&&e.target.closest('[data-score-input]')){e.preventDefault();enterPitches([cursor.midi??(draft.instrument==='drums'?38:60)]);return;}
  if(fretted&&e.altKey&&(k==='ArrowUp'||k==='ArrowDown')){e.preventDefault();const next=moveFingering(draft,active,k==='ArrowUp'?-1:1);const changed=next.measures[barIndex].events[eventIndex].notes.find(n=>n.id===tone?.id);setDraft(next);if(changed)setCursor(c=>({...c,string:changed.string}));return;}
  if(/^\d$/.test(k)){
   e.preventDefault();if(cursor.mode==='staff'&&!tabInput){applyPitch(cursor.midi??pitch,k==='0'?null:Number(k));return;}
   setPropertySection('note');let at=tabInput?{...cursorRef.current,mode:'tab'}:cursorRef.current;
   const previous=digits.current,next=resolveFretInput(previous,k,`${at.bar}:${at.event}:${at.string}`);
   cancelDigits(); // Fret input edits the selected slot; navigation is explicit.
   const before=draftRef.current,depth=undoStack.current.length;
   const coalesce=next.combined&&previous?.document===before&&previous.undoDepth<depth;
   try{commitRhythm(at,'note',next.value,{coalesce,keepDigits:true});}catch(err){setMessage(err.message);return;}
   cursorRef.current=at;setCursor(at);
   digits.current={...next,document:draftRef.current,undoDepth:coalesce?previous.undoDepth:depth};
   
   return;
  }
  if(k==='ArrowLeft'||k==='ArrowRight'){e.preventDefault();if(draft.instrument==='drums'&&k==='ArrowRight'){try{const next=advanceDrum(draftRef.current,active,midiRhythm.current);setDraft(next.document);setDottedMode(next.dottedMode??dottedMode);setTupletMode(next.tupletMode??tupletMode);setTupletSession(next.completed?null:next.session??tupletSession);select({...next.cursor,noteId:undefined},{seekPlayback:false});}catch(error){setMessage(error.message);}return;}if(isPiano(draft)){pianoStep(k==='ArrowLeft'?-1:1);return;}select(cursorStep(draft,active,k==='ArrowLeft'?-1:1));return;}
  if(k==='ArrowUp'||k==='ArrowDown'){e.preventDefault();if(!fretted||cursor.mode==='staff'&&!tabInput){const midi=(cursor.midi??pitch)+(k==='ArrowUp'?1:-1);setPitch(midi);setCursor(c=>({...c,midi}));}else select({...active,mode:tabInput?'tab':active.mode,string:Math.max(1,Math.min(draft.tuning.length,active.string+(k==='ArrowUp'?-1:1)))});return;}
  if(k==='Tab'){if(view!=='both')setView('both');e.preventDefault();select({...active,mode:cursor.mode==='tab'?'staff':'tab',midi:tone?soundingMidi(draft,tone):pitch});return;}
  if(k.toLowerCase()==='x'){e.preventDefault();cancelDigits();try{commitRhythm(active,'mute');}catch(err){setMessage(err.message);}return;}
  if(k==='Backspace'||k==='Delete'){e.preventDefault();cancelDigits();setDraft(d=>deleteTone(d,active));return;}
  if(k.toLowerCase()==='r'){e.preventDefault();if(draft.instrument==='drums'){try{const changed=drumRest(draftRef.current,active,midiRhythm.current);setDraft(changed.document);setDottedMode(changed.dottedMode);setTupletMode(changed.tupletMode);setTupletSession(changed.completed?null:changed.session);}catch(error){setMessage(error.message);}return;}if(isPiano(draft)){commitPiano([],{rest:true,advance:true});return;}cancelDigits();try{commitRhythm(active,'rest');advance();}catch(err){setMessage(err.message);}return;}
  if(['+','=','-','_'].includes(k)){e.preventDefault();const values=['1','2','4','8','16'],step=k==='+'||k==='='?1:-1,value=values[Math.max(0,Math.min(4,values.indexOf(selectedDuration)+step))];setDuration(value);return;}
  if(k==='Insert'){e.preventDefault();insert();return;}
  if(k.toLowerCase()==='h'||k.toLowerCase()==='s'){e.preventDefault();const next=draft.measures[barIndex].events[eventIndex+1]?.notes?.[0];const t=k.toLowerCase()==='s'?'S':next&&tone&&next.fret<tone.fret?'P':'H';setDraft(d=>patchEvent(d,barIndex,eventIndex,{technique:event.technique===t?null:t}));return;}
 };
 // Toolbar buttons retain normal Enter/Space/Tab behavior; score shortcuts
 // continue from them without requiring another click on the score.
 const dialogKeyDown=e=>{
  if(closing||settings.isOpen)return;
  if(e.defaultPrevented){e.stopPropagation();return;}
  if(e.target.closest('[data-score-input]')||e.key==='Tab')return;
  keyDown(e);
  if(e.defaultPrevented){e.stopPropagation();focusScore();}
 };
 const connection=kind=>{setTechniqueHint(({H:'같은 줄의 다음 음: 낮은 → 높은 프렛',P:'같은 줄의 다음 음: 높은 → 낮은 프렛',S:'시작 음·화음 선택 → 슬라이드: 다음 같은 줄의 다른 프렛에 연결',tie:'다음 같은 음높이로 소리 연결',palmMute:'선택한 음·화음의 울림을 짧게 줄입니다.',vibrato:'선택한 음에 비브라토 적용',harmonic:'선택한 줄의 자연 하모닉스 위치에 적용','arpeggio-up':'현재 화음: 낮은 줄 → 높은 줄','arpeggio-down':'현재 화음: 높은 줄 → 낮은 줄','let-ring':'다음 음 없이도 열린 곡선으로 여운을 표시합니다.','slide-out-up':'현재 음·화음에서 위로 빠지는 슬라이드 표시','slide-out-down':'현재 음·화음에서 아래로 빠지는 슬라이드 표시',parentheses:'선택한 음의 프렛 숫자를 괄호로 표시합니다.','bend-up':'선택 음의 길이 안에서 한 음(full) 올립니다.','bend-hold':'한 음(full) 올린 음높이를 유지합니다.','bend-release':'한 음(full) 올린 상태에서 원래 음높이로 내립니다.','bend-up-release':'선택 음의 앞 절반에서 올리고 뒤 절반에서 내립니다.',clear:'선택한 음의 주법 지우기'})[kind]);try{setDraft(d=>isPiano(d)?pianoVoiceEdit(d,active,(voice,c)=>setNoteConnection(voice,c,kind)).document:setNoteConnection(d,active,kind));setMessage('');}catch(e){setTechniqueHint(e.message);setMessage(e.message);}};
 const techniqueButton=(kind,label,shortLabel=label)=><button type="button" key={kind} aria-label={label} title={label} disabled={event.rest||!event.notes.length} aria-pressed={['H','P','S'].includes(kind)?event.technique===kind:kind==='tie'?Boolean(event.tieTo):kind==='palmMute'?Boolean(event.palmMute):kind==='vibrato'?Boolean(event.vibrato):kind==='harmonic'?Boolean(event.notes.find(n=>n.string===active.string)?.harmonic):kind==='let-ring'?Boolean(event.letRing):kind.startsWith('slide-out-')?event.slideOut===kind.slice(10):kind==='parentheses'?Boolean(event.notes.find(n=>n.string===active.string)?.parenthesized):kind.startsWith('bend-')?event.notes.find(n=>n.string===active.string)?.bendEffect?.phase===kind.slice(5):kind.startsWith('arpeggio-')?event.arpeggio===kind.slice(9):undefined} onClick={()=>connection(kind)}><EditorMusicIcon kind={kind}/><span>{shortLabel}</span></button>;
 const techniqueTools=!fretted?<div>{draft.instrument!=='drums'&&techniqueButton('tie','붙임줄')}{techniqueButton('clear','연결 지우기')}</div>:<><div className="techniqueGroup" role="group" aria-label="음 연결">{[['H','해머온'],['P','풀오프'],['S','슬라이드'],['tie','붙임줄']].map(args=>techniqueButton(...args))}</div><div className="techniqueGroup techniqueExpressionGroup" role="group" aria-label="음 표현">{[['palmMute','P.M. 팜 뮤트','팜 뮤트'],['vibrato','비브라토'],['harmonic','하모닉스'],['arpeggio-up','아르페지오 상행','상행'],['arpeggio-down','아르페지오 하행','하행']].map(args=>techniqueButton(...args))}</div><div className="techniqueGroup" role="group" aria-label="열린 연결과 괄호">{[['let-ring','열린 붙임줄'],['slide-out-up','슬라이드 아웃 상행','아웃 ↗'],['slide-out-down','슬라이드 아웃 하행','아웃 ↘'],['parentheses','괄호 음표','(음)']].map(args=>techniqueButton(...args))}</div><div className="techniqueGroup" role="group" aria-label="벤드와 릴리스">{[['bend-up','벤드 올림','올림'],['bend-hold','벤드 유지','유지'],['bend-release','벤드 릴리스','내림'],['bend-up-release','벤드 올렸다 내림','올림·내림']].map(args=>techniqueButton(...args))}</div><div className="techniqueFooter"><p className="techniqueApplyHint" role="status">{event.rest?'주법을 적용할 음을 선택하세요.':techniqueHint}</p>{techniqueButton('clear','주법 지우기','지우기')}</div></>;
 const beatTools=<>
  <button type="button" onClick={()=>insert(true)}>앞에 박 삽입</button><button type="button" onClick={()=>insert(false)}>뒤에 박 삽입</button><button type="button" disabled={Number(event.duration)>=16} onClick={split}>현재 박 나누기</button>
  <button type="button" disabled={draft.measures.length>=64} onClick={()=>{setDraft(d=>({...d,measures:[...d.measures.slice(0,barIndex+1),blankMeasure(d.meter),...d.measures.slice(barIndex+1)]}));setBar(barIndex+1);}}>빈 마디 추가</button>
 </>;
 const historyTools=<div className="etudeToolbarGroup" role="group" aria-label="실행 기록"><button type="button" aria-label="실행 취소" title="실행 취소 · Ctrl+Z" disabled={!undoStack.current.length} onClick={undo}><Undo2 size={21} strokeWidth={1.8}/></button><button type="button" aria-label="다시 실행" title="다시 실행 · Ctrl+Shift+Z" disabled={!redoStack.current.length} onClick={redo}><Redo2 size={21} strokeWidth={1.8}/></button></div>;
 const previewPrint=()=>{try{printEditorScore(dialog.current,draft.title,view,draft);}catch(error){setMessage(error.message);}};
 const printButton=<button type="button" className="etudePrintPreview" aria-label="A4 인쇄 미리보기" title="A4 인쇄 미리보기" disabled={!result.score} onClick={previewPrint}><Printer size={21} strokeWidth={1.8}/></button>;
 const durationTools=<div className="etudeToolbarGroup" role="group" aria-label="음 길이와 쉼표"><DurationButtons value={selectedDuration} onChange={value=>setDuration(value)} compact/><button type="button" onClick={()=>{try{if(draft.instrument==='drums')mobileKey('r');else if(isPiano(draft))commitPiano([],{rest:true,advance:true});else{commitRhythm(active,'rest');advance();}}catch(err){setMessage(err.message);}focusScore();}}>R 쉼표</button></div>;
 const setDuration=value=>{const pending=tripletInput||dottedMode!=='off';if(value!==selectedDuration&&!exitTuplet())return;cancelDigits();try{if(!pending&&(!isPiano(draft)||active.editing||chordPending.current))setDraft(d=>isPiano(d)?pianoVoiceEdit(d,active,(voice,c)=>setEventDuration(voice,c,value)).document:setEventDuration(d,active,value));setDottedMode('off');setRestMode(false);setSelectedDuration(value);}catch(error){setMessage(error.message);}focusScore();};
 const toggleDotted=(locked=false)=>{cancelDigits();if(!exitTuplet())return;setDottedMode(current=>current==='locked'?'off':locked?'locked':current==='off'?'one-shot':'off');focusScore();};
 const toggleTriplet=()=>{cancelDigits();if(tripletInput){exitTuplet();return;}if(!['8','16'].includes(selectedDuration)){setMessage('8분 또는 16분음표를 먼저 선택하세요.');return;}setDottedMode('off');setTupletSession(null);setTupletMode('active');focusScore();};
 const modifiers=<RhythmModifiers {...{dottedMode,tupletMode}} onDotted={toggleDotted} onTriplet={toggleTriplet}/>;
 const inputStatus=rhythmInputLabel(selectedDuration,dottedMode,tupletMode,tripletProgress(draft,tupletSession).count);
 const directDurations=<><DurationButtons value={selectedDuration} onChange={setDuration}/></>;
 const autoAdvanceOption=<label className="etudeAutoAdvance"><input type="checkbox" checked={autoAdvance} onChange={e=>{cancelDigits();setAutoAdvance(e.target.checked);}}/>쉼표·뮤트 입력 후 다음 위치로 이동</label>;
 const zoomControl=<label className="etudeToolbarZoom">배율<select aria-label="편집 악보 확대" value={zoom} onChange={e=>setZoom(Number(e.target.value))}>{[...new Set([25,50,67,75,90,100,125,150,200,zoom])].sort((a,b)=>a-b).map(v=><option key={v} value={v}>{v}%</option>)}</select></label>;
 const toolCategories=<>  <div className="etudeToolbarSections" role="group" aria-label="편집 도구 분류">
   {(mobile?[['beats','음표 · 마디'],['technique','주법']]:[['beats','음표 · 마디']]).map(([key,label])=><button type="button" key={key} aria-expanded={toolSection===key} onClick={()=>{setToolSection(v=>v===key?null:key);setPickingOpen(false);setResetOpen(false);}}>{label}<span aria-hidden="true">{toolSection===key?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</span></button>)}
   {!mobile&&<><button type="button" onClick={()=>showProperties('note')}>음표 속성</button><button type="button" onClick={()=>showProperties('bar')}>마디 속성</button><button type="button" onClick={()=>showProperties('info')}>곡 정보</button></>}
   {fretted&&<button type="button" aria-expanded={pickingOpen} onClick={()=>{setPickingOpen(v=>!v);setResetOpen(false);setToolSection(null);}}>피킹 일괄 설정<span aria-hidden="true">{pickingOpen?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</span></button>}<button type="button" className="etudeResetToggle" aria-expanded={resetOpen} onClick={()=>{setResetOpen(v=>!v);setPickingOpen(false);setToolSection(null);}}>초기화<span aria-hidden="true">{resetOpen?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</span></button>
  </div></>;
 const resetPianoEntry=()=>{pianoPositions.current={left:{bar:0,onset:0},right:{bar:0,onset:0}};chordPending.current=null;setInputHand('right');setChordMode(false);};
 const startInstrumentDocument=id=>{resetPianoEntry();
  const current=draftRef.current,blank=createBlankDocument();
  const next=convertScoreInstrument({...blank,bpm:current.bpm,meter:[...current.meter],keySignature:current.keySignature,viewSettings:{...current.viewSettings,systemBreaks:[]},measures:[blankMeasure(current.meter)]},id);
  playbackController.current?.stop();setDraft(next);select({bar:0,event:0,string:next.tuning.length,mode:'tab'});
  setTupletSession(null);setTupletMode('off');setDottedMode('off');setRestMode(false);setInstrumentChange(null);setMessage(`빈 ${scoreInstrument(id).label} 악보를 시작합니다. 실행 취소로 이전 편집 내용을 복원할 수 있습니다.`);
 };
 const instrumentDialog=instrumentChange&&<InstrumentChangeDialog request={instrumentChange} anchor={sheetRef} onCancel={()=>setInstrumentChange(null)} onDiscard={()=>startInstrumentDocument(instrumentChange.id)} onSave={()=>{cancelDigits();setSaveRequest({close:false,copy:false,instrumentTarget:instrumentChange.id,document:draftRef.current});}}/>;
 const changeInstrument=id=>{try{const next=convertScoreInstrument(draftRef.current,id);playbackController.current?.stop();setDraft(next);if(isPiano(next)){resetPianoEntry();select(pianoCursor(draftRef.current));}else select({...active,string:Math.min(active.string,next.tuning.length),midi:undefined});setTupletSession(null);setMobileSheet(null);setToolSection(null);setPickingOpen(false);setCandidates([]);setMessage(`${scoreInstrument(id).label}로 변경했습니다. 기존 음높이를 유지하며 운지와 보표를 변환했습니다.`);}catch(error){setMessage('');setInstrumentChange({id,reason:error.message});}};
 const notationViews=<div className={mobile?'mobileNotationViews':'desktopNotationViews'} role="group" aria-label="보표 보기"><div className="editorInstrumentRow"><select className="scoreInstrumentSelect" aria-label="악기 선택" value={draft.instrument??'guitar'} onChange={e=>changeInstrument(e.target.value)}>{Object.entries(SCORE_INSTRUMENTS).map(([id,profile])=><option key={id} value={id}>{profile.label}</option>)}</select>{settings.tuning}</div>{(fretted?[['tab','TAB'],['both','오선보+TAB'],['staff','오선보']]:draft.instrument==='drums'?[]:[['staff','양손 큰보표']]).map(([value,label])=><button type="button" key={value} aria-pressed={view===value} onClick={()=>{setView(value);if(value!=='both')select({...active,mode:value==='tab'?'tab':'staff'},{seekPlayback:false});}}>{label}</button>)}</div>;
 const palette=<div className="etudeInputPalette" onClick={e=>{const button=e.target.closest('.etudeToolbarMore button');if(button)button.closest('details').removeAttribute('open');}} onMouseDown={e=>{if(e.target.closest('button'))e.preventDefault();}}>
  {mobile?<><div className="etudeToolbarStatus"><strong aria-live="polite">{barIndex+1}마디 · {eventIndex+1}음 · {cursor.mode==='tab'?`${cursor.string}번줄`:'오선보'}</strong>{zoomControl}</div><div className="etudeToolbarMain">{historyTools}{durationTools}</div>{toolCategories}<details className="etudeEntryOptions"><summary>입력 설정</summary>{autoAdvanceOption}</details></>:<div className="etudeToolbarMain"><div className="etudeToolbarStrip">{historyTools}{notationViews}{directDurations}<button type="button" onClick={()=>{try{if(draft.instrument==='drums')mobileKey('r');else if(isPiano(draft))commitPiano([],{rest:true,advance:true});else{commitRhythm(active,'rest');advance();}}catch(err){setMessage(err.message);}focusScore();}}>쉼표</button>{modifiers}</div><details className="etudeToolbarMore"><summary>더보기 <ChevronDown size={18} aria-hidden="true"/></summary>{toolCategories}{autoAdvanceOption}</details>{zoomControl}</div>}
 </div>;
 const tools=<>{fretted&&propertySection==='note'&&<details><summary>음정 · 동일음 운지 후보</summary><p>실제 음높이(MIDI). {scoreInstrument(draft.instrument).octaveShift?'오선보는 실제 음보다 한 옥타브 높여 적습니다.':'오선보는 실제 음높이로 적습니다.'} 같은 줄이 가능하면 유지하고, 여러 후보는 직접 선택합니다.</p><input aria-label="실제 음높이 MIDI" type="number" min="24" max="112" value={pitch} onChange={e=>setPitch(Number(e.target.value))}/><button type="button" onClick={()=>applyPitch(pitch)}>음정 적용 · 기존 줄 유지</button><button type="button" onClick={()=>{const midi=tone?soundingMidi(draft,tone):pitch;setPitch(midi);setCandidates(pitchCandidates(tone,midi,effectiveTuning(draft)).filter(n=>n.fret+(draft.capo??0)<=maxFret(draft)));}}>같은 음의 다른 줄</button>{candidates.map(n=><button type="button" key={n.string} onClick={()=>applyPitch(pitch,n.string)}>{n.string}번줄 {n.fret}프렛</button>)}</details>}
  {propertySection==='bar'&&<details><summary>마디 구간 복사 · 악보 설정</summary><label>복사 끝 마디<select aria-label="복사 끝 마디" value={Math.min(rangeEnd,draft.measures.length-1)} onChange={e=>setRangeEnd(Number(e.target.value))}>{draft.measures.map((m,i)=><option key={m.id} value={i}>{i+1}</option>)}</select></label><button type="button" onClick={()=>{copyToClipboard(barIndex,Math.min(rangeEnd,draft.measures.length-1));setMessage(`${clipboard.current.measures.length}마디를 복사했습니다.`);}}>구간 복사</button><button type="button" onClick={()=>{try{setDraft(d=>pasteFromClipboard(d));}catch(e){setMessage(e.message);}}}>현재 마디 뒤에 붙여넣기</button>
  <label>박자<select value={draft.meter.join('/')} onChange={e=>setDraft(d=>({...d,meter:e.target.value.split('/').map(Number)}))}>{['2/4','3/4','4/4','6/8'].map(m=><option key={m}>{m}</option>)}</select></label><p>박자 변경은 기존 음의 위치·길이를 바꾸지 않습니다.</p><label>조표<select value={draft.keySignature} onChange={e=>setDraft(d=>({...d,keySignature:e.target.value}))}>{['C','G','D','A','E','B','F','Bb','Eb','Am','Em','Dm','Gm'].map(k=><option key={k}>{k}</option>)}</select></label>
  </details>}</>;
 const batchPanels=<>
  {toolSection&&<section className="etudeBatchPanel etudeQuickTools" aria-label={toolSection==='beats'?'음표와 마디 도구':'주법 도구'}><div className="etudeEditorActions">{toolSection==='beats'?beatTools:techniqueTools}</div></section>}
  {resetOpen&&<section className="etudeBatchPanel" aria-label="악보 초기화"><strong>초기화 범위</strong><p>현재 편집본만 변경합니다. 저장본은 저장 버튼을 누르기 전까지 유지되며 실행 취소로 되돌릴 수 있습니다.</p><div className="etudeEditorActions"><button type="button" onClick={()=>{setDraft(openedRef.current);select({bar:0,event:0,string:draftRef.current.tuning.length,mode:'tab'});setResetOpen(false);setMessage('편집창을 열었을 때의 상태로 되돌렸습니다. 실행 취소할 수 있습니다.');}}>편집 시작 상태로 되돌리기</button><button type="button" onClick={()=>{setDraft(d=>({...d,kind:'user',measures:[blankMeasure(d.meter)]}));select({bar:0,event:0,string:draftRef.current.tuning.length,mode:'tab'});setResetOpen(false);setMessage('음표와 코드표를 비우고 빈 한 마디로 초기화했습니다. 실행 취소할 수 있습니다.');}}>빈 한 마디로 초기화</button></div></section>}
  {pickingOpen&&<section className="etudeBatchPanel" aria-label="피킹 일괄 설정"><div className="etudeBatchFields"><label>적용 범위<select aria-label="피킹 적용 범위" value={pickScope} onChange={e=>setPickScope(e.target.value)}><option value="all">전체 악보</option><option value="bar">현재 마디</option><option value="range">현재 마디부터 지정 마디까지</option></select></label>{pickScope==='range'&&<label>끝 마디<select aria-label="피킹 끝 마디" value={Math.min(rangeEnd,draft.measures.length-1)} onChange={e=>setRangeEnd(Number(e.target.value))}>{draft.measures.map((m,i)=><option key={m.id} value={i}>{i+1}마디</option>)}</select></label>}<label>피킹 패턴<select aria-label="일괄 피킹 패턴" value={pickPattern} onChange={e=>setPickPattern(e.target.value)}><option value="alternate-down">다운 → 업 반복</option><option value="alternate-up">업 → 다운 반복</option><option value="down">모두 다운</option><option value="up">모두 업</option><option value="clear">피킹 표시 지우기</option></select></label></div><label className="etudeEditorCheck"><input type="checkbox" checked={skipLegato} onChange={e=>setSkipLegato(e.target.checked)}/>H/P/SL로 연결된 도착음은 피킹 생략</label><p>범위 안의 기존 피킹 표시를 교체합니다. 쉼표·붙임줄 도착음은 제외하고 실제 피킹할 음마다 교대하며, 마디마다 다시 시작하지 않습니다. 동시음은 한 번으로 셉니다.</p><button type="button" onClick={()=>{setDraft(d=>applyPicking(d,{start:pickScope==='all'?0:barIndex,end:pickScope==='all'?d.measures.length-1:pickScope==='bar'?barIndex:Math.min(rangeEnd,d.measures.length-1),pattern:pickPattern,skipLegato}));setMessage('선택 범위의 피킹 표시를 적용했습니다. 음표·운지·리듬은 유지되며 실행 취소할 수 있습니다.');}}>피킹 패턴 적용</button></section>}
 </>;
 const controls=<div className="etudePropertiesPanel"><h3>{propertySection==='note'?'음표 속성':propertySection==='bar'?'마디 속성':'곡 정보'}</h3>{fretted&&!mobile&&propertySection==='note'&&<EditorInputPanel stringCount={draft.tuning.length} cursor={active} event={event} onString={string=>{select({...active,string,mode:'tab',target:undefined});focusScore();}} onFret={fret=>{try{commitRhythm(active,'note',fret);}catch(error){setMessage(error.message);}}} onDelete={()=>{setDraft(d=>deleteTone(d,active));}}/>}{(fretted||propertySection!=='note')&&<Controls {...{draft,setDraft,bar:barIndex,setBar,event:eventIndex,setEvent,mobile}} section={propertySection}/>} {tools}</div>;
 const menus=<nav className="etudeDocumentMenus" aria-label="악보 메뉴" onToggle={e=>{if(e.target.tagName==='DETAILS'&&e.target.open)for(const item of e.currentTarget.querySelectorAll(':scope > details'))if(item!==e.target)item.open=false;}} onClick={e=>{const button=e.target.closest('button');if(button)button.closest('details')?.removeAttribute('open');}}>
  <details><summary>파일</summary><div><button type="button" onClick={()=>{setDraft(createBlankDocument());select({bar:0,event:0,string:draftRef.current.tuning.length,mode:'tab'});setMessage('새 악보를 만들었습니다. 기존 저장본은 유지됩니다. 실행 취소할 수 있습니다.');}}>새 악보</button><button type="button" onClick={()=>file.current.click()}>{compactImport?'불러오기…':'악보 파일 불러오기'}</button>{compactImport?<p>FRETIVA 악보는 이 편집기에서 엽니다. PDF는 원본 보기로 열리며 자동 변환되지 않습니다.</p>:onImportPdf&&<button type="button" onClick={()=>{afterClose.current=onImportPdf;close();}}>PDF 불러오기</button>}<button type="button" onClick={()=>save()}>저장</button><button type="button" onClick={()=>save(false,true)}>다른 이름으로 저장 · 복사본</button><button type="button" onClick={download}>악보 JSON 내보내기</button><button type="button" disabled={!result.score} onClick={()=>{try{printEditorScore(dialog.current,draft.title,view,draft);setMessage('인쇄 창에서 PDF로 저장을 선택하세요.');}catch(e){setMessage(e.message);}}}>PDF 내보내기 · 인쇄</button></div></details>
  <details><summary>편집</summary><div><button type="button" disabled={!undoStack.current.length} onClick={undo}>실행 취소</button><button type="button" disabled={!redoStack.current.length} onClick={redo}>다시 실행</button><button type="button" onClick={()=>{copyToClipboard(barIndex,Math.max(barIndex,rangeEnd));setMessage('선택 마디를 복사했습니다.');}}>마디 복사</button><button type="button" onClick={()=>{try{setDraft(d=>pasteFromClipboard(d));}catch(e){setMessage(e.message);}}}>붙여넣기</button><button type="button" onClick={()=>setDraft(d=>deleteTone(d,active))}>선택 음 삭제</button></div></details>
  <details><summary>보기</summary><div><label>보표 표시<select aria-label="보표 보기" value={view} onChange={e=>{const v=e.target.value;setView(v);if(v!=='both')select({...active,mode:v==='tab'?'tab':'staff'});}}>{fretted&&<><option value="tab">TAB만</option><option value="both">오선보 + TAB</option></>}<option value="staff">오선보만</option></select></label><p>표시만 바뀌며 음표·운지·저장 데이터는 유지됩니다.</p><button type="button" onClick={()=>mobile?zoomController.current?.zoomTo(100):setZoom(100)}>화면 너비 맞춤</button>{!mobile&&<label>확대 비율<select aria-label="보기 메뉴 확대" value={zoom} onChange={e=>setZoom(Number(e.target.value))}>{[...new Set([25,50,67,75,90,100,125,150,200,zoom])].sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n}%</option>)}</select></label>}{!mobile&&<button type="button" aria-pressed={panelVisible} onClick={()=>setPanelVisible(v=>!v)}>속성 패널 {panelVisible?'숨기기':'표시'}</button>}</div></details>
  <details><summary>악보 설정</summary><div><p>악기: {scoreInstrument(draft.instrument).label} · {fretted?`${draft.tuning.length}현 · 오선보와 TAB은 같은 음표를 공유합니다.`:draft.instrument==='drums'?'타악기 보표 · GM 드럼 입력':'양손 큰보표 · 실제 음높이 입력'}</p><button type="button" onClick={()=>{setPanelVisible(true);setTab('properties');showProperties('bar');}}>박자 · 조표 · 마디 관리</button><button type="button" onClick={()=>{setPanelVisible(true);setTab('properties');showProperties('info');}}>제목 · 템포</button><p>보표 구성의 추가·제거는 아직 지원하지 않습니다. 보기 메뉴에서 표시를 선택할 수 있습니다.</p></div></details>
  <details><summary>재생 및 연습</summary><div><p>아래 재생 버튼으로 악보 음정·리듬을 듣습니다. PDF 메트로놈 연습은 PDF 악보 연습실에서 이용하세요.</p><button type="button" onClick={()=>{setPanelVisible(true);setTab('properties');showProperties('info');}}>재생 BPM 설정</button></div></details>
 </nav>;
 const sheet=<div ref={sheetRef} className="etudeEditorPreview">{mobile&&<div className="mobileNotationTools">{notationViews}<div className="mobileDurationRow"><DurationButtons value={selectedDuration} onChange={setDuration} compact/><button type="button" aria-label="쉼" aria-pressed={restMode} onClick={()=>mobileKey('r')}>쉼</button>{modifiers}</div>{(dottedMode!=='off'||tupletMode!=='off')&&<output className="rhythmInputStatus" aria-live="polite">{inputStatus}</output>}</div>}{!mobile&&<div className="etudePaperHeading" role="button" tabIndex="0" onClick={()=>showProperties('info')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showProperties('info');}}}><h3>{draft.title}</h3><p>{draft.bpm} BPM · {draft.meter.join('/')} · {scoreInstrument(draft.instrument).label}</p></div>}{!mobile&&tuningCaption(draft)&&<p className="editorTuningCaption">{tuningCaption(draft)}</p>}{tabWarnings.length>0&&<p className="editorTabWarning" role="status">TAB 배치 확인 {tabWarnings.length}음 · ?는 배치 불가 · 편집 메뉴에서 확인</p>}{result.score?<EditorScore capoControl={settings.capo} editControl={settings.edit} score={result.score} mobile={mobile} cursor={active} lastEntered={lastEntered} beamSelection={beamSelection} beamRangeMode={beamRangeMode} onBeamRange={toggleBeamRange} onLayoutChange={settings=>setDraft(d=>({...d,viewSettings:{...d.viewSettings,...settings}}))} onSelect={selectInScore} onKeyDown={keyDown} onMove={move} onMessage={setMessage} zoom={zoom} onZoomChange={setZoom} zoomController={zoomController} view={view} tabRhythm={tabRhythm} playPosition={playPosition} allowDrag={fretted&&!beamRangeMode&&(!mobile||mobileDrag)}/>:<p>잘못된 입력을 속성에서 수정하세요. 입력 데이터는 그대로 보존되어 있습니다.</p>}{!mobile&&rangeTools}</div>;
 const mobileKey=key=>keyDown({key,target:dialog.current,preventDefault(){}},true);
 const directPick=value=>{cancelDigits();if(event.rest){setMessage('피킹은 음표가 있는 위치에서 입력하세요.');return;}setDraft(d=>patchEvent(d,barIndex,eventIndex,{pickStroke:value}));if(value)select(cursorStep(draftRef.current,active,1));};
 const pitchInput=draft.instrument==='drums'?<DrumInput hat={drumHat} onHat={setDrumHat} batch={drumBatch} onBatch={value=>{setDrumBatch(value);if(value){try{const changed=fillDrumMeasure(draftRef.current,cursorRef.current,[drumHat==='open'?46:42],midiRhythm.current);setDraft(changed.document);select(changed.cursor,{seekPlayback:false});}catch(error){setMessage(error.message);}}focusScore();}} event={event} cursor={active} meter={draft.meter} preview={drumPreview} onPreview={setDrumPreview} volume={drumVolume} onVolume={setDrumVolume} onKey={mobileKey} onEnter={pitches=>{pitches.forEach(midi=>void auditionDrum(midi));enterPitches(pitches);focusScore();}}/>:<KeyboardInput hand={inputHand} onInputHand={switchHand} chordMode={chordMode} onChordMode={toggleChord} instrument={draft.instrument} event={event} cursor={active} desktop={!mobile} onEnter={(pitches,hand,options)=>{playbackController.current?.stop();enterPitches(pitches,hand);if(options?.focus!==false)focusScore();}} onKey={mobileKey} onSelect={n=>select({...active,noteId:n.id,midi:n.midi,mode:'staff'})} onHand={hand=>{try{const next=movePianoHand(draftRef.current,active,hand);setDraft(next.document);select({...next.cursor,editing:true});}catch(error){setMessage(error.message);}}}/>;
 const mobileNotice=message.replace(/event-[0-9a-f-]+:\s*/gi,'');
 const validationIssues=[...result.errors,...result.issues??[]];
 const mobileFeedback=(mobileNotice||validationIssues.length>0)?<><span className="mobileEditorFeedbackText" role="status" aria-live="polite" title={mobileNotice}>{mobileNotice}</span>{validationIssues.length>0&&<button type="button" className="mobileValidation" aria-label="입력 문제 확인" onClick={()=>setMessage(`${validationIssues[0]}${validationIssues.length>1?` · 외 ${validationIssues.length-1}건`:''}`)}>입력 확인 {validationIssues.length}</button>}</>:null;
 const toggleMobileTool=kind=>{const next=mobileSheet===kind?null:kind;setMobileSheet(next);setBeamRangeMode(next==='beam');setBeamSelection(null);};
 const closeMobileTool=()=>{setMobileSheet(null);setBeamRangeMode(false);setBeamSelection(null);};
 const copyLine=()=>{try{playbackController.current?.stop();const next=copyGripToNext(draftRef.current,active);setDraft(next.document);select(next.cursor);setSelectedDuration(next.document.measures[next.cursor.bar].events[next.cursor.event].duration);setMessage(`운지 묶음을 다음 위치 한 곳에 ${next.replaced?'덮어썼습니다':'복사했습니다'}. 원본 음표 길이를 적용했습니다.`);}catch(error){setMessage(error.message);}};
 const deleteLine=()=>{playbackController.current?.stop();setDraft(d=>deleteGrip(d,active));setMessage(draft.instrument==='drums'?'현재 위치의 드럼 음을 모두 삭제했습니다. 음표 길이는 유지했습니다.':'현재 위치의 운지 묶음을 비웠습니다. 음표 길이는 유지했습니다.');};
 const mobileTechniques=<MobileScoreSheets anchored kind="note" draft={draft} event={event} techniques={techniqueTools} onClose={closeMobileTool}/>;
 const removeBar=()=>{try{playbackController.current?.stop();setDraft(d=>deleteMeasure(d,barIndex));setBar(Math.min(barIndex,draft.measures.length-2));setMessage(`${barIndex+1}마디를 삭제했습니다. 실행 취소로 복구할 수 있습니다.`);}catch(e){setMessage(e.message);}};
 const resetCurrentBar=()=>{playbackController.current?.stop();setDraft(d=>({...d,measures:d.measures.map((m,i)=>i===barIndex?{...m,events:m.events.map(e=>({...e,notes:[],rest:true,blank:true,tieTo:null}))}:m)}));select({...active,event:0,noteId:undefined,target:undefined});setMessage(`${barIndex+1}마디를 초기화했습니다. 실행 취소로 복구할 수 있습니다.`);};
 const addEmpty=()=>{if(draft.measures.length>=64){setMessage('최대 64마디입니다.');return;}setDraft(d=>({...d,measures:[...d.measures.slice(0,barIndex+1),blankMeasure(d.meter),...d.measures.slice(barIndex+1)]}));setBar(barIndex+1);};
 if(mobile)return <dialog ref={dialog} className="etudeEditor etudeEditor--mobile mobileScoreWorkspace editorDesign" aria-label="악보 편집" onKeyDown={dialogKeyDown} onCancel={e=>{e.preventDefault();mobileSheet?closeMobileTool():close();}}>
  <header className="mobileScoreHeader"><button type="button" aria-label="악보 편집 뒤로" onClick={close}><ArrowLeft size={21} strokeWidth={1.8}/></button><button type="button" className="mobileScoreSettingsTitle" aria-label="악보 설정 열기" aria-expanded={mobileSheet==='settings'} onClick={()=>{cancelDigits();setBeamRangeMode(false);setBeamSelection(null);setMobileSheet(v=>v==='settings'?null:'settings');}} title={draft.title}>{draft.title||'새 악보'}</button>{historyTools}{printButton}<button type="button" aria-label="악보 저장" className="etudeEditorSave" onClick={()=>save()}>저장</button></header>
  {sheet}
  <MobileScoreInput drums={draft.instrument==='drums'} fretted={fretted} pitchInput={pitchInput} {...{tabRhythm,tabBeamPosition,tabPickingPosition,onTabBeam,onPickingPosition}} openTool={mobileSheet} onTool={toggleMobileTool} onCloseTool={closeMobileTool} techniques={mobileTechniques} beamSelection={beamSelection} onBeamApply={applyBeamRange} repeatBar={draft.measures[barIndex]} repeatIssue={repeatIssues(draft.measures)[0]} onRepeat={applyRepeat} onNavigation={applyNavigation} onResetBar={resetCurrentBar} onDeleteBar={removeBar} canDeleteBar={draft.measures.length>1} feedback={mobileFeedback} beamRangeMode={beamRangeMode} onBeamRange={()=>{setBeamRangeMode(v=>!v);setBeamSelection(null);}} cursor={active} event={event} meter={draft.meter} onKey={mobileKey} onCopyLine={copyLine} onDeleteLine={deleteLine} onBar={delta=>setBar(Math.max(0,Math.min(draft.measures.length-1,barIndex+delta)))} onAddBar={addEmpty} onPick={directPick} onBatch={pattern=>setDraft(d=>applyPicking(d,{pattern,skipLegato:true}))}
   playback={<ScorePlayback volume={draft.instrument==='drums'?drumVolume:1} score={result.score} disabled={Boolean(result.errors.length||result.issues?.length)} dock compact controller={playbackController} startAt={active} onPosition={setPlayPosition} onBpm={bpm=>setDraft(d=>({...d,bpm}))}/>}/>
  {mobileSheet==='settings'&&<ScoreSaveDialog mode="edit" document={draft} onClose={()=>closeMobileSheet()} onSave={document=>{setDraft(document);closeMobileSheet();}}/>}

  <input ref={file} type="file" accept={SCORE_FILE_ACCEPT} aria-label="악보 파일 선택" hidden onChange={importFile}/>
  {settings.popup}{instrumentDialog}
  {saveDialog}
  {closing&&<div className="etudeEditorClosePrompt" role="alert"><p>저장하지 않은 변경이 있습니다.</p><button type="button" onClick={()=>save(true)}>초안 저장 후 닫기</button><button type="button" onClick={finishClose}>변경 버리고 닫기</button><button type="button" onClick={()=>{setClosing(false);afterClose.current=null;}}>계속 편집</button></div>}
 </dialog>;
 return <dialog ref={dialog} className={`etudeEditor editorDesign etudeEditor--${mobile?'mobile':'desktop'}`} aria-label="악보 편집" onKeyDown={dialogKeyDown} onCancel={e=>{e.preventDefault();close();}}>
  <header><div><span className="etudeEditorBrand">FRETIVA LAB / 악보 편집</span><h2>{draft.title}</h2><p>{draft.bpm} BPM · {draft.meter.join('/')} · 사용자 편집본 · 교육 검수 안 됨</p></div><div className="etudeHeaderActions"><p role="status">{savedRef.current===draft?'저장 상태: 변경 없음':'저장하지 않은 변경 있음'}</p>{printButton}<button type="button" className="etudeEditorSave" onClick={()=>save()}>이 브라우저에 저장</button><button type="button" onClick={close}>닫기</button></div></header>
  {menus}{mobile?palette:<div className="etudeDesktopToolbarRow">{palette}</div>}<details className="etudeInputHelp"><summary>입력 방법 · 단축키</summary>{fretted?<><p>클릭: 커서 선택 · 숫자: 프렛 · ↑↓: 줄 이동 · ←→: 이전/다음 위치 · R: 쉼표 · Delete: 삭제 · Tab: 오선/TAB</p><p>숫자는 현재 위치를 수정하며 자동 이동하지 않습니다. ← →로 이전/다음 위치를 선택하세요. 10·12·15·23프렛은 숫자를 순서대로 누르세요. 시간 제한은 없습니다. 다른 위치를 선택하면 새 숫자 입력을 시작합니다.</p>
  <p className="etudeDragHelp">음표·TAB 숫자를 누른 채 끌기: 위아래로 음높이·줄 변경, 좌우로 같은 길이의 쉼표 자리로 이동. 사이에 자리는 앞/뒤 박 삽입 또는 현재 박 나누기로 준비하세요. Esc: 이동 취소.</p></>:<p>건반은 입력 후 자동 이동합니다. 화음 모드에서는 →로 확정합니다. ← →: 위치 이동 · R: 쉼표 · Delete: 선택 음 삭제.</p>}</details>
  {mobile?<><nav className="etudeEditorTabs"><button type="button" aria-pressed={tab==='score'} onClick={()=>setTab('score')}>악보 입력</button><button type="button" aria-pressed={tab==='properties'} onClick={()=>setTab('properties')}>선택 음 속성</button></nav>{tab==='score'?<>{sheet}<div className="etudeMobileKeypad">{['←','↑','↓','→','0','1','2','3','4','5','6','7','8','9','삭제'].map(k=><button type="button" key={k} onClick={()=>keyDown({key:({'←':'ArrowLeft','→':'ArrowRight','↑':'ArrowUp','↓':'ArrowDown','삭제':'Delete'})[k]??k,target:dialog.current,preventDefault(){}})}>{k}</button>)}</div></>:controls}</>:<div className="etudeEditorDesktopBody" >{sheet}<aside className="desktopToolColumn" aria-label="악보 입력 도구">  <MobileScoreInput drums={draft.instrument==='drums'} fretted={fretted} pitchInput={pitchInput} {...{tabRhythm,tabBeamPosition,tabPickingPosition,onTabBeam,onPickingPosition}} desktop openTool={mobileSheet} onTool={toggleMobileTool} onCloseTool={closeMobileTool} techniques={mobileTechniques} beamSelection={beamSelection} onBeamApply={applyBeamRange} repeatBar={draft.measures[barIndex]} repeatIssue={repeatIssues(draft.measures)[0]} onRepeat={applyRepeat} onNavigation={applyNavigation} onResetBar={resetCurrentBar} onDeleteBar={removeBar} canDeleteBar={draft.measures.length>1} feedback={mobileFeedback} beamRangeMode={beamRangeMode} onBeamRange={()=>{setBeamRangeMode(v=>!v);setBeamSelection(null);}} cursor={active} event={event} meter={draft.meter} onKey={mobileKey} onCopyLine={copyLine} onDeleteLine={deleteLine} onBar={delta=>setBar(Math.max(0,Math.min(draft.measures.length-1,barIndex+delta)))} onAddBar={addEmpty} onPick={directPick} onBatch={pattern=>setDraft(d=>applyPicking(d,{pattern,skipLegato:true}))}
/>{panelVisible&&<details className="desktopAdvanced"><summary>선택 속성 · 전문 편집</summary>{controls}</details>}{batchPanels}</aside></div>}

  {(result.errors.length>0||result.issues?.length>0)&&<details className="etudeEditorErrors"><summary>입력 확인 · {[...result.errors,...result.issues??[]].length}건 · 초안 저장 가능 / 재생 보류</summary><ul>{[...result.errors,...result.issues??[]].slice(0,10).map((error,i)=><li key={i}>{error}</li>)}</ul></details>}
  {message&&<p className="etudeEditorStatusMessage" role="status">{message}</p>}
  {settings.popup}{instrumentDialog}
  {saveDialog}
  {closing&&<div className="etudeEditorClosePrompt" role="alert"><p>저장하지 않은 변경이 있습니다.</p><button type="button" onClick={()=>save(true)}>초안 저장 후 닫기</button><button type="button" onClick={finishClose}>변경 버리고 닫기</button><button type="button" onClick={()=>{setClosing(false);afterClose.current=null;}}>계속 편집</button></div>}
  <div className="etudeEditorBottom"><ScorePlayback volume={draft.instrument==='drums'?drumVolume:1} score={result.score} disabled={Boolean(result.errors.length||result.issues?.length)} dock onBpm={bpm=>setDraft(d=>({...d,bpm}))} controller={playbackController} startAt={active} onPosition={setPlayPosition}/>  <footer>{original&&<button type="button" onClick={()=>{setDraft({...toScoreDocument(original),id:draft.id,kind:'user'});setBar(0);setMessage('기본 악보 내용을 가져왔습니다. 실행 취소로 되돌릴 수 있습니다. 다른 저장본은 유지됩니다.');}}>기본 악보 복원</button>}<>{!compactImport&&<button type="button" onClick={()=>file.current.click()}>파일 불러오기</button>}</><input ref={file} type="file" accept={SCORE_FILE_ACCEPT} aria-label="악보 파일 선택" hidden onChange={importFile}/><button type="button" onClick={download}>파일 내려받기</button></footer></div>
 </dialog>;
}


