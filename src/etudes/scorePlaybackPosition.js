import {performedMeasures} from './scoreMeters.js';
import {ticksOf} from './scoreModel.js';

// The performed route comes from the audio timeline, including repeat visits.
export function playbackSlots(score, order) {
  return performedMeasures(score,order).flatMap(({bar,visit,meter,capacity,barStart})=>{
    let next=0;
    return score.measures[bar].map((note,event)=>{
      const onset=note.onset??next;next=onset+ticksOf(note);
      return {bar,event,visit,meter,capacity,barStart,tick:barStart+onset,duration:ticksOf(note)};
    });
  });
}

export function slotAtTick(slots,tick) {
  let low=0,high=slots.length;
  while(low<high){const middle=(low+high)>>>1;if(slots[middle].tick<=tick)low=middle+1;else high=middle;}
  return slots[Math.max(0,low-1)]??null;
}

export function seekTick(slots,position) {
  if(Number.isFinite(position.timelineTick))return Math.max(0,position.timelineTick);
  return (slots.find(s=>s.bar===position.bar&&s.event===(position.event??0)&&(position.visit==null||s.visit===position.visit))??slots[0])?.tick??0;
}
