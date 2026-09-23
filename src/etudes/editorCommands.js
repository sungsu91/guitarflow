import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
import {isFretted} from './scoreInstruments.js';
import {slidePairs} from './slidePairs.js';
import {soundingMidi,effectiveTuning,maxFret} from './scoreTuning.js';
import {NATURAL_HARMONICS,patchEvent,newId,ticksOf,blankEvent,cloneMeasures,moveSamePitch,blankMeasure,isBlankEvent} from './scoreModel.js';
export function deleteMeasure(d,bar){
 if(d.measures.length<=1)throw Error(ko["etudes.aScoreMustContainAtLeastOneBar"]);
 if(!d.measures[bar])return d;
 const removed=d.measures[bar],ids=new Set(removed.events.map(e=>e.id));
 const measures=d.measures.filter((_,i)=>i!==bar).map(m=>m.events.some(e=>(ids.has(e.tieTo)||ids.has(e.slurTo)))?{...m,events:m.events.map(e=>(ids.has(e.tieTo)||ids.has(e.slurTo))?{...e,...(ids.has(e.tieTo)?{tieTo:null}:{}),...(ids.has(e.slurTo)?{slurTo:null}:{})}:e)}:m);
 return {...d,measures,viewSettings:{...d.viewSettings,systemBreaks:(d.viewSettings?.systemBreaks??[]).filter(id=>id!==removed.id)}};
}
// Connections belong to the starting event; reject impossible destinations
// instead of saving a symbol that playback cannot interpret.
export function setNoteConnection(d,c,kind){
 if(!isFretted(d.instrument)&&!['tie','clear'].includes(kind))throw Error(ko["etudes.thisTechniqueIsNotAvailableForThisInstrument"]);
 if(d.instrument==='drums'&&kind==='tie')throw Error(ko["etudes.tiesAreNotAppliedToDrums"]);
 const event=d.measures[c.bar]?.events[c.event],following=d.measures[c.bar]?.events[c.event+1];
 if(!event||event.rest||event.dead||!event.notes.length)throw Error(ko["etudes.selectTheStartingNoteForTheTechnique"]);
 if(kind==='clear')return patchEvent(d,c.bar,c.event,{technique:null,tieTo:null,slurTo:null,vibrato:false,palmMute:false,arpeggio:null,letRing:false,slideOut:null,slideIn:null,notes:event.notes.map(n=>({...n,harmonic:false,bendEffect:null,parenthesized:false}))});
 if(kind==='slide-in-up'||kind==='slide-in-down'){const direction=kind.slice(9);return patchEvent(d,c.bar,c.event,{slideIn:event.slideIn===direction?null:direction});}
 if(kind==='let-ring')return patchEvent(d,c.bar,c.event,{letRing:!event.letRing});
 if(kind==='slide-out-up'||kind==='slide-out-down'){const direction=kind.slice(10);return patchEvent(d,c.bar,c.event,{slideOut:event.slideOut===direction?null:direction});}
 if(kind==='parentheses'||kind.startsWith('bend-')){
  const tone=event.notes.find(n=>n.string===c.string);if(!tone||tone.dead)throw Error(ko["etudes.selectANoteOnTheStringToMark"]);
  if(kind.startsWith('bend-')&&tone.harmonic)throw Error(ko["etudes.removeTheNaturalHarmonicBeforeApplyingABend"]);
  const [phase,rawAmount]=kind.slice(5).split(':');const amount=rawAmount===undefined?2:Number(rawAmount);if(![.5,1,2].includes(amount))throw Error(ko["etudes.checkTheBendInterval"]);if(kind!=='parentheses'&&!['up','hold','release','up-release','prebend'].includes(phase))throw Error(ko["etudes.checkTheBendShape"]);
  return patchEvent(d,c.bar,c.event,{notes:event.notes.map(n=>n!==tone?n:kind==='parentheses'?{...n,parenthesized:!n.parenthesized}:{...n,bendEffect:n.bendEffect?.phase===phase&&n.bendEffect?.amount===amount?null:{amount,phase}})});
 }
 if(kind==='palmMute')return patchEvent(d,c.bar,c.event,{palmMute:!event.palmMute});
 if(kind==='vibrato')return patchEvent(d,c.bar,c.event,{vibrato:!event.vibrato});
 if(kind==='harmonic'){
  const tone=event.notes.find(n=>n.string===c.string);if(!tone)throw Error(ko["etudes.selectAFretOnTheStringToMarkAsAHarmonic"]);
  if(!tone.harmonic&&tone.bendEffect)throw Error(ko["etudes.removeTheBendBeforeApplyingANaturalHarmonic"]);
  if(!tone.harmonic&&!NATURAL_HARMONICS[tone.fret])throw Error(ko["etudes.chooseFret34579121619Or24"]);
  return patchEvent(d,c.bar,c.event,{notes:event.notes.map(n=>n===tone?{...n,harmonic:!n.harmonic}:n)});
 }
 if(kind==='arpeggio-up'||kind==='arpeggio-down'){
  if(event.notes.length<2)throw Error(ko["etudes.enterSimultaneousNotesOnAtLeastTwoStringsAtTheSamePosition"]);
  const direction=kind.slice(9);return patchEvent(d,c.bar,c.event,{arpeggio:event.arpeggio===direction?null:direction});
 }
 if(kind==='tie'){
  if(event.tieTo)return patchEvent(d,c.bar,c.event,{tieTo:null});
  const next=following??d.measures[c.bar+1]?.events[0],pitches=e=>e.notes.map(n=>isFretted(d.instrument)?`${n.string}:${n.fret}:${Boolean(n.harmonic)}`:String(n.midi)).sort().join('|');
  if(!next||next.rest||next.dead||pitches(event)!==pitches(next))throw Error(ko["etudes.aTieConnectsToTheImmediatelyFollowingNoteOfTheSamePitch"]);
  return patchEvent(d,c.bar,c.event,{tieTo:next.id,technique:null});
 }
 if(!['H','P','S'].includes(kind))throw Error(ko["etudes.thisConnectingTechniqueIsNotSupported"]);
 if(event.technique===kind)return patchEvent(d,c.bar,c.event,{technique:null});
 if(kind==='S'){
  if(!slidePairs(event,following).length||following.onset!==event.onset+ticksOf(event))throw Error(ko["etudes.enterTwoConsecutiveNotesOrChordsOnTheSameStringsWithinOne"]);
  return patchEvent(d,c.bar,c.event,{technique:kind,tieTo:null});
 }
 if(event.notes.length!==1||!following||following.rest||following.dead||following.notes.length!==1||following.notes[0].string!==event.notes[0].string||following.onset!==event.onset+ticksOf(event))throw Error(ko["etudes.firstEnterTwoConsecutiveSingleNotesOnTheSameStringWithinOne"]);
 const difference=following.notes[0].fret-event.notes[0].fret;
 if(!difference||(kind==='H'&&difference<0)||(kind==='P'&&difference>0))throw Error(kind==='H'?ko["etudes.hConnectsALowerFretToAHigherFret"]:kind==='P'?ko["etudes.pConnectsAHigherFretToALowerFret"]:ko["etudes.aSlideConnectsDifferentFrets"]);
 return patchEvent(d,c.bar,c.event,{technique:kind,tieTo:null});
}
// Older documents stored mute on the whole event. Preserve those marks on
// each existing string before editing just one string.
const stringTones=e=>e.dead?e.notes.map(n=>({...n,dead:n.dead??true})):e.notes;
export function enterFret(d,c,fret){if(!isFretted(d.instrument))throw Error(ko["etudes.useTheOnScreenKeyboardOrDrumPads"]);if(!Number.isInteger(fret)||fret<0||fret+(d.capo??0)>maxFret(d))throw Error(formatMessage(ko["etudes.theActualFretIncludingTheCapoMustBeValueOrLower"], { value1: maxFret(d) }));return patchEvent(d,c.bar,c.event,e=>{const existing=stringTones(e),old=existing.find(n=>n.id===c.noteId&&n.unplaced)??existing.find(n=>n.string===c.string);const tone={...(old??{id:newId('tone')}),string:c.string,fret,locked:true};delete tone.dead;delete tone.spelling;delete tone.unplaced;delete tone.previousFingering;delete tone.outsidePreferred;if(old?.fret!==fret)delete tone.harmonic;const notes=e.rest?[tone]:old?existing.map(n=>n===old?tone:n):[...existing,tone];return {...e,dead:false,rest:false,blank:false,notes};});}
export function enterMutedTone(d,c,duration='4'){
 // Replacing a fret with X never changes an already entered event's rhythm.
 const prepared=entryDocument(d,c,duration);
 return patchEvent(prepared,c.bar,c.event,e=>{
  const existing=stringTones(e),old=existing.find(n=>n.string===c.string);
  const tone={...(old??{id:newId('tone'),fret:0}),string:c.string,locked:true,dead:true};delete tone.harmonic;delete tone.bendEffect;
  const notes=e.rest?[tone]:old?existing.map(n=>n===old?tone:n):[...existing,tone];
  return {...e,dead:false,rest:false,blank:false,notes,...(notes.every(n=>n.dead)?{technique:null,tieTo:null}: {})};
 });
}

