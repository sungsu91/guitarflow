import {blankEvent,compileDocumentV2,ticksOf} from './scoreModel.js';
import {measureMeters,meterTicks} from './scoreMeters.js';

export const hasImportedTab=document=>Boolean(document?.pdfTabImport||document?.measures?.some(m=>m.pdfImport||m.events.some(e=>e.pdfImport)));

// Review markers describe recognition confidence, not whether a known fret can
// sound. Validate a temporary copy; never mark the user's source as reviewed.
// Missing time is silence. Overlaps, invalid pitches/ties and other structural
// problems remain playback blockers, including in an imported draft.
export function scorePlaybackReadiness(document,compiled){
  if(!compiled?.score||compiled.errors.length)return {allowed:false,preview:false};
  if(!compiled.issues?.length)return {allowed:true,preview:false};
  if(!hasImportedTab(document))return {allowed:false,preview:false};
  const meters=measureMeters(document),copy={...document,measures:[]};
  for(const [i,bar] of document.measures.entries()){
    const events=[],capacity=meterTicks(meters[i]);let at=0;
    const fill=end=>{
      while(at<end){
        const duration=['1','2','4','8','16','32'].find(d=>1920/Number(d)<=end-at);
        if(!duration)return false;
        events.push(blankEvent(at,duration));at+=1920/Number(duration);
      }
      return at===end;
    };
    for(const event of bar.events){
      if(event.onset<at||event.onset+ticksOf(event)>capacity||!fill(event.onset))return {allowed:false,preview:false};
      const {pdfImport,...clean}=event;events.push(clean);at+=ticksOf(event);
    }
    if(!fill(capacity))return {allowed:false,preview:false};
    const {pdfImport,...clean}=bar;copy.measures.push({...clean,events});
  }
  const checked=compileDocumentV2(copy);
  const allowed=Boolean(checked.score)&&!checked.errors.length&&!checked.issues.length;
  return {allowed,preview:allowed};
}
