import {setMeasureHarmony} from './scoreHarmony.js';
import GuitarArrangementDialog from './arrangement/GuitarArrangementDialog.jsx';
import BassArrangementDialog from './arrangement/BassArrangementDialog.jsx';
import {applySelectedInstrument} from './selectedInstrument.js';
import {editorChangeLocation,editorLocationLabel} from './editorChangeLocation.js';
import DesktopEditorNotice from './DesktopEditorNotice.jsx';
import {applyArpeggio,arpeggioSupported} from './arpeggioPattern.js';
import useArpeggioControls from './useArpeggioControls.js';
import MobileArpeggioControls from './MobileArpeggioControls.jsx';
import DesktopArpeggioControls from './DesktopArpeggioControls.jsx';
import ImportPlaybackNotice from './ImportPlaybackNotice.jsx';
import {staffPitchRepairState,restoreStaffPitch} from '../omr/staffPitch.js';
import {createEditorDocument,editorDocumentDefaults} from './editorDocumentDefaults.js';
import {scoreMeasureLimit,scoreMeasureLimitMessage} from './scoreLimits.js';
import {scorePlaybackReadiness} from './scorePlaybackReadiness.js';
import ScoreChordNameDialog from './ScoreChordNameDialog.jsx';
import {reviewTargetLabel} from '../pdf/tab-import/reviewTargetLabel.js';
import DesktopPdfTabReview from '../pdf/tab-import/DesktopPdfTabReview.jsx';
import PdfTabImport from '../pdf/tab-import/PdfTabImport.jsx';
import MobilePdfTabReview from '../pdf/tab-import/MobilePdfTabReview.jsx';
import MobileScorePdfMenu from './MobileScorePdfMenu.jsx';
import {reconcileImportedEdits,confirmImportedMeasure} from '../pdf/tab-import/scoreAdapter.js';
import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { formatMessage } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import ChordDisplayMenu from './ChordDisplayMenu.jsx';
import {refreshAutomaticChordNames} from './automaticChordNames.js';
import ScoreChordDialog from './ScoreChordDialog.jsx';
import {attachChordDiagram} from './scoreChordDiagram.js';
import {toggleEntryTie,tieAtCursor,previousTiePosition} from './scoreTieCommands.js';
import {editWholeBeat} from './scoreBeatCommands.js';
import {copyScoreRange,pasteScoreRange,scoreRangeClipboard} from './scoreRangeClipboard.js';
import {drumVoiceRhythm,isLowerDrum} from './drumVoices.js';
import {verticalInputCursor} from './verticalInputCursor.js';
import {PIANO_STAFF_LAYOUTS,pianoStaffLayout} from './scoreInstruments.js';
import TechniqueQuickDock,{loadQuickTechniques,persistQuickTechniques} from './TechniqueQuickDock.jsx';
import {setDrumTechnique} from './drumTechniques.js';
import {setSlur} from './slurs.js';
import {ensurePianoVoices,isPiano,pianoCursor,pianoPosition,pianoVoiceEdit,enterPiano,stepPiano,movePianoHand} from './pianoInput.js';
import DrumInput from './DrumInput.jsx';
import usePianoAudition from './usePianoAudition.js';
import useDrumAudition from './useDrumAudition.js';
import {advanceDrum,drumRest,insertDrumLowerRest,enterDrumNotes,fillDrumRow,drumRowHasPitches,deleteDrumRow} from './drumInput.js';
import KeyboardInput from './KeyboardInput.jsx';
import {isFretted,minOpenMidi} from './scoreInstruments.js';
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
import ScoreOpenDialog from './ScoreOpenDialog.jsx';
import DesktopScoreEditorHelp from './DesktopScoreEditorHelp.jsx';
import DesktopFingeringControls from './DesktopFingeringControls.jsx';
import DesktopBarTools from './DesktopBarTools.jsx';
import DesktopTabRepeatButton from './DesktopTabRepeatButton.jsx';
import {tabRepeatState,toggleTabRepeat} from './tabRepeat.js';
import DesktopTripletControl from './DesktopTripletControl.jsx';
import './desktopEditorHeader.css';
import {ArrowLeft,Undo2,Redo2,ChevronUp,ChevronDown,Printer,BookOpen} from 'lucide-react';
import EditorMusicIcon from './EditorMusicIcon.jsx';
import RhythmModifiers from './RhythmModifiers.jsx';
import {inputRhythm,tripletProgress,rhythmInputLabel} from './rhythmInput.js';
import {removeTriplet} from './tuplets.js';
import {printEditorScore} from './printScore.js';
import {SCORE_FILE_ACCEPT,isPdfScoreFile} from './scoreFile.js';
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import MobileScoreInput from './MobileScoreInput.jsx';
import DesktopPickingControls from './DesktopPickingControls.jsx';
import MobileScoreSheets from './MobileScoreSheets.jsx';
import EditorScore from './EditorScore.jsx';
import ScorePlayback from './ScorePlayback.jsx';
import EditorInputPanel,{DurationButtons} from './EditorInputPanel.jsx';
import {tupletGroups,ticksOf,patchEvent,shareUnchanged,hasEditableShape,newId,copyDocument,blankMeasure,pitchCandidates,pitchForMidi,cloneMeasure} from './scoreModel.js';
import {deleteMeasure,setNoteConnection,setEventDuration,setEntryDuration,resolveFretInput,deleteTone,moveFingering,setRest,insertEvent,moveTone,splitEvent,applyPicking,nextEntry,cursorStep,copyBars,pasteBars} from './editorCommands.js';
import {upgradeDocument} from './scoreDocument.js';
import {compileScoreDocument,toScoreDocument,updateDocumentChordFret} from './scoreDocument.js';
import './scoreEditor.css';
import './editorDesign.css';
const clone=value=>structuredClone(value);
const durations=[['1',ko["etudes.wholeNote4Beats"]],['2',ko["etudes.halfNote2Beats"]],['4',ko["etudes.quarterNote1Beat"]],['8',ko["etudes.eighthNoteBeat"]],['16',ko["etudes.sixteenthNoteBeat"]],['32',ko['etudes.thirtySecondNoteBeat']]];
const number=value=>value.trim()===''?'':Number(value);
const noteLabel=event=>event.voice?formatMessage(ko["etudes.valueValueBeatsValue"], { value1: event.voice==='left'?ko["etudes.leftHand"]:ko["etudes.rightHand"], value2: event.onset/480+1, value3: event.rest?(event.blank?ko["etudes.emptyInputPosition"]:ko["etudes.rest"]):event.notes.map(n=>midiName(n.midi)).join(' + ') }):event.rest?(event.blank?ko["etudes.emptyInputPosition"]:ko["etudes.rest"]):event.notes.map(n=>formatMessage(ko["app.stringValue1Value2"], { value1: n.string, value2: n.dead??event.dead?'X':n.fret })).join(' + ');

function Controls({draft,setDraft,bar,setBar,event,setEvent,section='note',mobile}) {
  useLanguage();
 const [groupError,setGroupError]=useState('');
 const m=draft.measures[bar],n=m.events[event],stringCount=draft.tuning.length;
 const edit=fn=>setDraft(old=>{const next=clone(old);fn(next);return next;});
 const setNote=(tone,key,value)=>edit(d=>{const n=d.measures[bar].events[event].notes[tone];n[key]=value;if(key==='string'||key==='fret'){n.locked=true;delete n.spelling;}});
 const beats=isPiano(draft)?Math.max(...m.events.map(e=>(e.onset+ticksOf(e))/480)):m.events.reduce((sum,n)=>sum+ticksOf(n)/480,0),capacity=draft.meter[0]*4/draft.meter[1];
 return <div className="etudeEditorControls">
  {section==='info'&&<details open><summary><Translation id="etudes.titleBpmPracticeNotes" /></summary>
   <label><Translation id="etudes.listTitle" /><input value={draft.title} onChange={e=>edit(d=>{d.title=e.target.value;})}/></label>
   <label><Translation id="etudes.scoreTitle" /><input value={draft.english} onChange={e=>edit(d=>{d.english=e.target.value;})}/></label>
   <label><Translation id="etudes.defaultBpm" /><input type="number" min="30" max="240" value={draft.bpm} onChange={e=>edit(d=>{d.bpm=number(e.target.value);})}/></label>
   <label><Translation id="etudes.practiceNotes" /><textarea value={draft.purpose} onChange={e=>edit(d=>{d.purpose=e.target.value;})}/></label>
   <label><Translation id="etudes.tipOneSentencePerLine" /><textarea value={draft.tips.join('\n')} onChange={e=>edit(d=>{d.tips=e.target.value.split('\n');})}/></label>
  </details>}
  {section!=='info'&&<>{(mobile||section==='bar')&&<div className="etudeEditorSelectors">
   <label><Translation id="app.bar" /><select aria-label={translateUi("etudes.editingBar")} value={bar} onChange={e=>{setBar(Number(e.target.value));}}>{draft.measures.map((_,i)=><option key={i} value={i}>{i+1}<Translation id="app.bar" /></option>)}</select></label>
   <label><Translation id="etudes.notesRests" /><select aria-label={translateUi("etudes.editingNote")} value={event} onChange={e=>setEvent(Number(e.target.value))}>{m.events.map((n,i)=><option key={i} value={i}>{i+1} · {localizeUi(noteLabel(n))}</option>)}</select></label>
  </div>}
  <p className={beats===capacity?'etudeEditorBeatTotal':'etudeEditorBeatTotal is-invalid'}><Translation id="etudes.currentBar" />{beats} / {capacity}<Translation id="app.beat" /></p>
  </>}
  {section==='note'&&<><details className="etudeNoteAdvanced"><summary><Translation id="etudes.advancedOptions" /></summary><label><Translation id="etudes.onsetQuarterNote1Beat" /><input aria-label={translateUi("etudes.noteOnset")} type="number" min="0" step="0.125" value={n.onset/480} onChange={e=>edit(d=>{d.measures[bar].events[event].onset=Number(e.target.value)*480;})}/></label></details>
  <div className="etudeEditorEvent">
   {n.tuplet&&<div className="etudeBeamControls"><span><Translation id="etudes.tripletScoreEditor" /></span><button type="button" onClick={()=>{try{setDraft(d=>removeTriplet(d,{bar,event}));}catch(e){setGroupError(e.message);}}}><Translation id="etudes.ungroup" /></button><button type="button" onClick={()=>{setDraft(d=>removeTriplet(d,{bar,event},{clear:true}));setEvent(tupletGroups(m.events).find(g=>g.includes(event))?.[0]??event);}}><Translation id="etudes.deleteGroup" /></button></div>}{groupError&&<p role="alert">{groupError}</p>}
   <p className="etudeSelectedDuration"><strong><Translation id="etudes.currentDuration" /></strong><span>{n.dotted||n.tuplet?translateUi("etudes.durationDetails", { duration:n.duration,modifier:n.dotted?translateUi("etudes.dotted"):translateUi("etudes.tupletCount",{count:n.tuplet.actualNotes}),beats:ticksOf(n)/480 }):localizeUi(durations.find(([value])=>value===n.duration)?.[1]??n.duration)}</span></p>
   <label className="etudeEditorCheck"><input type="checkbox" checked={n.rest&&!n.blank} onChange={e=>edit(d=>{const target=d.measures[bar].events[event];target.rest=e.target.checked;target.blank=false;target.technique=null;if(!target.rest&&!target.notes.length){const grip=d.measures[bar].chord;const string=grip?stringCount-grip.frets.findIndex(f=>f!==null):1;target.notes=[{string,fret:grip?grip.frets[stringCount-string]:0}];}})}/><Translation id="etudes.rest" /></label>
   {!n.rest&&<>
    <details className="etudeNoteAdvanced"><summary><Translation id="etudes.techniqueConnection" /></summary>{n.notes.map((tone,i)=><div className="etudeEditorTone" key={`fingers-${tone.id}`}><label><Translation id="etudes.leftHandFinger" /><select aria-label={translateUi("etudes.noteValue1LeftHandFinger", { value1: i+1 })} value={tone.finger??''} onChange={e=>setNote(i,'finger',e.target.value?Number(e.target.value):null)}><option value=""><Translation id="app.none" /></option>{[1,2,3,4].map(f=><option key={f}>{f}</option>)}</select></label><label><Translation id="etudes.rightHand" /><select aria-label={translateUi("etudes.noteValue1RightHand", { value1: i+1 })} value={tone.rightFinger??''} onChange={e=>setNote(i,'rightFinger',e.target.value||null)}><option value=""><Translation id="app.none" /></option>{['p','i','m','a'].map(f=><option key={f}>{f}</option>)}</select></label></div>)}
    <label><Translation id="etudes.pickingDirection" /><select value={n.pickStroke??''} onChange={e=>edit(d=>{d.measures[bar].events[event].pickStroke=e.target.value||null;})}><option value=""><Translation id="etudes.unspecified" /></option><option value="down"><Translation id="etudes.downScoreEditor" /></option><option value="up"><Translation id="etudes.upV" /></option></select></label>
    <button type="button" disabled={n.notes.length>=stringCount} onClick={()=>edit(d=>{const target=d.measures[bar].events[event];const string=Array.from({length:stringCount},(_,i)=>i+1).find(s=>!target.notes.some(t=>t.string===s)&&(m.chord?m.chord.frets[stringCount-s]!==null:true));if(!string)return;target.notes.push({string,fret:m.chord?m.chord.frets[stringCount-string]:0});target.technique=null;})}><Translation id="etudes.addSimultaneousNote" /></button>
    <label><Translation id="etudes.connectToNextNote" /><select aria-label={translateUi("etudes.connectionTechnique")} value={n.technique??''} onChange={e=>edit(d=>{d.measures[bar].events[event].technique=e.target.value||null;})}><option value=""><Translation id="app.none" /></option><option value="H" disabled={n.notes.length>1}><Translation id="etudes.hHammerOn" /></option><option value="P" disabled={n.notes.length>1}><Translation id="etudes.pPullOff" /></option><option value="S"><Translation id="etudes.slSlide" /></option></select></label></details>
   </>}
   <div className="etudeEditorActions"><button type="button" disabled={m.events.length>=96} onClick={()=>{setDraft(d=>insertEvent(d,{bar,event},{duplicate:true}));setEvent(event+1);}}><Translation id="etudes.duplicateNote" /></button><button type="button" disabled={m.events.length<=1} onClick={()=>{edit(d=>{const e=d.measures[bar].events[event];Object.assign(e,{rest:true,blank:true,notes:[],pickStroke:null,technique:null,tieTo:null,slurTo:null});});}}><Translation id="etudes.deleteNote" /></button></div>
  </div>
  </>}
  {section==='bar'&&<>{m.chord&&<details className="etudeEditorChord"><summary><Translation id="etudes.editThisBarSChordDiagram" /></summary>
   <label><Translation id="etudes.chordNames" /><input aria-label={translateUi("etudes.chordNames")} value={m.chord.name} onChange={e=>edit(d=>{d.measures[bar].chord.name=e.target.value;})}/></label>
   <p><Translation id="etudes.fromTop1" />{stringCount}<Translation id="etudes.stringChangingAFretAlsoChangesThisBarSNotesOnThat" /></p>
   {Array.from({length:stringCount},(_,i)=>i+1).map(string=><div className="etudeEditorChordRow" key={string}><strong>{string}<Translation id="app.string" /></strong>
    <label><Translation id="app.fret" /><input aria-label={translateUi("etudes.chordStringValue1Fret", { value1: string })} value={m.chord.frets[stringCount-string]??'×'} onChange={e=>{const v=e.target.value.trim();setDraft(d=>updateDocumentChordFret(d,bar,string,/^[xX×]$/.test(v)?null:number(v)));}}/></label>
    <label><Translation id="etudes.finger" /><select aria-label={translateUi("etudes.chordStringValue1Finger", { value1: string })} value={m.chord.fingers[stringCount-string]??''} onChange={e=>edit(d=>{d.measures[bar].chord.fingers[stringCount-string]=e.target.value?Number(e.target.value):null;})}><option value=""><Translation id="etudes.hide" /></option>{[1,2,3,4].map(f=><option key={f}>{f}</option>)}</select></label>
   </div>)}
   <label className="etudeEditorCheck"><input type="checkbox" checked={Boolean(m.chord.barre)} onChange={e=>edit(d=>{d.measures[bar].chord.barre=e.target.checked?{fret:1,from:2,to:1}:null;})}/><Translation id="etudes.barreMarker" /></label>
   {m.chord.barre&&<div className="etudeEditorBarre">{[['fret',ko["etudes.barreFret"],1,24],['from',ko["etudes.barreStartString"],2,stringCount],['to',ko["etudes.barreEndString"],1,stringCount-1]].map(([key,label,min,max])=><label key={key}>{localizeUi(label)}<input aria-label={localizeUi(label)} type="number" min={min} max={max} value={m.chord.barre[key]} onChange={e=>edit(d=>{d.measures[bar].chord.barre[key]=number(e.target.value);})}/></label>)}</div>}
  </details>}
  <div className="etudeEditorActions"><button type="button" disabled={draft.measures.length>=scoreMeasureLimit(draft)} onClick={()=>{edit(d=>{d.measures.splice(bar+1,0,cloneMeasure(m));});setBar(bar+1);}}><Translation id="etudes.duplicateBar" /></button><button type="button" disabled={draft.measures.length<=1} onClick={()=>{setDraft(d=>deleteMeasure(d,bar));setBar(Math.max(0,bar-1));}}><Translation id="etudes.deleteBar" /></button></div></>}
 </div>;
}