// Duration edits consume vacant time only, retaining later onsets and IDs.
const vacant=e=>isBlankEvent(e)&&!e.tuplet;
function retimeEvent(d,c,duration,dotted=false){
 const m=d.measures[c.bar],e=m?.events[c.event];if(!e)return d;
 if(e.duration===duration&&Boolean(e.dotted)===dotted)return d;
 if(e.tuplet)throw Error(ko["etudes.removeTheTripletGroupBeforeChangingTheDuration"]);
 const end=e.onset+ticksOf({duration,dotted}),capacity=d.meter[0]*1920/d.meter[1];
 if(end>capacity)throw Error(ko["etudes.thisNoteDurationExtendsBeyondTheEndOfTheBar"]);
 let stop=c.event+1,covered=Math.min(e.onset+ticksOf(e),m.events[stop]?.onset??capacity);
 // Empty time need not have a placeholder. Only an entered sound/rest or a
 // reserved tuplet occupies it; stale picking on a blank does not add time.
 while(stop<m.events.length&&m.events[stop].onset<end){
  const next=m.events[stop];
  if(!vacant(next))throw Error(formatMessage(ko["etudes.barValueBeatValueThisOverlapsAFollowingNoteRestOrTriplet"], { value1: c.bar+1, value2: next.onset/480+1 }));
  covered=Math.max(covered,next.onset+ticksOf(next));stop++;
 }
 covered=Math.max(end,Math.min(covered,m.events[stop]?.onset??capacity));
 const tail=[];let at=end;
 // Reuse this subdivision when shortening; split an overshot blank if needed.
 const values=['1','2','4','8','16','32'].filter(v=>Number(v)>=Number(duration));
 for(const value of values)while(at+ticksOf({duration:value})<=covered){tail.push(blankEvent(at,value));at+=ticksOf({duration:value});}
 if(at!==covered)throw Error(ko["etudes.theSelectedDurationCannotBeUsedAtThisPosition"]);
 const changed={...e,duration};if(dotted)changed.dotted=true;else delete changed.dotted;
 const events=[...m.events.slice(0,c.event),changed,...tail,...m.events.slice(stop)];
 if(events.length>64)throw Error(ko["etudes.aBarCanContainUpTo64InputPositions"]);
 return {...d,measures:d.measures.map((bar,i)=>i===c.bar?{...bar,events}:bar)};
}
export function setEventDuration(d,c,duration,dotted=false){
 if(!['1','2','4','8','16'].includes(String(duration)))throw Error(ko["etudes.thisNoteDurationIsNotSupported"]);
 return retimeEvent(d,c,String(duration),dotted);
}
// Sequential TAB editing keeps the following entered notes in sequence. Unlike
// the fixed-time properties editor, changing a value moves later notes rather
// than leaving a hidden slot or overwriting the next sound.
export function setEntryDuration(d,c,duration){
 if(!isFretted(d.instrument))return setEventDuration(d,c,duration);
 if(!['1','2','4','8','16'].includes(String(duration)))throw Error(ko["etudes.thisNoteDurationIsNotSupported"]);
 const measure=d.measures[c.bar],event=measure.events[c.event];
 // Filling a vacant position must not pull an already entered later beat back.
 // Only changing an existing sound/rest is a sequential timing edit.
 if(vacant(event))return setEventDuration(d,c,duration);
 if(event.duration===String(duration)&&!event.dotted)return d;
 if(event.tuplet)throw Error(ko["etudes.removeTheTripletGroupBeforeChangingTheDuration"]);
 const delta=ticksOf({duration})-ticksOf(event),capacity=d.meter[0]*1920/d.meter[1];
 let last=measure.events.length-1;
 while(last>c.event&&vacant(measure.events[last]))last--;
 const following=measure.events.slice(c.event+1,last+1);
 if(following.some(e=>e.tuplet))throw Error(ko["etudes.theFollowingTripletGroupCannotBeMoved"]);
 const end=last===c.event?event.onset+ticksOf({duration}):measure.events[last].onset+ticksOf(measure.events[last])+delta;
 if(end>capacity)throw Error(ko["etudes.keepingTheFollowingNotesWouldExceedTheBarLengthMoveThemTo"]);
 const changed={...event,duration:String(duration)};delete changed.dotted;
 const events=[...measure.events.slice(0,c.event),changed,...following.map(e=>({...e,onset:e.onset+delta}))];
 let onset=end;
 while(onset<capacity){
  const value=['4','8','16','32'].find(value=>onset%ticksOf({duration:value})===0&&onset+ticksOf({duration:value})<=capacity);
  if(!value)break;
  events.push(blankEvent(onset,value));onset+=ticksOf({duration:value});
 }
 if(onset!==capacity)throw Error(ko["etudes.theSelectedDurationCannotBeUsedAtThisPosition"]);
 return {...d,measures:d.measures.map((m,i)=>i===c.bar?{...m,events}:m)};
}
export function setDotted(d,c,dotted=true){
 const e=d.measures[c.bar]?.events[c.event];
 if(!e||e.tuplet)throw Error(ko["etudes.tripletsAndDottedNotesCannotBeEnteredTogether"]);
 return retimeEvent(d,c,e.duration,dotted);
}
export function setDottedEighth(d,c,dotted=true){
 const e=d.measures[c.bar]?.events[c.event];
 if(!e||e.duration!=='8'||e.tuplet)throw Error(ko["etudes.selectARegularEighthNoteBeforeChoosingADottedEighth"]);
 return retimeEvent(d,c,'8',dotted);
}
function entryDocument(d,c,duration){
 const e=d.measures[c.bar]?.events[c.event];
 return e&&isBlankEvent(e)&&!e.dotted&&!e.tuplet?setEventDuration(d,c,duration):d;
}
export function enterFretWithDuration(d,c,fret,duration){
 // Editing a fret or adding another string never changes an entered rhythm.
 return enterFret(entryDocument(d,c,duration),c,fret);
}
export function setRestWithDuration(d,c,duration){return setRest(entryDocument(d,c,duration),c);}
// Digits belong to the selected position until navigation or another edit.
// No timeout or separate mode: 1 followed by 2 always composes fret 12.
export function resolveFretInput(previous,key,location){
 const same=previous?.location===location;
 const combined=Boolean(same&&/^[12]$/.test(previous.text)&&Number(previous.text+key)<=24);
 const value=combined?Number(previous.text+key):Number(key);
 return {value,combined,text:String(value),location};
}
export function deleteTone(d,c){
 if(c.lowerRest)return patchEvent(d,c.bar,c.event,{lowerRest:false});
 const event=d.measures[c.bar]?.events[c.event];
 const selected=n=>!isFretted(d.instrument)?(c.noteId&&event?.notes.some(t=>t.id===c.noteId)?n.id===c.noteId:n.midi===(event?.notes.some(t=>t.midi===c.midi)?c.midi:event?.notes[0]?.midi)):c.noteId&&event?.notes.some(t=>t.id===c.noteId)?n.id===c.noteId:n.string===c.string;
 // Silence keeps its time slot. An untouched slot is not an editable rest.
 if(!event||isBlankEvent(event)||(!event.rest&&!event.notes.some(selected)))return d;
 let next=patchEvent(d,c.bar,c.event,e=>{const notes=e.rest?[]:e.notes.filter(n=>!selected(n));return {...e,notes,rest:!notes.length,blank:!notes.length,technique:notes.length?e.technique:null,...(!notes.length?{pickStroke:null,tieTo:null,slurTo:null,dead:false,vibrato:false,palmMute:false,arpeggio:null,letRing:false,slideOut:null,slideIn:null}:{})};});
 if(!isBlankEvent(next.measures[c.bar].events[c.event]))return next;
 // Remove connections ending at the deleted sound, without moving any time slots.
 const previous=c.event?d.measures[c.bar].events[c.event-1]:d.measures[c.bar-1]?.events.at(-1);
 d.measures.forEach((bar,b)=>bar.events.forEach((e,i)=>{const tie=e.tieTo===event.id,slur=e.slurTo===event.id,technique=e===previous&&e.technique;if(tie||slur||technique)next=patchEvent(next,b,i,{...(tie?{tieTo:null}:{}),...(slur?{slurTo:null}:{}),...(technique?{technique:null}:{})});}));
 return next;
}
export function moveFingering(d,c,direction){return patchEvent(d,c.bar,c.event,e=>{const tone=e.notes.find(n=>n.string===c.string);if(!tone)return e;const next=moveSamePitch(tone,direction,effectiveTuning(d));if(next.fret+(d.capo??0)>maxFret(d)||e.notes.some(n=>n!==tone&&n.string===next.string))return e;return {...e,notes:e.notes.map(n=>n===tone?next:n)};});}
export function setRest(d,c){return patchEvent(d,c.bar,c.event,{rest:true,blank:false,notes:[],technique:null,pickStroke:null,tieTo:null,dead:false,vibrato:false,palmMute:false,arpeggio:null,letRing:false,slideOut:null,slideIn:null});}
export function durationStep(d,c,step){const values=['1','2','4','8','16'];const event=d.measures[c.bar].events[c.event];return setEventDuration(d,c,values[Math.max(0,Math.min(4,values.indexOf(event.duration)+step))]);}
export function insertEvent(d,c,{duplicate=false,before=false}={}){const m=d.measures[c.bar],e=m.events[c.event];if(e.tuplet)throw Error(ko["etudes.beatsCannotBeInsertedInsideATripletGroup"]);if(m.events.length>=64)throw Error(ko["etudes.aBarCanContainUpTo64Beats"]);const length=ticksOf(e),at=c.event+(before?0:1),onset=e.onset+(before?0:length),added=duplicate?{...structuredClone(e),id:newId('event'),onset,notes:e.notes.map(n=>({...n,id:newId('tone')}))}:{...blankEvent(onset,e.duration),...(e.dotted?{dotted:true}:{})};const events=[...m.events.slice(0,at),added,...m.events.slice(at).map(n=>({...n,onset:n.onset+length}))];return {...d,measures:d.measures.map((bar,i)=>i===c.bar?{...bar,events}:bar)};}
// Dragging is an explicit local edit, never a rerun of fingering generation.
// Destination slots retain their timing; occupied slots are never overwritten.
export function moveTone(d,from,to){
 const source=d.measures[from.bar]?.events[from.event],target=d.measures[to.bar]?.events[to.event];
 const tone=source?.notes.find(n=>n.string===from.string);if(!tone||!target)throw Error(ko["etudes.selectTheNoteToMoveAndItsDestinationBeat"]);
 const same=source===target;
 let moved={...tone,locked:true};
 if(to.mode==='staff'){
  const fret=to.midi-effectiveTuning(d)[tone.string-1];if(!Number.isInteger(fret)||fret<0||fret+(d.capo??0)>maxFret(d))throw Error(ko["etudes.thisPitchCannotBePlayedOnTheCurrentStringChooseAString"]);
  moved.fret=fret;
 }else{if(!Number.isInteger(to.string)||to.string<1||to.string>d.tuning.length)throw Error(formatMessage(ko["etudes.placeItOnTabString1Value"], { value1: d.tuning.length }));moved.string=to.string;}
 if(same&&moved.string===tone.string&&moved.fret===tone.fret)return d;
 const flat=d.measures.flatMap(m=>m.events),connected=e=>{const i=flat.indexOf(e),previous=flat[i-1];return Boolean(e.tieTo||e.technique||previous?.tieTo===e.id||previous?.technique);};
 if(connected(source)||(!same&&connected(target)))throw Error(ko["etudes.removeTiesOrHPSlConnectionsBeforeMovingTheNote"]);
 delete moved.spelling;
 if(same){if(source.notes.some(n=>n!==tone&&n.string===moved.string))throw Error(ko["etudes.thereIsAlreadyANoteOnThisString"]);return patchEvent(d,from.bar,from.event,{notes:source.notes.map(n=>n===tone?moved:n)});}
 if(!target.rest||target.notes.length)throw Error(ko["etudes.thisBeatAlreadyContainsANoteMoveToARestOfThe"]);
 if(ticksOf(source)!==ticksOf(target))throw Error(ko["etudes.moveToARestOfTheSameDurationUseSplitBeatOr"]);
 const remaining=source.notes.filter(n=>n!==tone);
 let next=patchEvent(d,from.bar,from.event,{notes:remaining,rest:!remaining.length,blank:!remaining.length,...(!remaining.length?{pickStroke:null}: {})});
 next=patchEvent(next,to.bar,to.event,{notes:[moved],rest:false,blank:false,pickStroke:source.pickStroke??null});return next;
}
export function splitEvent(d,c){const m=d.measures[c.bar],e=m.events[c.event];if(e.dotted)throw Error(ko["etudes.removeTheDottedEighthBeforeSplittingTheBeat"]);if(e.tuplet)throw Error(ko["etudes.removeTheTripletGroupBeforeSplittingTheBeat"]);if(Number(e.duration)>=16||m.events.length>=64)throw Error(ko["etudes.thisBeatCannotBeDividedFurther"]);if(e.tieTo||e.technique)throw Error(ko["etudes.removeTechniquesAndTiesBeforeSplittingConnectedBeats"]);const duration=String(Number(e.duration)*2),events=[...m.events.slice(0,c.event),{...e,duration},blankEvent(e.onset+ticksOf(e)/2,duration),...m.events.slice(c.event+1)];return {...d,measures:d.measures.map((bar,i)=>i===c.bar?{...bar,events}:bar)};}
export function applyPicking(d,{start=0,end=d.measures.length-1,pattern='alternate-down',skipLegato=true}={}){
 if(!['alternate-down','alternate-up','down','up','clear'].includes(pattern))throw Error(ko["etudes.chooseAPickingPattern"]);
 const lo=Math.min(start,end),hi=Math.max(start,end);let count=0,previous=null;
 const measures=d.measures.map((m,b)=>{const events=m.events.map(e=>{const connected=previous&&!previous.rest&&(previous.tieTo===e.id||(skipLegato&&previous.technique&&['H','P','S'].includes(previous.technique)));previous=e;if(b<lo||b>hi)return e;let pickStroke=null;
  if(pattern!=='clear'&&!e.rest&&!connected){pickStroke=pattern==='up'||pattern==='down'?pattern:(count%2===0)===(pattern==='alternate-down')?'down':'up';count++;}
  return (e.pickStroke??null)===pickStroke?e:{...e,pickStroke};});return events.every((e,i)=>e===m.events[i])?m:{...m,events};});
 return measures.every((m,i)=>m===d.measures[i])?d:{...d,measures};
}
export function copyBars(d,start,end){return d.measures.slice(Math.min(start,end),Math.max(start,end)+1).map(m=>structuredClone(m));}
export function pasteBars(d,after,bars){if(d.measures.length+bars.length>64)throw Error(ko["etudes.theMaximumIs64Bars"]);return {...d,measures:[...d.measures.slice(0,after+1),...cloneMeasures(bars),...d.measures.slice(after+1)]};}
export function cursorStep(d,c,direction){let bar=c.bar,event=c.event+direction;if(event<0&&bar>0){bar--;event=d.measures[bar].events.length-1;}if(event>=d.measures[bar].events.length&&bar<d.measures.length-1){bar++;event=0;}return {...c,bar,event:Math.max(0,Math.min(d.measures[bar].events.length-1,event))};}
export function inputDigits(previous,key,location,time,windowMs=700){const combined=previous&&previous.location===location&&time-previous.time<windowMs&&previous.text.length===1?Number(previous.text+key):99;const value=combined<=24?combined:Number(key);return {value,text:combined<=24?String(combined):key,time,location};}

// Only explicit continued entry appends a measure; browsing and picking do not.
export function nextEntry(d,c){const next=cursorStep(d,c,1);if(next.bar!==c.bar||next.event!==c.event)return {document:d,cursor:next};
 const e=d.measures[c.bar].events[c.event],capacity=d.meter[0]*1920/d.meter[1];
 if(e.onset+ticksOf(e)!==capacity||d.measures.length>=64)return {document:d,cursor:c};
 return {document:{...d,measures:[...d.measures,blankMeasure(d.meter)]},cursor:{...c,bar:c.bar+1,event:0}};
}
