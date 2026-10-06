import {ticksOf} from '../../etudes/scoreModel.js';
import {soundingMidi} from '../../etudes/scoreTuning.js';
import {importOctaveShift} from './importTarget.js';
import {hasCompleteStaffRhythm} from '../../omr/staffRecognition.js';

export function pairedNotationSystems(systems,tabs){
  return tabs.flatMap(tab=>{
    const candidates=systems.filter(s=>{
      const staff=s.staff,g=Math.max(staff.spacing,tab.spacing);
      return staff.y+staff.height<tab.y&&tab.y-staff.y-staff.height<g*16&&
        !tabs.some(t=>t!==tab&&t.y>staff.y&&t.y<tab.y)&&
        Math.abs(staff.x-tab.x)<g*1.2&&Math.abs(staff.x+staff.width-tab.x-tab.width)<g*1.2&&
        s.measures.length===tab.measures.length&&s.measures.every((m,i)=>Math.abs(m.x-tab.measures[i].x)<g*1.2&&Math.abs(m.x+m.width-tab.measures[i].x-tab.measures[i].width)<g*1.2);
    });
    return candidates.length===1?[{tab,system:candidates[0]}]:[];
  });
}

const pitches=notes=>notes.map(n=>n.midi).sort((a,b)=>a-b);
const timeline=events=>{let at=0;return events.map(e=>{const onset=at;at+=e.duration?ticksOf(e):0;return {event:e,onset};});};

// Additional observations never replace TAB frets or rhythm. Run on the final
// zoom-selected page, comparing musical onset/duration rather than array index.
export function applyPairedNotationChecks(page,target){
  if(!page.pairedNotation?.length)return page;
  const shift=importOctaveShift(target);
  const result=structuredClone(page);
  for(const evidence of result.pairedNotation){
    if(!['clef-G2','clef-F4'].includes(evidence.parsed.clef))continue;
    const tab=result.staffs.find(s=>Math.abs(s.y/result.height-evidence.tabY)<.005);
    if(!tab||tab.measures.length!==evidence.parsed.measures.length)continue;
    for(const [i,bar] of evidence.parsed.measures.entries()){
      const measure=tab.measures[i];
      if(!hasCompleteStaffRhythm(bar)||!measure.rhythmValid||measure.meter.join('/')!==bar.meter.join('/'))continue;
      const expected=timeline(bar.events),actual=timeline(measure.slots);
      // Different subdivisions/ties or voice structures aren't pitch errors.
      if(expected.length!==actual.length||expected.some((e,j)=>e.onset!==actual[j].onset||ticksOf(e.event)!==ticksOf(actual[j].event)))continue;
      actual.forEach(({event:slot},j)=>{
        if(slot.notes.some(n=>n.dead||n.unplaced||n.status!=='confirmed')||slot.rejections.length)return;
        const staffMidi=pitches(expected[j].event.notes.map(n=>({midi:n.midi+shift}))),tabMidi=pitches(slot.notes.map(n=>({midi:soundingMidi(target,n)})));
        if(tabMidi.some(n=>!Number.isInteger(n)))return;
        const match=JSON.stringify(staffMidi)===JSON.stringify(tabMidi)&&!!slot.rest===!!expected[j].event.rest;
        slot.notationCheck={status:match?'match':'mismatch',staffMidi,tabMidi,octaveShift:shift,method:'independent-staff-omr',sourceStaff:evidence.staff};
        // This is corroboration, not a calibrated OCR probability. In
        // particular, agreeing models must not certify an unread fret.
        if(match)slot.notationCheck.corroborated=true;
        else{slot.status='unresolved';slot.reviewReasons=[...new Set([...(slot.reviewReasons??[]),'pitch'])];measure.needsReview=true;measure.reasons=[...new Set([...measure.reasons,'staff-tab-pitch-mismatch'])];}
      });
    }
  }
  return result;
}
