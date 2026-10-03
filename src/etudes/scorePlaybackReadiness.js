import {blankEvent,compileDocumentV2,ticksOf} from './scoreModel.js';
import {measureMeters,meterTicks} from './scoreMeters.js';

export const hasImportedTab=document=>Boolean(document?.pdfTabImport||document?.measures?.some(m=>m.pdfImport||m.events.some(e=>e.pdfImport)));

// Review markers describe recognition confidence, not whether a known fret can
// sound. Validate a temporary copy; never mark the user's source as reviewed.
// Missing time is silence. An overfull, unreviewed staff-import bar can be
// silent in a separate preview score; never change or approve its source.
// Overlaps, invalid pitches and other structural failures remain blockers.
export function scorePlaybackReadiness(document,compiled){
  if(!compiled?.score||compiled.errors.length)return {allowed:false,preview:false};
  if(!compiled.issues?.length)return {allowed:true,preview:false};
  if(!hasImportedTab(document))return {allowed:false,preview:false};
  const meters=measureMeters(document),copy={...document,measures:[]},mutedMeasures=[];
  for(const [i,bar] of document.measures.entries()){
    const events=[],capacity=meterTicks(meters[i]);let at=0,end=0;
    for(const event of bar.events){
      if(event.onset<end)return {allowed:false,preview:false};
      end=event.onset+ticksOf(event);
    }
    const overfull=end>capacity;
    if(overfull&&(!bar.pdfImport?.source?.notation||!bar.pdfImport?.needsReview))return {allowed:false,preview:false};
    if(overfull)mutedMeasures.push(i);
    const fill=end=>{
      while(at<end){
        const duration=['1','2','4','8','16','32'].find(d=>1920/Number(d)<=end-at);
        if(!duration)return false;
        events.push({...blankEvent(at,duration),...(overfull?{blank:false}:{})});at+=1920/Number(duration);
      }
      return at===end;
    };
    for(const event of overfull?[]:bar.events){
      if(event.onset<at||event.onset+ticksOf(event)>capacity||!fill(event.onset))return {allowed:false,preview:false};
      const {pdfImport,...clean}=event;events.push(clean);at+=ticksOf(event);
    }
    if(!fill(capacity))return {allowed:false,preview:false};
    const {pdfImport,...clean}=bar;copy.measures.push({...clean,events});
  }
  const checked=compileDocumentV2(copy);
  const allowed=Boolean(checked.score)&&!checked.errors.length&&!checked.issues.length&&mutedMeasures.length<document.measures.length;
  if(!mutedMeasures.length)return {allowed,preview:allowed};
  return {allowed,preview:allowed,mutedMeasures,...(allowed?{score:{...compiled.score,measures:compiled.score.measures.map((bar,i)=>mutedMeasures.includes(i)?checked.score.measures[i]:bar)}}:{})};
}
