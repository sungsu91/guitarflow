import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
import {getTrack} from './tracks.js';
import {parseChord,NATURAL} from './notationData.js';
const levels=[ko["etudes.beginner"],ko["etudes.intermediate"],ko["etudes.advanced"]];
const pureTriads=new Set(['triad-three-strings','triad-eighth-answer','triad-major-minor','triad-cross','triad-engine']);
const sevenths=new Set(['jazz-seventh','seventh-weave','codetone-guide-tones']);
export function educationIssues(score){
 const errors=[];
 const needsChord=pureTriads.has(score.templateId)||sevenths.has(score.templateId)||score.templateId==='pop-chord-route';
 score.measures.forEach((bar,b)=>bar.forEach((e,i)=>{if(e.rest)return;const chord=needsChord&&score.harmony?.[b]?parseChord(score.harmony[b]):null;
  let allowed=null;
  if(pureTriads.has(score.templateId))allowed=chord??{pc:NATURAL[score.root],intervals:[0,4,7]};
  if(sevenths.has(score.templateId))allowed=chord??{pc:NATURAL[score.root],intervals:[0,4,7,11]};
  if(score.templateId==='pop-chord-route'&&Number(e.duration)<=4)allowed=chord;
  if(allowed)for(const n of e.tones??[e])if(!allowed.intervals.includes((n.midi-allowed.pc+120)%12))errors.push(formatMessage(ko["etudes.barValueNoteValueChordToneDoesNotMatchTheLearningObjective"], { value1: b+1, value2: i+1 }));
 }));
 if(score.templateId==='blues-burst')score.measures.forEach((bar,b)=>{const chord=parseChord(score.harmony[b]),last=bar.filter(n=>!n.rest).at(-1);if(!chord.intervals.includes((last.midi-chord.pc+120)%12))errors.push(formatMessage(ko["etudes.barValueChordTargetNoteMismatch"], { value1: b+1 }));});
 return errors;
}
const techniqueInstructions={벤딩:ko["etudes.bendToTheIndicatedHalfStepOrWholeStepTargetOnA"],해머온:ko["etudes.pickOnlyTheNoteBeforeHWithoutPickingTheDestinationAgainPick"],풀오프:ko["etudes.fretTheLowerPNoteInAdvancePickOnlyTheStartingNote"],슬라이드:ko["etudes.connectTheStartingAndEndingSlFretsWithTheSameFingerDo"],레가토:ko["etudes.pickOnlyTheFirstNoteOfEachHPGroupAndAny"],스케일:ko["etudes.keepPickingMovementsSmallAtStringChangesKeepFingersCloseForSemitones"],펜타토닉:ko["etudes.prepareYourIndexAndRingOrLittleFingersForEachIntervalUse"],릭:ko["etudes.holdLongDestinationNotesForTheirFullLengthThenMuteJustBefore"],'코드톤 런':ko["etudes.firstBeAbleToNameCEGAs135"],아르페지오:ko["etudes.setYourFingersFromTheChordDiagramFirstUsePForBass"]};
const describe=event=>event.rest?ko["etudes.rest"]:(event.tones??[event]).map(n=>formatMessage(ko["etudes.stringValueFretValueValueValue"], { value1: n.string, value2: n.fret, value3: n.pitch.letter, value4: n.pitch.alter===1?'♯':n.pitch.alter===-1?'♭':'' })).join(' + ');
export function lessonPedagogy(score){
 const track=getTrack(score.type),stage=levels.indexOf(score.level),course=track.stages[stage][1],position=course.indexOf(score.templateId);
 const prior=position>0?course[position-1]:stage>0?track.stages[stage-1][1].at(-1):null;
 const prerequisites=prior?[prior]:score.type===ko["etudes.legato"]?['hammer-start','pull-return']:score.type===ko["etudes.licks"]?['first-path']:[];
 if(score.templateId==='lick-legato-answer')prerequisites.push('hammer-three','pull-three');
 if(score.templateId==='legato-phrase')prerequisites.push('slide-path');
 const keyBars=[0,Math.min(3,score.measures.length-1),score.measures.length-1].map(b=>{
  const bar=score.measures[b],link=bar.findIndex(n=>n.technique),rest=bar.findIndex(n=>n.rest),pinch=bar.findIndex(n=>n.tones);
  const i=link>=0?link:pinch>=0?pinch:rest>=0?Math.max(0,rest-1):0;
  return {bar:b+1,event:i+1,text:`${describe(bar[i])}${bar[i+1]?` → ${describe(bar[i+1])}`:''}${bar[i].technique?` (${bar[i].technique})`:''}${score.harmony?.[b]?` · ${score.harmony[b]}`:''}`};
 });
 const links=score.measures.flatMap((bar,b)=>bar.flatMap((e,i)=>e.technique?[{bar:b+1,event:i+1,kind:e.technique}]:[]));
 const restBars=score.measures.flatMap((bar,b)=>bar.some(e=>e.rest)?[b+1]:[]);
 return {objective:score.purpose,prerequisites,preparation:track.prerequisite,instructions:techniqueInstructions[score.type],keyBars,links,tempo:{start:Math.max(30,score.bpm-12),target:score.bpm},
  checks:[formatMessage(ko["etudes.connectValueInBarValueNoteValueWithEvenTiming"], { value1: keyBars[0].bar, value2: keyBars[0].event, value3: keyBars[0].text }),links.length?formatMessage(ko["etudes.keepConnectedValueNotesFromLosingVolumeAndResumePickingOnUnmarked"], { value1: [...new Set(links.map(l=>l.kind))].join('·') }):score.accompaniment?ko["etudes.soundBassAndTrebleTogetherOnTheDownbeatAndDistinguishThemFrom"]:formatMessage(ko["etudes.maintainFingeringAndNoteLengthThroughValueInTheFinalBar"], { value1: describe(score.measures.at(-1).filter(n=>!n.rest).at(-1)) }),restBars.length?formatMessage(ko["etudes.muteDuringTheRestInBarValueWithoutMissingTheNextBeat"], { value1: restBars.join('·') }):ko["etudes.maintainTheMainPulseAndVolumeThroughChangesInNoteDensityAnd"]],
  review:ko["etudes.automatedPitchRhythmAndNotationChecksPassedLiveGuitarPerformanceReviewNeeded"]};
}