export default function ScoreEditor({score,document:initialDocument,original,mobile,onClose,onSave,onImportPdf,savedScores=[],onOpenSaved,initiallySaved=true,initialNotice=''}) {
  useLanguage();
 const [draft,updateDraft]=useState(()=>ensurePianoVoices(normalizePitches(editorDocumentDefaults(initialDocument??toScoreDocument(score),mobile))));
 const draftRef=useRef(draft),undoStack=useRef([]),redoStack=useRef([]),digits=useRef(null),clipboard=useRef(null),savedRef=useRef(initiallySaved?draft:null),openedRef=useRef(draft);
 const [storageNotice,setStorageNotice]=useState(initialNotice);
 const [scoreRange,setScoreRange]=useState(null);
 const [openLibrary,setOpenLibrary]=useState(false),[pendingOpen,setPendingOpen]=useState(null);
 const [chordNameBar,setChordNameBar]=useState(null);
 const [arrangementOpen,setArrangementOpen]=useState(false),[arrangementError,setArrangementError]=useState('');
 const [chordNameOnset,setChordNameOnset]=useState(0);
 const [chordEditorOpen,setChordEditorOpen]=useState(false);const [chordEditBar,setChordEditBar]=useState(null);
 const zoomController=useRef(null);
 const [saveRequest,setSaveRequest]=useState(null),[instrumentChange,setInstrumentChange]=useState(null);
 const sheetRef=useRef(null);
 const [cursor,setCursor]=useState({bar:0,event:0,string:draftRef.current.tuning.length,mode:'tab'}),[tab,setTab]=useState('score'),[message,updateMessage]=useState(''),[closing,setClosing]=useState(false),[zoom,setZoom]=useState(100),[rangeEnd,setRangeEnd]=useState(0),[pitch,setPitch]=useState(64),[candidates,setCandidates]=useState([]);
 const [inputHand,setInputHand]=useState('right'),[chordMode,setChordMode]=useState(false);
 const pianoPositions=useRef({left:{bar:0,onset:0},right:{bar:0,onset:0}}),pianoHistory=useRef(new WeakMap()),chordPending=useRef(null);
 const [lastEntered,setLastEntered]=useState(null);
 const [desktopLocation,updateDesktopLocation]=useState(null),[desktopNotice,setDesktopNotice]=useState(null);
 const setDesktopLocation=useCallback(value=>{updateDesktopLocation(value);setDesktopNotice(value);},[]);
 const setMessage=useCallback(value=>{updateMessage(value);if(!mobile)setDesktopNotice(value?{label:localizeUi(value)}:null);},[mobile]);
 const [drumBatch,setDrumBatch]=useState(false),[drumHat,setDrumHat]=useState('closed');
 const [drumMuted,setDrumMuted]=useState(false),[drumVolume,setDrumVolume]=useState(.8);
 const auditionDrum=useDrumAudition(draft.instrument==='drums'&&!drumMuted,drumVolume,setMessage);
 const auditionPiano=usePianoAudition(isPiano(draft),setMessage);
 const rememberPiano=()=>({positions:structuredClone(pianoPositions.current),hand:cursorRef.current.hand??'right'});
 const restorePiano=d=>{const state=pianoHistory.current.get(d)??{positions:{left:{bar:0,onset:0},right:{bar:0,onset:0}},hand:'right'};pianoPositions.current=structuredClone(state.positions);setInputHand(state.hand);const c=pianoCursor(d,state.positions[state.hand],state.hand);setCursor({...c,...{eventId:d.measures[c.bar].events[c.event].id,onset:d.measures[c.bar].events[c.event].onset}});chordPending.current=null;setLastEntered(null);};
 const [resetOpen,setResetOpen]=useState(false),[pickingOpen,setPickingOpen]=useState(false),[pickScope,setPickScope]=useState('all'),[pickPattern,setPickPattern]=useState(()=>mobile?'alternate-down':'rhythm-auto'),[pickRestart,setPickRestart]=useState('bar'),[skipLegato,setSkipLegato]=useState(true),[toolSection,setToolSection]=useState(null),[propertySection,setPropertySection]=useState('note'),[selectedDuration,setSelectedDuration]=useState('4'),[autoAdvance,setAutoAdvance]=useState(true);
 const [scoreSettingsOpen,setScoreSettingsOpen]=useState(false);
 const [pdfTabOpen,setPdfTabOpen]=useState(false);
 const [helpOpen,setHelpOpen]=useState(false);
 const [tupletCount,setTupletCount]=useState(3);
 const [tupletMode,setTupletMode]=useState('off'),[mobileSheet,setMobileSheet]=useState(null),[mobileDrag,setMobileDrag]=useState(false),[playPosition,setPlayPosition]=useState(null);
 const [slurStart,setSlurStart]=useState(null);
 const [techniqueCategory,setTechniqueCategory]=useState('general');
 const [bendAmount,setBendAmount]=useState(2),[quickItems,setQuickItems]=useState(loadQuickTechniques),[quickVisible,setQuickVisible]=useState(false),[quickOpen,setQuickOpen]=useState(false),[quickSelecting,setQuickSelecting]=useState(false);
 const updateQuick=items=>{setQuickItems(items);persistQuickTechniques(items);};
 const [techniqueHint,setTechniqueHint]=useState(ko["etudes.selectAStartingNote"]),[dottedMode,setDottedMode]=useState('off'),[restMode,setRestMode]=useState(false),[tupletSession,setTupletSession]=useState(null);
 const tripletInput=tupletMode==='active';
 const fretted=isFretted(draft.instrument);
 const view=fretted?(draft.viewSettings?.notationView??'tab'):'staff';
 const setView=value=>setDraft(d=>({...d,viewSettings:{...d.viewSettings,notationView:value}}));
 const tabRhythm=draft.viewSettings?.tabRhythm!==false;
 const tabShortStems=Boolean(draft.viewSettings?.tabShortStems||draft.viewSettings?.tabBeamPosition==='detached');
 const tabBeamPosition=draft.viewSettings?.tabBeamPosition==='above'?'above':'below',tabPickingPosition=draft.viewSettings?.tabPickingPosition??'below';
 const onTabBeam=value=>setDraft(d=>{const v=d.viewSettings??{},short=Boolean(v.tabShortStems||v.tabBeamPosition==='detached');return {...d,viewSettings:{...v,tabBeamPosition:value==='above'||value==='below'?value:v.tabBeamPosition==='above'?'above':'below',tabShortStems:value==='detached'?!short:short,tabRhythm:value==='hidden'?false:true}};});
 const onPickingPosition=value=>setDraft(d=>({...d,viewSettings:{...d.viewSettings,tabPickingPosition:value}}));
 const playbackController=useRef(null);
 const afterClose=useRef(null);const finishClose=savedDocument=>{if(pendingOpen){const same=savedDocument?.id===pendingOpen.document.id;onOpenSaved(same?savedDocument:pendingOpen.document,same?{saved:true}:pendingOpen.options);return;}onClose();afterClose.current?.();};
 const dialog=useRef(null),file=useRef(null),cursorRef=useRef(cursor);
 const cancelDigits=useCallback(()=>{digits.current=null;},[]);
 const setDraft=useCallback((update,{coalesce=false,keepDigits=false,reconcileImport=true}={})=>{if(!keepDigits)cancelDigits();const before=draftRef.current;if(isPiano(before))pianoHistory.current.set(before,rememberPiano());let after=typeof update==='function'?update(before):update;after=editorDocumentDefaults(reconcileImport?reconcileImportedEdits(before,after):after,mobile);after=shareUnchanged(before,refreshAutomaticChordNames(ensurePianoVoices(normalizePitches(after))));if(before===after)return;
  // Legacy form duplication gets fresh identifiers; existing ones never change.
  const seen=new Set();let repair=false;for(const m of after.measures)for(const item of [m,...m.events.flatMap(e=>[e,...e.notes])]){if(!item.id||seen.has(item.id))repair=true;seen.add(item.id);}
  if(repair){after=structuredClone(after);seen.clear();for(const m of after.measures)for(const item of [m,...m.events.flatMap(e=>[e,...e.notes])]){if(!item.id||seen.has(item.id))item.id=newId();seen.add(item.id);}after=shareUnchanged(before,after);}
  if(!coalesce){undoStack.current.push(before);if(undoStack.current.length>100)undoStack.current.shift();redoStack.current=[];}draftRef.current=after;updateDraft(after);setCandidates([]);if(mobile)updateDesktopLocation(null);else setDesktopLocation(null);
 },[mobile]);
 const copyToClipboard=(start,end)=>{clipboard.current={...draftRef.current,measures:copyBars(draftRef.current,start,end)};};
 const pasteFromClipboard=d=>{if(!clipboard.current)throw Error(ko["etudes.copyABarFirst"]);const converted=convertScoreInstrument(clipboard.current,d.instrument??'guitar');return pasteBars(d,barIndex,converted.measures);};
 const showHistoryLocation=(before,after,label)=>{
  if(mobile){updateDesktopLocation(null);return;}
  playbackController.current?.stop();setPlayPosition(null);setLastEntered(null);
  const changed=editorChangeLocation(before,after);
  if(changed.cursor){select(changed.cursor);setDesktopLocation({...changed,label:`${label} · ${editorLocationLabel(after,changed.cursor)}${changed.bars.length>1?` · 총 ${changed.bars.length}마디 변경 (첫 위치 표시)`:''}`});}
  else setDesktopLocation({cursor:null,label:`${label} · 악보 설정 변경`});
 };
 const undo=()=>{cancelDigits();const prior=undoStack.current.pop();if(prior){const before=draftRef.current;if(isPiano(before))pianoHistory.current.set(before,rememberPiano());redoStack.current.push(before);draftRef.current=prior;updateDraft(prior);if(isPiano(prior))restorePiano(prior);showHistoryLocation(before,prior,'되돌리기');}};
 const redo=()=>{cancelDigits();const next=redoStack.current.pop();if(next){const before=draftRef.current;undoStack.current.push(before);draftRef.current=next;updateDraft(next);if(isPiano(next))restorePiano(next);showHistoryLocation(before,next,'다시 실행');}};
 const result=useMemo(()=>compileScoreDocument(draft,original),[draft,original]);
 const playback=useMemo(()=>scorePlaybackReadiness(draft,result),[draft,result]);
 const barIndex=Math.max(0,Math.min(cursor.bar,draft.measures.length-1)),eventIndex=Math.max(0,Math.min(cursor.event,draft.measures[barIndex].events.length-1));
 const repeatDisplay=useMemo(()=>tabRepeatState(draft,barIndex,scoreRange),[draft,barIndex,scoreRange]);
 const toggleRepeatDisplay=()=>{setDraft(d=>toggleTabRepeat(d,barIndex,scoreRange));setMessage(translateUi(repeatDisplay.enabled?'editor.tabRepeatRestored':'editor.tabRepeatApplied'));focusScore();};
 const active=useMemo(()=>({...cursor,...(isPiano(draft)?pianoCursor(draft,{bar:cursor.bar,id:cursor.eventId,onset:cursor.onset??draft.measures[barIndex].events[eventIndex].onset},cursor.hand??inputHand):{}),string:fretted?Math.min(cursor.string,draft.tuning.length):1,mode:fretted?cursor.mode:'staff',...(isPiano(draft)?{}:{bar:barIndex,event:eventIndex})}),[cursor,barIndex,eventIndex,draft,inputHand,fretted]);
 cursorRef.current=active;
 const event=draft.measures[active.bar].events[active.event],tone=event.notes.find(n=>n.id===cursor.noteId)??event.notes.find(n=>n.string===cursor.string)??event.notes[0];
 const previousTieCursor=previousTiePosition(draft,active),previousTieEvent=previousTieCursor&&draft.measures[previousTieCursor.bar].events[previousTieCursor.event];
 const canTie=Boolean(event.notes.length||event.blank&&previousTieEvent?.notes.length),tieSelected=tieAtCursor(draft,active);
 const select=useCallback((c,{seekPlayback=true}={})=>{if(mobile)updateDesktopLocation(null);else setDesktopLocation(null);setScoreRange(null);if(isPiano(draftRef.current)){const selected=draftRef.current.measures[c.bar]?.events[c.event];const hand=selected?.voice??c.hand??inputHand;c={...c,hand,eventId:selected?.id,onset:selected?.onset};pianoPositions.current[hand]=pianoPosition(draftRef.current,c);setInputHand(hand);}if(isFretted(draftRef.current.instrument)&&c.string!==cursorRef.current.string||!draftRef.current.measures[c.bar]?.events[c.event]?.notes.some(n=>n.id===c.noteId))c={...c,noteId:undefined};c={...c,string:isFretted(draftRef.current.instrument)?Math.min(c.string,draftRef.current.tuning.length):1,mode:isFretted(draftRef.current.instrument)?c.mode:'staff'};cancelDigits();cursorRef.current=c;setCursor(c);setCandidates([]);setPropertySection(c.target==='bar'?'bar':'note');const selected=draftRef.current.measures[c.bar]?.events[c.event];if(selected&&(!selected.blank||selected.tuplet||selected.pdfImport?.rhythmVerified)&&dottedMode==='off'&&!tripletInput)setSelectedDuration(c.inputDuration??(draftRef.current.instrument==='drums'?drumVoiceRhythm(selected,isLowerDrum(selected.notes.find(n=>n.id===c.noteId)?.midi??c.midi??38)).duration:selected.duration));if(seekPlayback)playbackController.current?.seek(c);if(c.midi!==undefined)setPitch(c.midi);},[cancelDigits,dottedMode,tripletInput,inputHand,mobile]);
 useLayoutEffect(()=>{const node=dialog.current,unlock=lockDocumentScroll();node.showModal();const releaseTouch=containModalTouch(node);if(!mobile)node.querySelector('[data-score-input]')?.focus({preventScroll:true});return()=>{releaseTouch();node.close();unlock();};},[]);
 useEffect(()=>{const warn=e=>{if(savedRef.current!==draftRef.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
 useEffect(()=>cancelDigits,[cancelDigits]);
 useEffect(()=>{if(!mobile)return;const viewport=window.visualViewport;const resize=()=>{dialog.current?.style.setProperty('--editor-viewport-height',`${viewport?.height??window.innerHeight}px`);dialog.current?.style.setProperty('--editor-viewport-top',`${viewport?.offsetTop??0}px`);if(document.activeElement?.closest('.editorAudioDock'))requestAnimationFrame(()=>document.activeElement?.scrollIntoView?.({block:'nearest'}));};resize();viewport?.addEventListener('resize',resize);viewport?.addEventListener('scroll',resize);return()=>{viewport?.removeEventListener('resize',resize);viewport?.removeEventListener('scroll',resize);};},[mobile]);

 useEffect(()=>{if(!mobile||!message)return;const timer=setTimeout(()=>setMessage(''),3200);return()=>clearTimeout(timer);},[mobile,message]);
 // Size the mobile score once per viewport/instrument, never from score contents.
 useEffect(()=>{
  if(!mobile)return;
  let frame;
  const size=()=>{
   cancelAnimationFrame(frame);
   const sheet=sheetRef.current;if(!sheet)return;
   sheet.style.removeProperty('--mobile-score-height');
   frame=requestAnimationFrame(()=>{if(sheet.isConnected)sheet.style.setProperty('--mobile-score-height',`${sheet.getBoundingClientRect().height}px`);});
  };
  size();window.addEventListener('resize',size);window.visualViewport?.addEventListener('resize',size);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',size);window.visualViewport?.removeEventListener('resize',size);sheetRef.current?.style.removeProperty('--mobile-score-height');};
 },[mobile,draft.instrument]);
 const focusScore=()=>dialog.current.querySelector('[data-score-input]')?.focus({preventScroll:true});
 const closeMobileSheet=useCallback((restoreFocus=false)=>{setMobileSheet(null);if(restoreFocus)dialog.current?.querySelector('[data-score-input]')?.focus({preventScroll:true});},[]);
 const selectInScore=useCallback(c=>{chordPending.current=null;c={...c,editing:true};
  if(slurStart&&c.target!=='bar'){
   try{const target=draftRef.current.measures[c.bar].events[c.event];setDraft(d=>setSlur(d,slurStart,target.id));setSlurStart(null);setMessage('');}catch(error){setMessage(error.message);return;}
  }
  select(c);
  if(mobile&&mobileSheet==='settings')setMobileSheet(null);
 },[select,mobile,mobileSheet,slurStart,setDraft]);
 const applyNavigation=(kind,value)=>{try{setDraft(d=>setScoreNavigation(d,barIndex,kind,value));}catch(e){setMessage(e.message);}};
 const applyRepeat=action=>{try{setDraft(d=>setScoreRepeat(d,barIndex,action));}catch(e){setMessage(e.message);}};
 const arpeggio=useArpeggioControls(draft,barIndex,options=>{
  try{const next=applyArpeggio(draftRef.current,options);playbackController.current?.stop();setDraft(next);setTupletSession(null);setTupletMode('off');setDottedMode('off');setRestMode(false);setSlurStart(null);select({...active,bar:options.start,event:0,string:next.measures[options.start].events[0].notes[0]?.string??1});setSelectedDuration(next.measures[options.start].events[0].duration);setMessage(translateUi('editor.arpApplied',{value1:options.start+1,value2:options.end+1}));}
  catch(error){setMessage(error.message);}
 },bar=>{playbackController.current?.stop();setChordNameOnset(0);setChordNameBar(bar);});
 const arpeggioControls=arpeggioSupported(draft)?(mobile?<MobileArpeggioControls controls={arpeggio}/>:<DesktopArpeggioControls controls={arpeggio}/>):null;
 const applyDesktopPicking=()=>{try{
  cancelDigits();setDraft(d=>applyPicking(d,{start:pickScope==='all'?0:barIndex,end:pickScope==='all'?d.measures.length-1:pickScope==='bar'?barIndex:Math.max(barIndex,Math.min(rangeEnd,d.measures.length-1)),pattern:pickPattern,restart:pickRestart,skipLegato}));
  setMessage(ko["etudes.appliedPickingMarksToTheRangeNotesFingeringsAndRhythmAreUnchanged"]);
 }catch(error){setMessage(error.message);}};


 const commitRhythm=(at,kind,value,options)=>{
  const source=fretted&&at.applyInputDuration&&at.inputDuration&&dottedMode==='off'&&!tripletInput?setEntryDuration(draftRef.current,at,at.inputDuration):draftRef.current;
  const changed=inputRhythm(source,at,{selectedDuration,dottedMode,tupletMode,tupletCount,session:tupletSession},kind,value);
  setDraft(changed.document,options);setDottedMode(changed.dottedMode);setTupletMode(changed.tupletMode);setRestMode(false);
  setTupletSession(changed.completed?null:changed.session);
  setMessage(changed.completed?ko["etudes.tripletEntryComplete"]:'');
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
 const midiRhythm=useRef(null);midiRhythm.current={selectedDuration,dottedMode,tupletMode,tupletCount,session:tupletSession};
 const enterPitches=(pitches,hand=inputHand,moveNext=false,drumArticulation)=>{if(draftRef.current.instrument==='drums')moveNext=false;
  if(isPiano(draftRef.current)){if(hand!==(cursorRef.current.hand??inputHand))switchHand(hand);void auditionPiano(pitches);commitPiano(pitches,{advance:moveNext||!chordMode,chord:chordMode});return;}
  try{const at=cursorRef.current,changed=(draftRef.current.instrument==='drums'?(drumBatch?fillDrumRow:enterDrumNotes):enterMidiNotes)(draftRef.current,at,pitches,midiRhythm.current);
   if(draftRef.current.instrument==='drums'&&pitches.includes(38)&&drumArticulation!==undefined){changed.document={...changed.document,measures:changed.document.measures.map((bar,b)=>!(changed.filledBars??[at.bar]).includes(b)?bar:{...bar,events:bar.events.map((e,i)=>!drumBatch&&i!==at.event?e:{...e,notes:e.notes.map(n=>{if(n.midi!==38)return n;const next={...n};if(drumArticulation)next.drumArticulation=drumArticulation;else delete next.drumArticulation;return next;})})})};}
   midiRhythm.current={...midiRhythm.current,dottedMode:changed.dottedMode,tupletMode:changed.tupletMode,session:changed.completed?null:changed.session};
   if(hand!=='auto'&&!isFretted(draftRef.current.instrument)&&draftRef.current.instrument!=='drums')changed.document=patchEvent(changed.document,at.bar,at.event,e=>({...e,notes:e.notes.map(n=>pitches.includes(n.midi)?{...n,hand}:n)}));
   const next=moveNext?nextEntry(changed.document,at):{document:changed.document,cursor:changed.cursor??at};setDraft(next.document);setDottedMode(changed.dottedMode);setTupletMode(changed.tupletMode);setTupletSession(changed.completed?null:changed.session);setRestMode(false);select(draftRef.current.instrument==='drums'?{...next.cursor,midi:pitches.at(-1),noteId:changed.document.measures[next.cursor.bar].events[next.cursor.event].notes.find(n=>n.midi===pitches.at(-1))?.id}:next.cursor,{seekPlayback:false});
   const entered=changed.document.measures[at.bar].events[at.event];if(entered.notes.some(n=>n.unplaced))setMessage(ko["etudes.noPlayableTabPositionTheOriginalPitchIsPreservedReviewItIn"]);else if(entered.notes.some(n=>n.outsidePreferred))setMessage(ko["etudes.placedOutsideThePreferredFretRange"]);
  }catch(e){setMessage(e.message);}
 };
 const midi=useMidiKeyboard(pitches=>enterPitches(pitches,inputHand,true),()=>Boolean(dialog.current?.open&&!settings.isOpen&&!mobileSheet&&!toolSection&&!resetOpen&&!pickingOpen&&!saveRequest&&!closing&&!instrumentChange&&!playbackController.current?.isPlaying()&&document.activeElement?.closest('[data-score-input]')&&document.activeElement?.closest('dialog')===dialog.current&&cursorRef.current.target!=='bar'&&document.visibilityState==='visible'),()=>`${draftRef.current.id}:${draftRef.current.instrument}:${inputHand}:${cursorRef.current.bar}:${cursorRef.current.event}`);
 const pitchTools=fretted&&<details><summary><Translation id="etudes.pitchAlternateFingerings" /></summary><p><Translation id="etudes.soundingPitchMidi" />{scoreInstrument(draft.instrument).octaveShift?translateUi("etudes.notationIsWrittenOneOctaveAboveSoundingPitch"):translateUi("etudes.notationUsesSoundingPitch")}<Translation id="etudes.theCurrentStringIsKeptWhenPossibleChooseAmongAlternativesManually" /></p><input aria-label={translateUi("etudes.soundingPitchMidiScoreEditor")} type="number" min={minOpenMidi(draft.instrument)} max="112" value={pitch} onChange={e=>setPitch(Number(e.target.value))}/><button type="button" onClick={()=>applyPitch(pitch)}><Translation id="etudes.applyPitchKeepString" /></button><button type="button" onClick={()=>{const midi=tone?soundingMidi(draft,tone):pitch;setPitch(midi);setCandidates(pitchCandidates(tone,midi,effectiveTuning(draft)).filter(n=>n.fret+(draft.capo??0)<=maxFret(draft)));}}><Translation id="etudes.sameNoteOnAnotherString" /></button>{candidates.map(n=><button type="button" key={n.string} onClick={()=>applyPitch(pitch,n.string)}>{n.string}<Translation id="components.string" />{n.fret}<Translation id="app.fret" /></button>)}</details>;
 const settings=useEditorSettings(draft,setDraft,midi,mobile,[
  {id:'before',label:'etudes.insertBeatBefore',onClick:()=>insert(true)},
  {id:'after',label:'etudes.insertBeatAfter',onClick:()=>insert(false)},
  {id:'split',label:'etudes.splitCurrentBeat',disabled:Number(event.duration)>=32,onClick:()=>split()},
 ],<><DesktopBarTools limit={scoreMeasureLimit(draft)} measures={draft.measures} bar={barIndex} end={rangeEnd} onEnd={setRangeEnd} canPaste={Boolean(clipboard.current)} onDuplicate={()=>{setDraft(d=>({...d,measures:[...d.measures.slice(0,barIndex+1),cloneMeasure(d.measures[barIndex]),...d.measures.slice(barIndex+1)]}));setBar(barIndex+1);}} onCopy={()=>{copyToClipboard(barIndex,Math.max(barIndex,Math.min(rangeEnd,draft.measures.length-1)));setMessage(ko['etudes.copiedSelectedBars']);}} onPaste={()=>{try{setDraft(d=>pasteFromClipboard(d));}catch(error){setMessage(error.message);}}}/>
  <details><summary><Translation id="editor.preciseNoteEdit" /></summary><label><Translation id="etudes.onsetQuarterNote1Beat" /><input aria-label={translateUi('etudes.noteOnset')} type="number" min="0" step="0.125" value={event.onset/480} onChange={e=>setDraft(d=>patchEvent(d,barIndex,eventIndex,{onset:Number(e.target.value)*480}))}/></label><button type="button" disabled={draft.measures[barIndex].events.length>=96} onClick={()=>{try{setDraft(d=>insertEvent(d,active,{duplicate:true}));setEvent(eventIndex+1);}catch(error){setMessage(error.message);}}}><Translation id="etudes.duplicateNote" /></button>{pitchTools}</details>
 </>);
 const tabWarnings=draft.measures.flatMap(m=>m.events.flatMap(e=>e.notes)).filter(n=>n.unplaced||n.outsidePreferred);
 const exitTuplet=()=>{
  const progress=tripletProgress(draftRef.current,tupletSession);
  if(tripletInput&&progress.indices.length&&progress.count<progress.indices.length){
   if(progress.count>0&&!window.confirm(localizeUi(ko["etudes.tripletEntryIsIncompleteCancelIt"])))return false;
   setDraft(d=>isPiano(d)?pianoVoiceEdit(d,{bar:tupletSession.bar,event:progress.indices[0],hand:inputHand},(voice,c)=>removeTriplet(voice,c,{clear:true})).document:removeTriplet(d,{bar:tupletSession.bar,event:progress.indices[0]},{clear:true}));
   select({...active,bar:tupletSession.bar,event:progress.indices[0]});
  }
  setTupletMode('off');setTupletSession(null);return true;
 };
 useEffect(()=>{if(tupletSession&&!tripletProgress(draft,tupletSession).indices.length){setTupletSession(null);setTupletMode('off');}},[draft,tupletSession]);
 const stepEntry=from=>{const next=nextEntry(draftRef.current,from);if(next.document!==draftRef.current)setDraft(next.document,{coalesce:true,keepDigits:true});return next.cursor;};
 const advance=(from=cursorRef.current)=>{if(autoAdvance||tripletInput){const next=stepEntry(from);select({...next,target:undefined});if(next.bar===from.bar&&next.event===from.event)setMessage(draftRef.current.pdfTabImport?`마디 길이를 확인해 주세요. ${scoreMeasureLimitMessage(draftRef.current)}`:ko["etudes.checkTheBarLengthYouCanEnterUpTo64Bars"]);}};
 const showProperties=section=>{cancelDigits();if(mobile){setPropertySection(section);setMobileSheet(section);}else{playbackController.current?.stop();setMobileSheet(null);setScoreSettingsOpen(true);}};
 const setBar=b=>select(isPiano(draftRef.current)?pianoCursor(draftRef.current,{bar:b,onset:0},inputHand):{...active,bar:b,event:0});const setEvent=i=>select({...active,event:i});
 const save=(close=false,copy=false)=>{cancelDigits();setSaveRequest({close,copy,document:copy?copyDocument(draftRef.current):draftRef.current});};
 const commitSave=async(document,{copy=false}={})=>{
  const copying=copy||saveRequest.copy;
  if(copy)document=copyDocument(document);
  const saved=await onSave(document);if(!saved.saved)throw Error(saved.errors?.join(' / ')||ko["etudes.couldNotSaveTryAgain"]);
  if(!copying){setDraft(saved.record?.document??document);savedRef.current=draftRef.current;setStorageNotice('');}
  setMessage(saved.record?.status==='draft'?ko["etudes.incompleteDraftSavedResolveRhythmAndInputIssuesToEnablePlayback"]:ko["etudes.savedToMyScores"]);
  const close=saveRequest.close,target=saveRequest.instrumentTarget;setSaveRequest(null);if(target)startInstrumentDocument(target);else if(close)finishClose(saved.record?.document??document);
 };
 const saveDialog=saveRequest&&<ScoreSaveDialog allowCopy={!mobile&&!saveRequest.copy&&!saveRequest.close&&!saveRequest.instrumentTarget} showNotes={!mobile} document={saveRequest.document} onSave={commitSave} onClose={()=>setSaveRequest(null)}/>;
 const close=()=>{if(!exitTuplet())return;if(savedRef.current!==draftRef.current)setClosing(true);else finishClose();};
 const openSavedLibrary=()=>{cancelDigits();playbackController.current?.stop();setOpenLibrary(true);};
 const openSavedScore=(document,options={})=>{setOpenLibrary(false);if(!exitTuplet())return false;if(savedRef.current!==draftRef.current){setPendingOpen({document,options});setClosing(true);}else onOpenSaved(document,options);return true;};
 const openPdfDraft=async document=>{
  if(!exitTuplet())throw Error('현재 셋잇단 입력을 완료한 뒤 다시 열어 주세요.');
  const saved=await onSave(document),options={saved:Boolean(saved.saved),imported:true,notice:saved.saved?'':`아직 악보실에 저장되지 않은 초안입니다. 저장을 다시 시도하거나 제작 악보 파일로 보관해 주세요. ${saved.errors?.join(' / ')||''}`};
  if(openSavedScore(saved.saved?saved.record.document:document,options))setPdfTabOpen(false);
 };
 const downloadDraft=()=>{
  const document=draftRef.current,url=URL.createObjectURL(new Blob([JSON.stringify(document)],{type:'application/json'})),link=window.document.createElement('a');
  link.href=url;link.download=`${document.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')||'TAB 초안'}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 const importFile=async e=>{const selected=e.target.files?.[0];e.target.value='';if(!selected)return;try{if(isPdfScoreFile(selected)){if(!onImportPdf)throw Error(ko["etudes.openPdfsUsingImportPdfInTheScoreLibrary"]);afterClose.current=()=>onImportPdf(selected);close();return;}if(selected.size>2*1024*1024)throw Error(ko["etudes.chooseAScoreJsonFileNoLargerThan2Mb"]);const next=upgradeDocument(JSON.parse((await selected.text()).replace(/^\uFEFF/,'')));if(!hasEditableShape(next))throw Error(ko["etudes.checkTheNoteStructure"]);setDraft({...next,id:draft.id,kind:'user'});resetPianoEntry();select({bar:0,event:0,string:draftRef.current.tuning.length,mode:'tab'});setMessage(ko["etudes.fileImportedYouCanSaveIncompleteWorkAsADraft"]);}catch(e){setMessage(e.message);}};
 const applyPitch=(midi,string)=>{const possible=pitchCandidates(tone,midi,effectiveTuning(draft)).filter(n=>n.fret+(draft.capo??0)<=maxFret(draft));if(!possible.length){setMessage(ko["etudes.thisPitchCannotBePlayedAtFrets024InTheCurrent"]);return;}const choice=string?possible.find(n=>n.string===string):possible.find(n=>n.string===tone?.string);
  if(!choice){setCandidates(possible);setPitch(midi);setMessage(ko["etudes.chooseAStringAndFretForTheSamePitchPositionsAreNot"]);return;}
  try{if(event.blank){commitRhythm({...active,string:choice.string},'note',choice.fret);}else{setDraft(d=>patchEvent(d,barIndex,eventIndex,e=>{const n={...(tone??{id:newId('tone')}),...choice,locked:true};delete n.spelling;if(e.notes.some(t=>t!==tone&&t.string===n.string)){setMessage(ko["etudes.theSelectedStringAlreadyContainsASimultaneousNote"]);return e;}return {...e,rest:false,blank:false,notes:tone?e.notes.map(t=>t===tone?n:t):[n]};}));}setCursor(c=>({...c,string:choice.string}));}catch(error){setMessage(error.message);}
 };
 const insert=(before=false)=>{try{setDraft(d=>insertEvent(d,active,{before}));setEvent(eventIndex+(before?0:1));setMessage(formatMessage(ko["etudes.insertedABeatValueTheSelectionAndShiftedLaterBeatsInThe"], { value1: before?ko["etudes.before"]:ko["etudes.after"] }));}catch(e){setMessage(e.message);}focusScore();};
 const move=useCallback((from,to)=>{try{const before=draftRef.current,toneId=before.measures[from.bar].events[from.event].notes.find(n=>n.string===from.string)?.id,next=moveTone(before,from,to);if(next===before)return;const moved=next.measures[to.bar].events[to.event].notes.find(n=>n.id===toneId);setDraft(next);select({...to,string:moved.string});setMessage(ko["etudes.noteMovedUseUndoToRestoreIt"]);}catch(e){setMessage(e.message);}},[setDraft,select]);
 const split=()=>{try{setDraft(d=>splitEvent(d,active));setEvent(eventIndex+1);setMessage(ko["etudes.splitTheCurrentDurationInHalfLeavingTheSecondHalfAvailableFor"]);}catch(e){setMessage(e.message);}focusScore();};
 const keyDown=(e,tabInput=false)=>{
  if(e.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]')||e.isComposing)return;
  const surface=dialog.current.querySelector('[data-score-input]');if(surface)surface.dataset.inputAt=String(performance.now());
  const command=e.ctrlKey||e.metaKey,k=e.key;
  if(command&&k.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if(command&&k.toLowerCase()==='y'){e.preventDefault();redo();return;}
  if(command&&k.toLowerCase()==='s'){e.preventDefault();save();return;}
  if(command&&k.toLowerCase()==='c'&&!mobile){e.preventDefault();try{scoreRangeClipboard.current=copyScoreRange(draftRef.current,scoreRange??{start:cursorRef.current,end:cursorRef.current});setMessage(ko["etudes.selectionCopiedCopyingALineWillNotReplaceThisCopiedSelection"]);}catch(error){setMessage(error.message);}return;}
  if(command&&k.toLowerCase()==='v'&&!mobile){e.preventDefault();try{setDraft(d=>pasteScoreRange(d,cursorRef.current,scoreRangeClipboard.current));setScoreRange(null);setMessage(ko["etudes.pastedTheSelectionAtTheCurrentPositionPressCtrlZToUndo"]);}catch(error){setMessage(error.message);}return;}
  if(command&&k.toLowerCase()==='c'){e.preventDefault();copyToClipboard(barIndex,Math.min(rangeEnd,draft.measures.length-1));setMessage(ko["etudes.copiedSelectedBars"]);return;}
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
   at={...at,applyInputDuration:false};cursorRef.current=at;setCursor(at);
   digits.current={...next,document:draftRef.current,undoDepth:coalesce?previous.undoDepth:depth};
   
   return;
  }
  if(k==='ArrowLeft'||k==='ArrowRight'){e.preventDefault();if(draft.instrument==='drums'&&k==='ArrowRight'){try{const next=advanceDrum(draftRef.current,active,midiRhythm.current);setDraft(next.document);setDottedMode(next.dottedMode??dottedMode);setTupletMode(next.tupletMode??tupletMode);setTupletSession(next.completed?null:next.session??tupletSession);select({...next.cursor,noteId:undefined},{seekPlayback:false});}catch(error){setMessage(error.message);}return;}if(isPiano(draft)){pianoStep(k==='ArrowLeft'?-1:1);return;}const next=cursorStep(draft,active,k==='ArrowLeft'?-1:1);select({...next,inputDuration:k==='ArrowRight'&&fretted&&!tripletInput&&dottedMode==='off'?(active.inputDuration??selectedDuration):undefined,applyInputDuration:k==='ArrowRight'&&fretted&&!tripletInput&&dottedMode==='off'&&(next.bar!==active.bar||next.event!==active.event)});return;}
  if(k==='ArrowUp'||k==='ArrowDown'){e.preventDefault();if(!fretted){select(verticalInputCursor(draft,active,k==='ArrowUp'?1:-1),{seekPlayback:false});return;}if(cursor.mode==='staff'&&!tabInput){const midi=(cursor.midi??pitch)+(k==='ArrowUp'?1:-1);setPitch(midi);setCursor(c=>({...c,midi}));}else select({...active,mode:tabInput?'tab':active.mode,string:Math.max(1,Math.min(draft.tuning.length,active.string+(k==='ArrowUp'?-1:1)))});return;}
  if(k==='Tab'){if(view!=='both')setView('both');e.preventDefault();select({...active,mode:cursor.mode==='tab'?'staff':'tab',midi:tone?soundingMidi(draft,tone):pitch});return;}
  if(fretted&&k.toLowerCase()==='t'){e.preventDefault();connection('tie');return;}
  if(k.toLowerCase()==='x'){e.preventDefault();cancelDigits();try{commitRhythm(active,'mute');}catch(err){setMessage(err.message);}return;}
  if(k==='Backspace'||k==='Delete'){e.preventDefault();cancelDigits();setDraft(d=>deleteTone(d,active));return;}
  if(k.toLowerCase()==='r'){e.preventDefault();if(draft.instrument==='drums'){try{const changed=drumRest(draftRef.current,active,midiRhythm.current);setDraft(changed.document);setDottedMode(changed.dottedMode);setTupletMode(changed.tupletMode);setTupletSession(changed.completed?null:changed.session);}catch(error){setMessage(error.message);}return;}if(isPiano(draft)){commitPiano([],{rest:true,advance:true});return;}cancelDigits();try{commitRhythm(active,'rest');advance();}catch(err){setMessage(err.message);}return;}
  if(['+','=','-','_'].includes(k)){e.preventDefault();const values=['1','2','4','8','16','32'],step=k==='+'||k==='='?1:-1,value=values[Math.max(0,Math.min(values.length-1,values.indexOf(selectedDuration)+step))];setDuration(value);return;}
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
 const connection=kind=>{if(kind==='tie'&&fretted){cancelDigits();try{setDraft(toggleEntryTie(draftRef.current,active,selectedDuration));const tied=draftRef.current.measures[active.bar].events[active.event];select({...active,inputDuration:tied.duration,applyInputDuration:false});setTechniqueHint(ko['editor.tieEntryHint']);setMessage(tieAtCursor(draftRef.current,active)?ko['editor.tieContinuesPrevious']:ko['editor.tieRemoved']);}catch(error){setMessage(error.message);setTechniqueHint(error.message);}return;}if(kind==='slur'){if(slurStart){setSlurStart(null);return;}if(event.slurTo){setDraft(d=>patchEvent(d,active.bar,active.event,{slurTo:null}));return;}const events=draft.measures.flatMap(m=>m.events),next=events[events.findIndex(e=>e.id===event.id)+1];if(next&&!next.rest&&!next.blank&&next.notes.length){try{setDraft(setSlur(draft,event.id,next.id));setSlurStart(null);setMessage('');}catch(error){setMessage(error.message);}return;}setSlurStart(event.id);setMobileSheet(null);setToolSection(null);return;}if(kind==='clear')setSlurStart(null);setTechniqueHint(({H:ko["etudes.nextNoteOnTheSameStringLowerHigherFret"],P:ko["etudes.nextNoteOnTheSameStringHigherLowerFret"],S:ko["etudes.selectAStartingNoteOrChordSlideConnectToDifferentFretsOn"],tie:ko["etudes.sustainIntoTheNextNoteOfTheSamePitch"],palmMute:ko["etudes.shortenTheSelectedNoteOrChordSSustain"],vibrato:ko["etudes.applyVibratoToTheSelectedNote"],harmonic:ko["etudes.applyAtANaturalHarmonicPositionOnTheSelectedString"],'arpeggio-up':ko["etudes.currentChordLowerStringHigherString"],'arpeggio-down':ko["etudes.currentChordHigherStringLowerString"],'let-ring':ko["etudes.showLingeringSustainWithAnOpenCurveEvenWithoutAFollowingNote"],'slide-out-up':ko["etudes.showAnUpwardSlideOutFromTheCurrentNoteOrChord"],'slide-out-down':ko["etudes.showADownwardSlideOutFromTheCurrentNoteOrChord"],parentheses:ko["etudes.putTheSelectedNoteSFretNumberInParentheses"],'bend-up':ko["etudes.bendUpAWholeStepFullWithinTheSelectedNoteSDuration"],'bend-hold':ko["etudes.holdThePitchOneWholeStepFullHigher"],'bend-release':ko["etudes.releaseFromAWholeStepFullBendToTheOriginalPitch"],'bend-up-release':ko["etudes.bendUpDuringTheFirstHalfOfTheNoteThenReleaseDuring"],clear:ko["etudes.clearTechniquesFromTheSelectedNote"]})[kind]);try{setDraft(d=>isPiano(d)?pianoVoiceEdit(d,active,(voice,c)=>setNoteConnection(voice,c,kind)).document:setNoteConnection(d,active,kind));setMessage('');}catch(e){setTechniqueHint(e.message);setMessage(e.message);}};
 const techniqueButton=(kind,label,shortLabel=label,quick=false)=>{
 const [base,amount]=kind.split(':'),tone=event.notes.find(n=>n.string===active.string);
 const selected=['H','P','S'].includes(base)?event.technique===base:base==='slur'?Boolean(event.slurTo||slurStart===event.id):base==='tie'?tieSelected:base==='harmonic'?Boolean(tone?.harmonic):base==='parentheses'?Boolean(tone?.parenthesized):base.startsWith('bend-')?tone?.bendEffect?.phase===base.slice(5)&&tone?.bendEffect?.amount===Number(amount??2):base.startsWith('slide-in-')?event.slideIn===base.slice(9):base.startsWith('slide-out-')?event.slideOut===base.slice(10):base.startsWith('arpeggio-')?event.arpeggio===base.slice(9):Boolean(event[base==='let-ring'?'letRing':base]);
 const literal={H:'H',P:'P',S:'SL',palmMute:'P.M.',clear:'×'}[base];
 const caption={tie:ko["etudes.tie"],slur:ko["etudes.slurScoreEditor"],harmonic:ko["etudes.harmonics"],'let-ring':ko["etudes.openTie"],'slide-in-up':ko["etudes.slideIn"],'slide-in-down':ko["etudes.slideIn"],'slide-out-up':ko["etudes.slideOut"],'slide-out-down':ko["etudes.slideOut"],parentheses:ko["etudes.parenthesizedNote"],'bend-prebend':ko["etudes.preBend"],'bend-up':ko["etudes.raise"],'bend-hold':ko["etudes.hold"],'bend-release':ko["etudes.releaseScoreeditor"],'bend-up-release':ko["etudes.raiseRelease"],clear:ko["components.clear"]}[base];
 const pressed=quick?(base==='slur'&&slurStart===event.id):quickSelecting?quickItems.some(a=>a[0]===kind):selected;
 return <button type="button" key={kind} aria-label={localizeUi(label)} title={localizeUi(label)} disabled={(!quickSelecting||quick)&&(base==='tie'?!canTie:event.rest||!event.notes.length)} aria-pressed={pressed} onClick={()=>{if(!quick&&quickSelecting){if(!quickItems.some(a=>a[0]===kind))updateQuick([...quickItems,[kind,label,shortLabel]]);setQuickVisible(true);return;}connection(kind);}}>{mobile&&!quick&&pressed&&<span className="techniqueSelectionCheck" aria-hidden="true">✓</span>}{literal?<span className="techniqueShort">{literal}</span>:<EditorMusicIcon kind={base}/>} {caption&&<span className="techniqueCaption">{localizeUi(caption)}</span>} {quick&&base.startsWith('bend-')&&<span>{Number(amount??2)===2?'Full':Number(amount)===1?'½':'¼'}</span>}</button>;
 };
 const quickPanel=fretted&&quickVisible&&<TechniqueQuickDock mobile={mobile} items={quickItems} renderButton={techniqueButton} open={quickOpen} onOpen={setQuickOpen} onRemove={kind=>updateQuick(quickItems.filter(a=>a[0]!==kind))}/>;
 const techniqueTools=!fretted?<div>{draft.instrument!=='drums'&&techniqueButton('tie',translateUi("etudes.tie"))}{techniqueButton('clear',translateUi("etudes.clearConnection"))}</div>:<><div className="techniqueCategoryHeader"><div className="techniqueQuickActions"><button type="button" aria-pressed={quickSelecting} onClick={()=>{setQuickSelecting(v=>!v);setQuickVisible(true);}}><Translation id="etudes.addToQuickTools" /></button><button type="button" onClick={()=>{setQuickVisible(true);setQuickOpen(true);setQuickSelecting(false);setMobileSheet(null);setToolSection(null);}}><Translation id="etudes.quickTools" /></button></div>{mobile&&<div className="techniqueCategoryTabs" role="tablist" aria-label={translateUi("etudes.techniqueCategory")}>{[['general',ko["etudes.general"]],['bend',ko["etudes.bending"]]].map(([value,label])=><button type="button" role="tab" key={value} aria-selected={techniqueCategory===value} onClick={()=>setTechniqueCategory(value)}>{localizeUi(label)}</button>)}</div>}</div>{(!mobile||techniqueCategory==='general')&&<><div className="techniqueGroup" role="group" aria-label={translateUi("etudes.noteConnections")}>{[['H',ko["etudes.hammerOn"]],['P',ko["etudes.pullOff"]],['S',ko["etudes.slide"]],['tie',ko["etudes.tie"]],['slur',ko["etudes.slur"],ko["etudes.slurScoreEditor"]]].map(args=>techniqueButton(...args))}</div><div className="techniqueGroup techniqueExpressionGroup" role="group" aria-label={translateUi("etudes.expression")}>{[['palmMute',ko["etudes.pMPalmMute"],ko["etudes.palmMute"]],['vibrato',ko["etudes.vibrato"]],['harmonic',ko["etudes.harmonics"]],['arpeggio-up',ko["etudes.ascendingArpeggio"],ko["app.ascending"]],['arpeggio-down',ko["etudes.descendingArpeggio"],ko["app.descending"]]].map(args=>techniqueButton(...args))}</div><div className="techniqueGroup" role="group" aria-label={translateUi("etudes.openConnectionsAndParentheses")}>{[['let-ring',ko["etudes.openTie"]],['slide-in-up',ko["etudes.slideInFromBelow"]],['slide-in-down',ko["etudes.slideInFromAbove"]],['slide-out-up',ko["etudes.slideOutUpward"],ko["etudes.out"]],['slide-out-down',ko["etudes.slideOutDownward"],ko["etudes.outScoreEditor"]],['parentheses',ko["etudes.parenthesizedNote"],ko["etudes.noteScoreEditor"]]].map(args=>techniqueButton(...args))}</div></>}{(!mobile||techniqueCategory==='bend')&&<><div className={mobile?"techniqueBendControls":"desktopBendControls"}>{mobile&&<span><Translation id="etudes.bendInterval" /></span>}<div className="bendAmountOptions" role="radiogroup" aria-label={translateUi("etudes.bendInterval")}>{[[2,'Full'],[1,'½'],[.5,'¼']].map(([value,label])=><button type="button" key={value} role="radio" aria-checked={bendAmount===value} onClick={()=>setBendAmount(value)}>{mobile&&bendAmount===value&&<span className="techniqueValueCheck" aria-hidden="true">✓</span>}{localizeUi(label)}</button>)}</div></div><div className="techniqueGroup" role="group" aria-label={translateUi("etudes.bendAndRelease")}>{[['bend-prebend',ko["etudes.preBend"],ko["etudes.preBend"]],['bend-up',ko["etudes.bendUp"],ko["etudes.raise"]],['bend-hold',ko["etudes.holdBend"],ko["etudes.hold"]],['bend-release',ko["etudes.releaseBend"],ko["etudes.release"]],['bend-up-release',ko["etudes.bendAndReleaseScoreEditor"],ko["etudes.raiseRelease"]]].map(([kind,label,short])=>techniqueButton(kind+':'+bendAmount,label,short))}</div></>}<div className="techniqueFooter"><p className="techniqueApplyHint" role="status">{event.rest?translateUi("etudes.selectANoteToApplyATechnique"):localizeUi(techniqueHint)}</p>{techniqueButton('clear',translateUi("etudes.clearTechnique"),translateUi("components.clear"))}</div></>;
 const beatTools=<>
  <button type="button" onClick={()=>insert(true)}><Translation id="etudes.insertBeatBefore" /></button><button type="button" onClick={()=>insert(false)}><Translation id="etudes.insertBeatAfter" /></button><button type="button" disabled={Number(event.duration)>=32} onClick={split}><Translation id="etudes.splitCurrentBeat" /></button>
  <button type="button" disabled={draft.measures.length>=scoreMeasureLimit(draft)} onClick={()=>{setDraft(d=>({...d,measures:[...d.measures.slice(0,barIndex+1),blankMeasure(d.meter),...d.measures.slice(barIndex+1)]}));setBar(barIndex+1);}}><Translation id="etudes.addEmptyBar" /></button>
 </>;
 const historyTools=<div className="etudeToolbarGroup" role="group" data-ui="edit-history" aria-label={translateUi("etudes.history")}><button type="button" aria-label={translateUi("etudes.undo")} title={translateUi("etudes.undoCtrlZ")} disabled={!undoStack.current.length} onClick={undo}><Undo2 size={21} strokeWidth={1.8}/></button><button type="button" aria-label={translateUi("app.redo")} title={translateUi("etudes.redoCtrlShiftZ")} disabled={!redoStack.current.length} onClick={redo}><Redo2 size={21} strokeWidth={1.8}/></button></div>;
 const previewPrint=()=>{try{printEditorScore(dialog.current,draft.title,view,draft);}catch(error){setMessage(error.message);}};

 const durationTools=<div className="etudeToolbarGroup" role="group" data-ui="note-durations" aria-label={translateUi("etudes.noteDurationsAndRests")}><DurationButtons value={selectedDuration} onChange={value=>setDuration(value)} compact/><button type="button" onClick={()=>{try{if(draft.instrument==='drums')mobileKey('r');else if(isPiano(draft))commitPiano([],{rest:true,advance:true});else{commitRhythm(active,'rest');advance();}}catch(err){setMessage(err.message);}focusScore();}}><Translation id="etudes.rRest" /></button></div>;
 const setDuration=value=>{const pending=tripletInput||dottedMode!=='off';if(value!==selectedDuration&&!exitTuplet())return;cancelDigits();try{if(!pending&&draft.instrument!=='drums'&&(!isPiano(draft)||active.editing||chordPending.current))setDraft(d=>isPiano(d)?pianoVoiceEdit(d,active,(voice,c)=>setEventDuration(voice,c,value)).document:fretted?setEntryDuration(d,active,value):setEventDuration(d,active,value));if(fretted){const next={...cursorRef.current,inputDuration:pending?undefined:value,applyInputDuration:false};cursorRef.current=next;setCursor(next);}setMessage('');setDottedMode('off');setRestMode(false);setSelectedDuration(value);}catch(error){setMessage(error.message);}focusScore();};
 const toggleDotted=(locked=false)=>{cancelDigits();if(!exitTuplet())return;setDottedMode(current=>current==='locked'?'off':locked?'locked':current==='off'?'one-shot':'off');focusScore();};
 const toggleTriplet=(count=3)=>{cancelDigits();if(tripletInput){const same=count===tupletCount;if(!exitTuplet()||same)return;}if(!['4','8','16','32'].includes(selectedDuration)){setMessage(ko["etudes.selectAnEighthOrSixteenthNoteFirst"]);return;}setDottedMode('off');setTupletSession(null);setTupletCount(count);setTupletMode('active');focusScore();};
 const removeSelectedTriplet=clear=>{try{const first=tupletGroups(draft.measures[barIndex].events).find(group=>group.includes(eventIndex))?.[0]??eventIndex;setDraft(d=>isPiano(d)?pianoVoiceEdit(d,active,(voice,c)=>removeTriplet(voice,c,{clear})).document:removeTriplet(d,active,{clear}));setTupletMode('off');setTupletSession(null);select({...active,event:first});}catch(error){setMessage(error.message);}};
 const modifiers=<RhythmModifiers controlCount={event.tuplet?.actualNotes??3} tripletControl={!mobile&&event.tuplet&&!tripletInput?<DesktopTripletControl key={event.tuplet.groupId} count={event.tuplet.actualNotes} onRemove={removeSelectedTriplet}/>:undefined} {...{dottedMode,tupletMode}} onDotted={toggleDotted} tupletCount={tupletCount} onTriplet={()=>toggleTriplet(3)} onSextuplet={()=>toggleTriplet(6)}/>;
 const inputStatus=rhythmInputLabel(selectedDuration,dottedMode,tupletMode,tripletProgress(draft,tupletSession).count,tupletCount);
 const directDurations=<><DurationButtons value={selectedDuration} onChange={setDuration}/></>;
 const autoAdvanceOption=<label className="etudeAutoAdvance"><input type="checkbox" checked={autoAdvance} onChange={e=>{cancelDigits();setAutoAdvance(e.target.checked);}}/><Translation id="etudes.advanceAfterEnteringARestOrMutedNote" /></label>;
 const zoomControl=<label className="etudeToolbarZoom"><Translation id="etudes.zoom" /><select aria-label={translateUi("etudes.editorZoom")} value={zoom} onChange={e=>setZoom(Number(e.target.value))}>{[...new Set([25,50,67,75,90,100,125,150,200,zoom])].sort((a,b)=>a-b).map(v=><option key={v} value={v}>{v}%</option>)}</select></label>;
 const toolCategories=<>  <div className="etudeToolbarSections" role="group" aria-label={translateUi("etudes.editingToolCategories")}>
   {(mobile?(draft.instrument!=='drums'?[['beats',ko["etudes.notesBars"]],['technique',ko["app.technique"]]]:[['beats',ko["etudes.notesBars"]]]):[]).map(([key,label])=><button type="button" key={key} aria-expanded={toolSection===key} onClick={()=>{setToolSection(v=>v===key?null:key);setPickingOpen(false);setResetOpen(false);}}>{localizeUi(label)}<span aria-hidden="true">{toolSection===key?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</span></button>)}
   {mobile&&fretted&&<button type="button" aria-expanded={pickingOpen} onClick={()=>{setPickingOpen(v=>!v);setResetOpen(false);setToolSection(null);}}><Translation id="etudes.batchPicking" /><span aria-hidden="true">{pickingOpen?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</span></button>}<button type="button" className="etudeResetToggle" aria-expanded={resetOpen} onClick={()=>{setResetOpen(v=>!v);setPickingOpen(false);setToolSection(null);}}><Translation id="app.reset" /><span aria-hidden="true">{resetOpen?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</span></button>
  </div></>;
 const resetPianoEntry=()=>{pianoPositions.current={left:{bar:0,onset:0},right:{bar:0,onset:0}};chordPending.current=null;setInputHand('right');setChordMode(false);};
 const startInstrumentDocument=id=>{resetPianoEntry();
  const current=draftRef.current,blank=createEditorDocument(mobile);
  const next=convertScoreInstrument({...blank,bpm:current.bpm,meter:[...current.meter],keySignature:current.keySignature,viewSettings:{...current.viewSettings,systemBreaks:[],sourceLayout:false},measures:[blankMeasure(current.meter)]},id);
  playbackController.current?.stop();setDraft(next);select({bar:0,event:0,string:next.tuning.length,mode:'tab'});
  setTupletSession(null);setTupletMode('off');setDottedMode('off');setRestMode(false);setInstrumentChange(null);setMessage(formatMessage(ko["etudes.startingABlankValueScoreUseUndoToRestoreThePreviousEdits"], { value1: scoreInstrument(id).label }));
 };
 const instrumentDialog=instrumentChange&&<InstrumentChangeDialog request={instrumentChange} anchor={sheetRef} onCancel={()=>setInstrumentChange(null)} onDiscard={()=>startInstrumentDocument(instrumentChange.id)} onSave={()=>{cancelDigits();setSaveRequest({close:false,copy:false,instrumentTarget:instrumentChange.id,document:draftRef.current});}}/>;
 const changeInstrument=id=>{try{const next=applySelectedInstrument(draftRef.current,id);playbackController.current?.stop();setDraft(next);if(next.bassArrangement)setView('both');if(isPiano(next)){resetPianoEntry();select(pianoCursor(draftRef.current));}else select({...active,string:Math.min(active.string,next.tuning.length),midi:undefined});setTupletSession(null);setMobileSheet(null);setToolSection(null);setPickingOpen(false);setCandidates([]);setMessage(id==='bass'&&next.bassArrangement?'선택한 베이스에 맞춰 저음 반주로 변환했습니다. 원본은 보존됩니다.':formatMessage(ko["etudes.changedToValueFingeringAndStavesWereConvertedWhilePreservingExistingPitches"], { value1: scoreInstrument(id).label }));}catch(error){if(id==='bass'&&draftRef.current.instrument!=='drums'){playbackController.current?.stop();setArrangementError(error.message);setArrangementOpen('bass');}else{setMessage('');setInstrumentChange({id,reason:error.message});}}};
 const pianoStaffSelect=isPiano(draft)?<label className="pianoStaffLayoutSelect"><span><Translation id="etudes.staffScoreEditor" /></span><select aria-label={translateUi("etudes.pianoStaffLayout")} value={pianoStaffLayout(draft.viewSettings?.pianoStaffLayout)} onChange={e=>setDraft(d=>({...d,viewSettings:{...d.viewSettings,pianoStaffLayout:e.target.value}}))}>{PIANO_STAFF_LAYOUTS.map(o=><option key={o.value} value={o.value}>{localizeUi(o.label)}</option>)}</select></label>:null;
 const notationOptions=fretted?[['tab','TAB'],['both',ko["etudes.staffTab"]],['staff',ko["etudes.staff"]]]:[];
 const changeNotationView=value=>{setView(value);if(value!=='both')select({...active,mode:value==='tab'?'tab':'staff'},{seekPlayback:false});};
 const instrumentSelect=<select className="scoreInstrumentSelect" aria-label={translateUi("app.chooseInstrument")} value={draft.instrument??'guitar'} onChange={e=>changeInstrument(e.target.value)}>{Object.entries(SCORE_INSTRUMENTS).map(([id,profile])=><option key={id} value={id}>{localizeUi(mobile&&id==='guitar'?translateUi("editor.guitarCompact"):profile.label)}</option>)}</select>;
 const chordDisplayMenu=fretted&&<ChordDisplayMenu onDiagram={()=>{playbackController.current?.stop();setChordEditBar(null);setChordEditorOpen(true);}} onName={()=>{playbackController.current?.stop();setChordNameBar(barIndex);}}/>;
 const openArrangement=kind=>{setArrangementError('');cancelDigits();playbackController.current?.stop();setMobileSheet(null);setArrangementOpen(kind);};
 const arrangementEntry=draft.instrument!=='drums'&&<>{draft.instrument!=='bass'&&<button type="button" onClick={()=>openArrangement('guitar')}>기타 편곡</button>}<button type="button" onClick={()=>openArrangement('bass')}>베이스 편곡</button></>;
 const notationViews=mobile?<div className="mobileNotationViews" role="group" aria-label={translateUi("etudes.staffView")}><div className={fretted?'editorInstrumentRow editorInstrumentRow--fretted':'editorInstrumentRow'}>{instrumentSelect}{settings.tuning}{fretted&&<select className="scoreNotationSelect" aria-label={translateUi("etudes.viewMode")} value={view} onChange={e=>changeNotationView(e.target.value)}>{notationOptions.map(([value,label])=><option key={value} value={value}>{localizeUi(label)}</option>)}</select>}{chordDisplayMenu}</div>{pianoStaffSelect}<div className="mobileArrangementEntry">{arrangementEntry}</div></div>:<div className="desktopNotationViews" role="group" aria-label={translateUi("etudes.staffView")}><div className="editorInstrumentRow">{instrumentSelect}{settings.tuning}</div>{notationOptions.map(([value,label])=><button type="button" key={value} aria-pressed={view===value} onClick={()=>changeNotationView(value)}>{localizeUi(label)}</button>)}{pianoStaffSelect}{chordDisplayMenu}{arrangementEntry}{fretted&&<DesktopTabRepeatButton state={repeatDisplay} hasRange={Boolean(scoreRange)} onToggle={toggleRepeatDisplay}/>}</div>;
 const palette=<div className="etudeInputPalette" onClick={e=>{const button=e.target.closest('.etudeToolbarMore button');if(button)button.closest('details').removeAttribute('open');}} onMouseDown={e=>{if(e.target.closest('button'))e.preventDefault();}}>
  {mobile?<><div className="etudeToolbarStatus"><strong aria-live="polite">{barIndex+1}<Translation id="app.barApp" />{eventIndex+1}<Translation id="etudes.notes" />{cursor.mode==='tab'?translateUi("etudes.stringValue1", { value1: cursor.string }):translateUi("etudes.staff")}</strong>{zoomControl}</div><div className="etudeToolbarMain">{historyTools}{durationTools}</div>{toolCategories}<details className="etudeEntryOptions"><summary><Translation id="etudes.inputSettings" /></summary>{autoAdvanceOption}</details></>:<div className="etudeToolbarMain"><div className="etudeToolbarStrip">{notationViews}{directDurations}<button type="button" onClick={()=>{try{if(draft.instrument==='drums')mobileKey('r');else if(isPiano(draft))commitPiano([],{rest:true,advance:true});else{commitRhythm(active,'rest');advance();}}catch(err){setMessage(err.message);}focusScore();}}><Translation id="etudes.rest" /></button>{!mobile&&fretted&&<button type="button" className="desktopTieEntry" aria-label={translateUi("editor.tieButton")} title={translateUi("editor.tieEntryHint")} aria-pressed={tieSelected} disabled={!canTie} onClick={()=>{connection('tie');focusScore();}}>Tie</button>}{modifiers}</div><div className="desktopDirectTools">{toolCategories}{fretted&&autoAdvanceOption}</div></div>}
 </div>;
 const tools=<>{fretted&&propertySection==='note'&&<details><summary><Translation id="etudes.pitchAlternateFingerings" /></summary><p><Translation id="etudes.soundingPitchMidi" />{scoreInstrument(draft.instrument).octaveShift?translateUi("etudes.notationIsWrittenOneOctaveAboveSoundingPitch"):translateUi("etudes.notationUsesSoundingPitch")}<Translation id="etudes.theCurrentStringIsKeptWhenPossibleChooseAmongAlternativesManually" /></p><input aria-label={translateUi("etudes.soundingPitchMidiScoreEditor")} type="number" min={minOpenMidi(draft.instrument)} max="112" value={pitch} onChange={e=>setPitch(Number(e.target.value))}/><button type="button" onClick={()=>applyPitch(pitch)}><Translation id="etudes.applyPitchKeepString" /></button><button type="button" onClick={()=>{const midi=tone?soundingMidi(draft,tone):pitch;setPitch(midi);setCandidates(pitchCandidates(tone,midi,effectiveTuning(draft)).filter(n=>n.fret+(draft.capo??0)<=maxFret(draft)));}}><Translation id="etudes.sameNoteOnAnotherString" /></button>{candidates.map(n=><button type="button" key={n.string} onClick={()=>applyPitch(pitch,n.string)}>{n.string}<Translation id="components.string" />{n.fret}<Translation id="app.fret" /></button>)}</details>}
  {propertySection==='bar'&&<details><summary><Translation id="etudes.copyBarRangeScoreSettings" /></summary><label><Translation id="etudes.lastBarToCopy" /><select aria-label={translateUi("etudes.lastBarToCopy")} value={Math.min(rangeEnd,draft.measures.length-1)} onChange={e=>setRangeEnd(Number(e.target.value))}>{draft.measures.map((m,i)=><option key={m.id} value={i}>{i+1}</option>)}</select></label><button type="button" onClick={()=>{copyToClipboard(barIndex,Math.min(rangeEnd,draft.measures.length-1));setMessage(formatMessage(ko["etudes.copiedValue1Bars"], { value1: clipboard.current.measures.length }));}}><Translation id="etudes.copyRange" /></button><button type="button" onClick={()=>{try{setDraft(d=>pasteFromClipboard(d));}catch(e){setMessage(e.message);}}}><Translation id="etudes.pasteAfterCurrentBar" /></button>
  <label><Translation id="app.meter" /><select value={draft.meter.join('/')} onChange={e=>setDraft(d=>({...d,meter:e.target.value.split('/').map(Number)}))}>{[...new Set(['2/4','3/4','4/4','6/8',draft.meter.join('/')])].map(m=><option key={m}>{m}</option>)}</select></label><p><Translation id="etudes.changingTheMeterKeepsExistingNotePositionsAndDurations" /></p><label><Translation id="etudes.keySignatureScoreEditor" /><select value={draft.keySignature} onChange={e=>setDraft(d=>({...d,keySignature:e.target.value}))}>{['C','G','D','A','E','B','F','Bb','Eb','Am','Em','Dm','Gm'].map(k=><option key={k}>{localizeUi(k)}</option>)}</select></label>
  </details>}</>;
 const batchPanels=<>
  {toolSection&&<section className="etudeBatchPanel etudeQuickTools" aria-label={toolSection==='beats'?translateUi("etudes.noteAndBarTools"):translateUi("etudes.techniqueTools")}><div className="etudeEditorActions">{toolSection==='beats'?beatTools:techniqueTools}</div></section>}
  {resetOpen&&<section className="etudeBatchPanel" aria-label={translateUi("etudes.resetScore")}><strong><Translation id="etudes.resetScope" /></strong><p><Translation id="etudes.changesOnlyTheCurrentEditTheSavedCopyStaysUnchangedUntilYou" /></p><div className="etudeEditorActions"><button type="button" onClick={()=>{setDraft(openedRef.current);select({bar:0,event:0,string:draftRef.current.tuning.length,mode:'tab'});setResetOpen(false);setMessage(ko["etudes.restoredTheScoreToItsStateWhenTheEditorOpenedYouCan"]);}}><Translation id="etudes.restoreInitialEditState" /></button><button type="button" onClick={()=>{setDraft(d=>({...d,kind:'user',measures:[blankMeasure(d.meter)]}));select({bar:0,event:0,string:draftRef.current.tuning.length,mode:'tab'});setResetOpen(false);setMessage(ko["etudes.clearedNotesAndChordDiagramsLeavingOneEmptyBarYouCanUndo"]);}}><Translation id="etudes.resetToOneEmptyBar" /></button><button type="button" onClick={()=>{setDraft(createEditorDocument(mobile));select({bar:0,event:0,string:draftRef.current.tuning.length,mode:'tab'});setResetOpen(false);}}><Translation id="etudes.newScore" /></button>{original&&<button type="button" onClick={()=>{setDraft({...toScoreDocument(original),id:draft.id,kind:'user'});setBar(0);setResetOpen(false);}}><Translation id="etudes.restoreDefaultScore" /></button>}</div></section>}
  {mobile&&pickingOpen&&<section className="etudeBatchPanel" aria-label={translateUi("etudes.batchPicking")}><div className="etudeBatchFields"><label><Translation id="etudes.applyTo" /><select aria-label={translateUi("etudes.pickingRange")} value={pickScope} onChange={e=>setPickScope(e.target.value)}><option value="all"><Translation id="etudes.entireScore" /></option><option value="bar"><Translation id="etudes.currentBarScoreEditor" /></option><option value="range"><Translation id="etudes.currentBarThroughSpecifiedBar" /></option></select></label>{pickScope==='range'&&<label><Translation id="app.endBar" /><select aria-label={translateUi("etudes.pickingEndBar")} value={Math.min(rangeEnd,draft.measures.length-1)} onChange={e=>setRangeEnd(Number(e.target.value))}>{draft.measures.map((m,i)=><option key={m.id} value={i}>{i+1}<Translation id="app.bar" /></option>)}</select></label>}<label><Translation id="etudes.pickingPattern" /><select aria-label={translateUi("etudes.batchPickingPattern")} value={pickPattern} onChange={e=>setPickPattern(e.target.value)}><option value="alternate-down"><Translation id="etudes.alternateDownUpScoreEditor" /></option><option value="alternate-up"><Translation id="etudes.alternateUpDown" /></option><option value="down"><Translation id="etudes.allDown" /></option><option value="up"><Translation id="etudes.allUp" /></option><option value="clear"><Translation id="etudes.clearPickingMarks" /></option></select></label></div><label className="etudeEditorCheck"><input type="checkbox" checked={skipLegato} onChange={e=>setSkipLegato(e.target.checked)}/><Translation id="etudes.skipPickingOnHPSlDestinationNotes" /></label><p><Translation id="etudes.replacesPickingMarksInTheRangeAlternatesOnEachPickedNoteExcluding" /></p><button type="button" onClick={()=>{setDraft(d=>applyPicking(d,{start:pickScope==='all'?0:barIndex,end:pickScope==='all'?d.measures.length-1:pickScope==='bar'?barIndex:Math.min(rangeEnd,d.measures.length-1),pattern:pickPattern,skipLegato}));setMessage(ko["etudes.appliedPickingMarksToTheRangeNotesFingeringsAndRhythmAreUnchanged"]);}}><Translation id="etudes.applyPickingPattern" /></button></section>}
 </>;
 const controls=<div className="etudePropertiesPanel"><h3>{propertySection==='note'?translateUi("etudes.noteProperties"):propertySection==='bar'?translateUi("etudes.barProperties"):translateUi("etudes.songDetails")}</h3>{fretted&&!mobile&&propertySection==='note'&&<EditorInputPanel stringCount={draft.tuning.length} cursor={active} event={event} onString={string=>{select({...active,string,mode:'tab',target:undefined});focusScore();}} onFret={fret=>{try{commitRhythm(active,'note',fret);}catch(error){setMessage(error.message);}}} onDelete={()=>{setDraft(d=>deleteTone(d,active));}}/>}{(fretted||propertySection!=='note')&&<Controls {...{draft,setDraft,bar:barIndex,setBar,event:eventIndex,setEvent,mobile}} section={propertySection}/>} {tools}{!mobile&&propertySection==='info'&&<div className="etudeEditorActions"><button type="button" onClick={()=>save(false,true)}><Translation id="app.saveAsCopy" /></button><button type="button" onClick={()=>{setDraft(createEditorDocument(mobile));select({bar:0,event:0,string:draftRef.current.tuning.length,mode:'tab'});setMessage(ko["etudes.createdANewScoreExistingSavedCopiesAreKeptYouCanUndo"]);}}><Translation id="etudes.newScore" /></button>{original&&<button type="button" onClick={()=>{setDraft({...toScoreDocument(original),id:draft.id,kind:'user'});setBar(0);setMessage(ko["etudes.loadedTheDefaultScoreYouCanUndoThisOtherSavedCopiesAre"]);}}><Translation id="etudes.restoreDefaultScore" /></button>}</div>}</div>;
 const sheet=<div ref={sheetRef} className="etudeEditorPreview">{mobile&&<div className="mobileNotationTools">{notationViews}<div className="mobileDurationRow"><DurationButtons value={selectedDuration} onChange={setDuration} compact/><button type="button" aria-label={translateUi("app.rest")} aria-pressed={restMode} onClick={()=>mobileKey('r')}><Translation id="app.rest" /></button>{modifiers}</div>{(dottedMode!=='off'||tupletMode!=='off')&&<output className="rhythmInputStatus" aria-live="polite">{localizeUi(inputStatus)}</output>}</div>}{!mobile&&<div className="etudePaperHeading" role="button" tabIndex="0" onClick={()=>showProperties('info')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showProperties('info');}}}><h3>{draft.title}</h3><p>{draft.bpm}<Translation id="originalUi.bpmScoreeditor" />{draft.meter.join('/')} · {localizeUi(scoreInstrument(draft.instrument).label)}</p></div>}{!mobile&&tuningCaption(draft)&&<p className="editorTuningCaption">{localizeUi(tuningCaption(draft))}</p>}{tabWarnings.length>0&&<p className="editorTabWarning" role="status"><Translation id="etudes.checkTabPositionsScoreEditor" />{tabWarnings.length}<Translation id="etudes.notesMeansUnplayableReviewInEdit" /></p>}{result.score?<EditorScore desktopLocation={desktopLocation} onHarmonyEdit={(bar,onset=0)=>{playbackController.current?.stop();setChordNameOnset(onset);setChordNameBar(bar);}} onChordEdit={bar=>{playbackController.current?.stop();setChordEditBar(bar);setChordEditorOpen(true);}} onAnnotationChange={(bar,kind,offset)=>setDraft(d=>({...d,measures:d.measures.map((m,i)=>i===bar?{...m,annotationOffsets:{...m.annotationOffsets,[kind]:offset}}:m)}))} onHarmonyChange={(bar,name)=>setDraft(d=>({...d,measures:d.measures.map((m,i)=>i===bar?{...m,harmony:name||null,chordNameMode:'manual'}:m)}))} desktopViewControls={!mobile?<div className="desktopScoreViewControls" role="group" aria-label={translateUi("etudes.scoreZoomAndHistory")}>{historyTools}{zoomControl}</div>:null} range={mobile?null:scoreRange} onRangeChange={setScoreRange} clearRange={()=>setScoreRange(null)} capoControl={settings.capo} editControl={mobile&&!fretted?(...args)=><div className="mobileDrumBarActions"><button type="button" aria-label={translateUi("etudes.addBar")} title={translateUi("etudes.addBar")} disabled={draft.measures.length>=scoreMeasureLimit(draft)} onClick={()=>addEmpty()}>+</button><button type="button" aria-label={translateUi("etudes.deleteBar")} title={translateUi("etudes.deleteCurrentBar")} disabled={draft.measures.length<=1} onClick={()=>removeBar()}>−</button>{settings.edit(...args)}</div>:settings.edit} score={result.score} mobile={mobile} cursor={active} lastEntered={lastEntered} onLayoutChange={settings=>setDraft(d=>({...d,viewSettings:{...d.viewSettings,...settings,sourceLayout:false}}))} onSelect={selectInScore} onKeyDown={keyDown} onMove={move} onMessage={setMessage} zoom={zoom} onZoomChange={setZoom} zoomController={zoomController} view={view} tabRhythm={tabRhythm} playPosition={playPosition} allowDrag={fretted&&(!mobile||mobileDrag)}/>:<p><Translation id="etudes.correctInvalidInputInPropertiesYourInputDataHasBeenPreserved" /></p>}</div>;
 const mobileKey=key=>keyDown({key,target:dialog.current,preventDefault(){}},true);
 const directPick=value=>{cancelDigits();if(event.rest){setMessage(ko["etudes.enterPickingDirectionsAtAPositionContainingANote"]);return;}setDraft(d=>patchEvent(d,barIndex,eventIndex,{pickStroke:value}));if(value)select(cursorStep(draftRef.current,active,1));};
 const chordNameDialog=chordNameBar!==null&&fretted?<ScoreChordNameDialog document={draft} bar={chordNameBar} onset={chordNameOnset} mobile={mobile} onClose={()=>setChordNameBar(null)} onApply={(bar,name,onset=0,previousOnset=onset)=>{setDraft(d=>({...d,measures:d.measures.map((m,i)=>i===bar?setMeasureHarmony(m,name,onset,previousOnset):m)}));setChordNameBar(null);}}/>:null;
 const chordDialog=chordEditorOpen&&fretted?<ScoreChordDialog document={draft} bar={barIndex} editBar={chordEditBar} cursor={active} mobile={mobile} onClose={()=>setChordEditorOpen(false)} onApply={(shape,options)=>{setDraft(d=>attachChordDiagram(d,options.bar,shape,options));setChordEditorOpen(false);setMessage(shape?formatMessage(ko["etudes.attachedValue2ChordDiagramToBarValue1"], { value1: options.bar+1, value2: shape.name }):ko["etudes.deletedChordDiagram"]);}}/>:null;
 const pitchInput=draft.instrument==='drums'?<DrumInput mobile={mobile} onTechnique={value=>{setDraft(d=>setDrumTechnique(d,active,value));focusScore();}} onRimshot={()=>{enterPitches([38],inputHand,false,'rimshot');void auditionDrum(38,'rimshot');focusScore();}} onRest={()=>{try{setDraft(d=>insertDrumLowerRest(d,active));focusScore();}catch(error){setMessage(error.message);}}} hat={drumHat} onHat={setDrumHat} batch={drumBatch} onBatch={value=>{setDrumBatch(value);focusScore();}} event={event} cursor={active} meter={draft.meter} preview={!drumMuted} onPreview={value=>setDrumMuted(!value)} volume={drumVolume} onVolume={setDrumVolume} onKey={mobileKey} onEnter={pitches=>{const at=cursorRef.current,current=draftRef.current.measures[at.bar].events[at.event];if(drumBatch?drumRowHasPitches(draftRef.current,at,pitches):pitches.every(midi=>current.notes.some(n=>n.midi===midi))){setDraft(d=>drumBatch?deleteDrumRow(d,at,pitches):pitches.reduce((next,midi)=>deleteTone(next,{...at,noteId:undefined,lowerRest:false,midi}),d));select({...at,noteId:undefined,lowerRest:false});setMessage(ko["etudes.deletedSelectedDrumNotesRhythmDurationsAreKept"]);}else{pitches.forEach(midi=>void auditionDrum(midi));enterPitches(pitches,inputHand,false,null);}focusScore();}}/>:<KeyboardInput hand={inputHand} onInputHand={switchHand} chordMode={chordMode} onChordMode={toggleChord} instrument={draft.instrument} event={event} cursor={active} desktop={!mobile} onEnter={(pitches,hand,options)=>{playbackController.current?.stop();enterPitches(pitches,hand);if(options?.focus!==false)focusScore();}} onKey={mobileKey} onSelect={n=>select({...active,noteId:n.id,midi:n.midi,mode:'staff'})} onHand={hand=>{try{const next=movePianoHand(draftRef.current,active,hand);setDraft(next.document);select({...next.cursor,editing:true});}catch(error){setMessage(error.message);}}}/>;
 const mobileNotice=message.replace(/event-[0-9a-f-]+:\s*/gi,'');
 const validationIssues=[...result.errors,...result.issues??[]];
 const mobileFeedback=(mobileNotice||validationIssues.length>0)?<><span className="mobileEditorFeedbackText" role="status" aria-live="polite" title={localizeUi(mobileNotice)}>{localizeUi(mobileNotice)}</span>{validationIssues.length>0&&<button type="button" className="mobileValidation" aria-label={translateUi("etudes.reviewInputIssues")} onClick={()=>setMessage(`${validationIssues[0]}${validationIssues.length>1?formatMessage(ko["etudes.value1More"], { value1: validationIssues.length-1 }):''}`)}><Translation id="etudes.inputReview" />{validationIssues.length}</button>}</>:null;
 const toggleMobileTool=kind=>{const next=mobileSheet===kind?null:kind;setMobileSheet(next);};
 const closeMobileTool=()=>{setMobileSheet(null);};
 const copyLine=()=>{try{playbackController.current?.stop();const next=copyGripToNext(draftRef.current,active);setDraft(next.document);select(next.cursor);setSelectedDuration(next.document.measures[next.cursor.bar].events[next.cursor.event].duration);setMessage(formatMessage(ko["etudes.theFingeringGroupWasValueAtTheNextPositionUsingTheOriginal"], { value1: next.replaced?ko["etudes.overwritten"]:ko["etudes.copied"] }));}catch(error){setMessage(error.message);}};
 const wholeBeat=copy=>{try{playbackController.current?.stop();const next=editWholeBeat(draftRef.current,active,{copy});setDraft(next.document);select(next.cursor);setSelectedDuration(next.document.measures[next.cursor.bar].events[next.cursor.event].duration);setMessage(copy?ko["etudes.copiedTheEntireCurrentBeatToTheNextBeat"]:ko["etudes.clearedTheEntireCurrentBeat"]);}catch(error){setMessage(error.message);}};
 const deleteLine=()=>{playbackController.current?.stop();setDraft(d=>deleteGrip(d,active));setMessage(draft.instrument==='drums'?ko["etudes.deletedAllDrumNotesAtTheCurrentPositionNoteDurationIsUnchanged"]:ko["etudes.clearedTheFingeringOrRestAtTheCurrentPositionNoteDurationIs"]);};
 const mobileTechniques=<MobileScoreSheets anchored kind="note" draft={draft} event={event} techniques={<>{techniqueTools}{!mobile&&fretted&&<DesktopFingeringControls event={event} onChange={(id,key,value)=>setDraft(d=>patchEvent(d,barIndex,eventIndex,e=>({...e,notes:e.notes.map(note=>note.id===id?{...note,[key]:value}:note)})))}/>}</>} onClose={closeMobileTool}/>;
 const removeBar=()=>{try{playbackController.current?.stop();setDraft(d=>deleteMeasure(d,barIndex));setBar(Math.min(barIndex,draft.measures.length-2));setMessage(formatMessage(ko["etudes.deletedBarValueUseUndoToRestoreIt"], { value1: barIndex+1 }));}catch(e){setMessage(e.message);}};
 const resetCurrentBar=()=>{playbackController.current?.stop();setDraft(d=>({...d,measures:d.measures.map((m,i)=>i===barIndex?{...m,events:m.events.map(e=>({...e,notes:[],rest:true,blank:true,tieTo:null,lowerRest:false}))}:m)}));select({...active,event:0,noteId:undefined,target:undefined});setMessage(formatMessage(ko["etudes.resetBarValueUseUndoToRestoreIt"], { value1: barIndex+1 }));};
 const addEmpty=()=>{if(draft.measures.length>=scoreMeasureLimit(draft)){setMessage(scoreMeasureLimitMessage(draft));return;}setDraft(d=>({...d,measures:[...d.measures.slice(0,barIndex+1),blankMeasure(d.meter),...d.measures.slice(barIndex+1)]}));setBar(barIndex+1);};
 const startPdfImport=()=>{cancelDigits();setMobileSheet(null);playbackController.current?.stop();setPdfTabOpen(true);};
 const pdfImportDialog=(pdfTabOpen||pendingOpen?.options.imported)&&<PdfTabImport key="pdf-tab-import" mobile={mobile} target={{instrument:draft.instrument,tuning:draft.tuning,capo:draft.capo}} active={pdfTabOpen} onClose={()=>setPdfTabOpen(false)} onOpen={openPdfDraft}/>;
 const ArrangementDialog=arrangementOpen==='bass'?BassArrangementDialog:GuitarArrangementDialog;
 const arrangementDialog=arrangementOpen&&<ArrangementDialog initialError={arrangementError} document={draft} mobile={mobile} onClose={()=>setArrangementOpen(false)} onApply={next=>{playbackController.current?.stop();setDraft(next,{reconcileImport:false});setView(next.instrument==='piano'?'staff':'both');setTupletSession(null);setTupletMode('off');setDottedMode('off');setRestMode(false);setArrangementOpen(false);select({bar:0,event:0,string:1,mode:next.instrument==='piano'?'staff':'tab'});setMessage(next.bassArrangement?'베이스 반주 편곡본을 열었습니다. 원본은 편곡본 안에 보존되며 실행 취소로 돌아갈 수 있습니다.':next.guitarArrangement?'기타 편곡본을 열었습니다. 원본은 편곡본 안에 보존되며 실행 취소로 돌아갈 수 있습니다.':'보존된 편곡 전 원본을 열었습니다.');}}/>;
 const selectImportReview=(c,target)=>{playbackController.current?.stop();setPlayPosition(null);select(c);const location={kind:'review',cursor:c,label:target?reviewTargetLabel(target):`원본 확인 위치 · ${editorLocationLabel(draftRef.current,c)}`};if(mobile)updateDesktopLocation(location);else setDesktopLocation(location);};
 const confirmPdfMeasure=()=>{try{setDraft(d=>confirmImportedMeasure(d,barIndex));setMessage('현재 마디를 사용자 확인으로 확정했습니다.');if(!mobile)setDesktopLocation({cursor:active,label:`${barIndex+1}마디 원본 확인 완료 · 음표와 리듬은 그대로 유지됩니다.`});return true;}catch(e){setMessage(e.message);return false;}};
 const pitchRepair=staffPitchRepairState(draft);
 const repairStaffPitch=()=>{try{playbackController.current?.stop();setDraft(restoreStaffPitch,{reconcileImport:false});setMessage(translateUi('editor.staffPitchRestored'));}catch(e){setMessage(e.message);}};
 const closePrompt=closing&&<div className="etudeEditorClosePrompt" role="alert"><p><Translation id="etudes.youHaveUnsavedChanges" /></p><button type="button" onClick={()=>save(true)}><Translation id={pendingOpen?"editor.saveAndOpen":"etudes.saveDraftAndClose"} /></button><button type="button" onClick={finishClose}><Translation id={pendingOpen?"editor.discardAndOpen":"etudes.discardChangesAndClose"} /></button><button type="button" onClick={()=>{if(pendingOpen?.options.imported)setPdfTabOpen(true);setClosing(false);setPendingOpen(null);afterClose.current=null;}}><Translation id="etudes.keepEditing" /></button></div>;
 if(mobile)return <dialog ref={dialog} className={"etudeEditor etudeEditor--mobile mobileScoreWorkspace editorDesign"+(!fretted?' mobileNonFrettedWorkspace':'')+(draft.instrument==='drums'?' mobileDrumWorkspace':'')} data-ui="score-editor" aria-label={translateUi("etudes.scoreEditor")} onKeyDown={dialogKeyDown} onCancel={e=>{e.preventDefault();mobileSheet?closeMobileTool():close();}}>
  <header className="mobileScoreHeader"><button type="button" aria-label={translateUi("etudes.backFromScoreEditor")} onClick={close}><ArrowLeft size={21} strokeWidth={1.8}/></button><button type="button" className="mobileScoreSettingsTitle" aria-label={translateUi("etudes.openScoreSettings")} aria-expanded={mobileSheet==='settings'} onClick={()=>{cancelDigits();setMobileSheet(v=>v==='settings'?null:'settings');}} title={draft.title}>{draft.title||translateUi("etudes.newScore")}</button>{historyTools}<MobileScorePdfMenu canSave={Boolean(result.score)} onShow={()=>{cancelDigits();setMobileSheet(null);}} onImport={startPdfImport} onSave={previewPrint}/><button type="button" aria-label={translateUi("etudes.saveScore")} className="etudeEditorSave" onClick={()=>save()}><Translation id="common.save" /></button></header>
  <MobilePdfTabReview document={draft} cursor={active} onSelect={selectImportReview} onConfirm={confirmPdfMeasure} pitchRepair={pitchRepair} onRepairPitch={repairStaffPitch}/>
  <ImportPlaybackNotice playback={playback} mobile={mobile}/>
  {storageNotice&&<div className="mobilePdfTabStorageNotice" role="alert"><span>{storageNotice}</span><button type="button" onClick={()=>save()}>악보실에 저장</button><button type="button" onClick={downloadDraft}>제작 악보 파일로 저장</button><button type="button" aria-label="저장 안내 닫기" onClick={()=>setStorageNotice('')}>닫기</button></div>}
  {sheet}
  {chordNameDialog??<MobileScoreInput arpeggioControls={arpeggioControls} drums={draft.instrument==='drums'} fretted={fretted} pitchInput={pitchInput} {...{tabRhythm,tabBeamPosition,tabShortStems,tabPickingPosition,onTabBeam,onPickingPosition}} openTool={mobileSheet} onTool={toggleMobileTool} onCloseTool={closeMobileTool} techniques={mobileTechniques} repeatBar={draft.measures[barIndex]} repeatIssue={repeatIssues(draft.measures)[0]} onRepeat={applyRepeat} onNavigation={applyNavigation} onResetBar={resetCurrentBar} onDeleteBar={removeBar} canDeleteBar={draft.measures.length>1} feedback={mobileFeedback} cursor={active} event={event} meter={draft.meter} onKey={mobileKey} onCopyBeat={()=>wholeBeat(true)} onDeleteBeat={()=>wholeBeat(false)} onCopyLine={copyLine} onDeleteLine={deleteLine} onBar={delta=>setBar(Math.max(0,Math.min(draft.measures.length-1,barIndex+delta)))} onAddBar={addEmpty} onPick={directPick} onBatch={pattern=>setDraft(d=>applyPicking(d,{pattern,skipLegato:true}))}
   playback={<ScorePlayback drumAudio={draft.instrument==='drums'?{volume:drumVolume,onVolume:setDrumVolume,muted:drumMuted,onMuted:setDrumMuted}:undefined} volume={draft.instrument==='drums'?drumVolume:1} score={playback.score??result.score} disabled={!playback.allowed} dock compact controller={playbackController} startAt={active} onPosition={setPlayPosition} onBpm={bpm=>setDraft(d=>({...d,bpm}))}/>}/> }
  {mobileSheet==='settings'&&<ScoreSaveDialog mode="edit" document={draft} onClose={()=>closeMobileSheet()} onSave={document=>{setDraft(document);closeMobileSheet();}}/>}

  <input ref={file} type="file" accept={SCORE_FILE_ACCEPT} aria-label={translateUi("etudes.chooseScoreFile")} hidden onChange={importFile}/>
  {settings.popup}{instrumentDialog}
  {quickPanel}{saveDialog}{chordDialog}
  {pdfImportDialog}{arrangementDialog}{closePrompt}
 </dialog>;
 const desktopActions=<div className="desktopEditorActions" role="group" aria-label="악보 파일 작업">
  <div className="desktopEditorFileActions">
   <button type="button" aria-label="PDF·사진에서 TAB 초안 생성" title="PDF·JPG·PNG에서 TAB 초안 생성" onClick={startPdfImport}>PDF·사진 → TAB</button>
   <button type="button" aria-label={translateUi("editor.openCreatedScores")} title={translateUi("editor.openCreatedScores")} onClick={openSavedLibrary}><Translation id="app.load" /></button>
   <button type="button" className="desktopPdfSave" disabled={!result.score} onClick={previewPrint}><Printer size={16} aria-hidden="true"/><Translation id="etudes.savePdf" /></button>
  </div>
  <div className="desktopEditorSessionActions">
   <button type="button" className="desktopEditorHelpButton" aria-label={translateUi("editor.help")} title={translateUi("editor.help")} aria-haspopup="dialog" onClick={()=>{cancelDigits();playbackController.current?.stop();setHelpOpen(true);}}><BookOpen size={16} aria-hidden="true"/><Translation id="editor.help" /></button>
   <button type="button" className="etudeEditorSave" onClick={()=>save()}><Translation id="etudes.saveInThisBrowser" /></button>
   <button type="button" onClick={close}><Translation id="common.close" /></button>
  </div>
 </div>;
 return <dialog ref={dialog} className={`etudeEditor editorDesign etudeEditor--${mobile?'mobile':'desktop'}`} data-ui="score-editor" aria-label={translateUi("etudes.scoreEditor")} onKeyDown={dialogKeyDown} onCancel={e=>{e.preventDefault();close();}}>
  <header className="desktopEditorHeader">
   <div className="desktopEditorHeading"><strong>악보 제작실</strong><DesktopPdfTabReview document={draft} cursor={active} onSelect={selectImportReview} onConfirm={confirmPdfMeasure} pitchRepair={pitchRepair} onRepairPitch={repairStaffPitch}/></div>
   {desktopActions}
   <DesktopEditorNotice notice={desktopNotice}/>
  </header>
  <ImportPlaybackNotice playback={playback} mobile={mobile}/>
  {storageNotice&&<div className="pdfTabStorageNotice" role="alert"><span>{storageNotice}</span><button type="button" onClick={()=>save()}>악보실에 저장</button><button type="button" onClick={downloadDraft}>제작 악보 파일로 저장</button><button type="button" aria-label="저장 안내 닫기" onClick={()=>setStorageNotice('')}>닫기</button></div>}
  {mobile?palette:<div className="etudeDesktopToolbarRow">{palette}</div>}
  {mobile?<><nav className="etudeEditorTabs"><button type="button" aria-pressed={tab==='score'} onClick={()=>setTab('score')}><Translation id="etudes.scoreInput" /></button><button type="button" aria-pressed={tab==='properties'} onClick={()=>setTab('properties')}><Translation id="etudes.selectedNoteProperties" /></button></nav>{tab==='score'?<>{sheet}<div className="etudeMobileKeypad">{['←','↑','↓','→','0','1','2','3','4','5','6','7','8','9',ko["common.delete"]].map(k=><button type="button" key={k} onClick={()=>keyDown({key:({'←':'ArrowLeft','→':'ArrowRight','↑':'ArrowUp','↓':'ArrowDown','삭제':'Delete'})[k]??k,target:dialog.current,preventDefault(){}})}>{localizeUi(k)}</button>)}</div></>:controls}</>:<div className="etudeEditorDesktopBody" >{sheet}<aside className="desktopToolColumn" aria-label={translateUi("etudes.scoreInputTools")}><MobileScoreInput arpeggioControls={arpeggioControls} drums={draft.instrument==='drums'} fretted={fretted} pitchInput={pitchInput} {...{tabRhythm,tabBeamPosition,tabShortStems,tabPickingPosition,onTabBeam,onPickingPosition}} desktop desktopPickingControls={<DesktopPickingControls restart={pickRestart} onRestart={setPickRestart} scope={pickScope} onScope={setPickScope} pattern={pickPattern} onPattern={setPickPattern} skipLegato={skipLegato} onSkipLegato={setSkipLegato} measures={draft.measures} currentBar={barIndex} endBar={Math.max(barIndex,Math.min(rangeEnd,draft.measures.length-1))} onEndBar={setRangeEnd} onApply={applyDesktopPicking}/>} openTool={mobileSheet} onTool={toggleMobileTool} onCloseTool={closeMobileTool} techniques={mobileTechniques} repeatBar={draft.measures[barIndex]} repeatIssue={repeatIssues(draft.measures)[0]} onRepeat={applyRepeat} onNavigation={applyNavigation} onResetBar={resetCurrentBar} onDeleteBar={removeBar} canDeleteBar={draft.measures.length>1} feedback={mobileFeedback} cursor={active} event={event} meter={draft.meter} onKey={mobileKey} onCopyBeat={()=>wholeBeat(true)} onDeleteBeat={()=>wholeBeat(false)} onCopyLine={copyLine} onDeleteLine={deleteLine} onBar={delta=>setBar(Math.max(0,Math.min(draft.measures.length-1,barIndex+delta)))} onAddBar={addEmpty} onPick={directPick} onBatch={pattern=>setDraft(d=>applyPicking(d,{pattern,skipLegato:true}))}
/>{batchPanels}<div className="etudeEditorBottom"><ScorePlayback volume={draft.instrument==='drums'?drumVolume:1} score={playback.score??result.score} disabled={!playback.allowed} dock onBpm={bpm=>setDraft(d=>({...d,bpm}))} controller={playbackController} startAt={active} onPosition={setPlayPosition}/>  </div></aside></div>}

  {(result.errors.length>0||result.issues?.length>0)&&<details className="etudeEditorErrors"><summary><Translation id="etudes.inputReviewScoreEditor" />{[...result.errors,...result.issues??[]].length}{playback.preview?<span>건 · 초안 재생 가능 (?는 무음, 미확정 리듬은 임시 배치)</span>:<Translation id="etudes.issuesDraftCanBeSavedPlaybackPaused" />}</summary><ul>{[...result.errors,...result.issues??[]].slice(0,10).map((error,i)=><li key={i}>{localizeUi(error)}</li>)}</ul></details>}
  {helpOpen&&<DesktopScoreEditorHelp instrument={draft.instrument} onClose={()=>setHelpOpen(false)}/> }
  {scoreSettingsOpen&&<ScoreSaveDialog mode="edit" showNotes document={draft} onClose={()=>setScoreSettingsOpen(false)} onSave={document=>{setDraft(document);setScoreSettingsOpen(false);}}/>}
  {settings.popup}{instrumentDialog}
  {quickPanel}{saveDialog}{chordDialog}{chordNameDialog}
  {pdfImportDialog}{arrangementDialog}
  {openLibrary&&<ScoreOpenDialog records={savedScores} onImportFile={importFile} onOpen={openSavedScore} onClose={()=>setOpenLibrary(false)}/>}
  {closePrompt}

 </dialog>;
}
