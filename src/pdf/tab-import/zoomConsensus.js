import {resolvePage,summarizeAnalysis} from './recognition.js';
import {isFretText,normalizeFretText} from './fretText.js';
import {ticksOf} from '../../etudes/scoreModel.js';
import {chordAnchorX} from './chordPosition.js';
import {corroborateZoomTuplets} from './zoomTuplets.js';

const frets=m=>m.slots.flatMap(s=>s.notes.filter(n=>n.status==='confirmed').map(n=>({string:n.string,fret:n.fret,dead:!!n.dead,x:(s.x-m.x)/m.width})));
const readable=c=>c?.ocr?.agrees&&!c.ocr.shapeRejected&&c.ocr.confidence>=.90&&isFretText(c.ocr.text)&&!c.ocr.alternatives?.some(a=>a.confidence>=.85);

export function combineMeasureChords(original,enlarged,target){
 const position=(c,m)=>(c.source.x-m.x)/m.width;
 const entry=(chord,m)=>({chord,position:position(chord,m),anchorPosition:(chordAnchorX(chord.source)-m.x)/m.width});
 const entries=(original.harmonyChanges??[]).filter(c=>c.source).map(c=>entry(c,original));
 const rank=c=>c.source?.method==='pdf-chord-text'?3:c.source?.method==='local-chord-glyph-consensus'?2:1;
 for(const chord of enlarged.harmonyChanges??[]){
  if(!chord.source)continue;
  const at=position(chord,enlarged),match=entries.find(e=>Math.abs(e.position-at)<.035);
  if(!match){if(!chord.needsReview)entries.push(entry(chord,enlarged));continue;}
  const old=match.chord;
  if(old.name===chord.name){if(old.needsReview&&!chord.needsReview)match.chord=chord;}
  else if(rank(chord)>rank(old)&&!chord.needsReview)match.chord=chord;
  else if(rank(old)<=rank(chord)&&!chord.needsReview)match.chord={...old,needsReview:true};
 }
 if(!entries.length)return;
 let ticks=0;const anchors=(target.slots??[]).map(s=>{const a={position:(s.x-target.x)/target.width,onset:ticks};ticks+=ticksOf(s);return a;});
 target.harmonyChanges=entries.sort((a,b)=>a.position-b.position).map(({chord,anchorPosition:at})=>{
  const closest=target.rhythmValid&&anchors.length?anchors.reduce((a,b)=>Math.abs(a.position-at)<Math.abs(b.position-at)?a:b):null;
  return {...chord,onset:chord.onset===0?0:closest?.onset??chord.onset};
 });
 target.harmony=target.harmonyChanges[0].onset===0?target.harmonyChanges[0].name:null;
 if(target.harmonyReview?.reason==='unread-chord-label'){
  const sources=target.harmonyReview.sources.filter(s=>!entries.some(e=>!e.chord.needsReview&&Math.abs(e.position-(s.x-target.x)/target.width)<.035));
  if(sources.length)target.harmonyReview={...target.harmonyReview,sources};else delete target.harmonyReview;
 }
}

function transferReading(target,source,label){
  if(!readable(source)||source.status!=='confirmed'||source.ocr.confidence<.95||target.ocr?.shapeRejected||target.ocr?.method==='geometry-rejected'||readable(target)&&target.ocr.confidence>=.95)return;
  const conflicts=[{text:target.ocr?.text,confidence:target.ocr?.confidence??0},...(target.ocr?.alternatives??[])].some(r=>r.text&&r.text!==source.ocr.text&&r.confidence>=.85);
  if(!conflicts)target.ocr={...structuredClone(source.ocr),rawConfidence:target.ocr?.confidence??0,method:source.ocr.method+'-matched-'+label+'-crop',crossScale:{text:source.ocr.text,confidence:source.ocr.confidence,sourceCandidate:source.id}};
}

// Re-rendering supplies additional evidence, never additional score positions.
// Only matching bars/strings/columns can corroborate a reading. Two conflicting
// readings are never corroborated; an enlarged page must not drop known notes.
export function combineZoomReadings(original,enlarged){
  // Nothing from the original page can be lost when no staff was detected.
  // Keep the enlarged coordinate system intact for the editor/source mapping.
  if((!original.staffs.length||original.partialPhotoTracks&&!enlarged.partialPhotoTracks)&&enlarged.staffs.length)return {...enlarged,zoom:{attempted:true,selected:true,reason:'staff-recovered',confirmedBefore:summarizeAnalysis([original]).confirmed,confirmedAfter:summarizeAnalysis([enlarged]).confirmed}};
  const sameStaff=(a,b)=>{
    const tolerance=Math.min(a.spacing/original.height,b.spacing/enlarged.height)*.6;
    return Math.abs(a.y/original.height-b.y/enlarged.height)<tolerance&&Math.abs(a.x/original.width-b.x/enlarged.width)<tolerance;
  };
  const staffPairs=enlarged.staffs.map(s=>{
    const matches=original.staffs.map((old,i)=>sameStaff(old,s)?i:-1).filter(i=>i>=0);
    return matches.length===1&&enlarged.staffs.filter(other=>sameStaff(original.staffs[matches[0]],other)).length===1?matches[0]:-1;
  });
  // A damaged boundary in one bar must not discard the zoom evidence for an
  // entire page. Match both edges in page coordinates, never by shifted index.
  const pairs=enlarged.staffs.map((zoom,i)=>{
    if(staffPairs[i]<0)return zoom.measures.map(()=>-1);
    const staff=original.staffs[staffPairs[i]],tolerance=Math.min(staff.spacing/original.width,zoom.spacing/enlarged.width)*.45;
    const matches=(a,b)=>Math.abs(a.x/original.width-b.x/enlarged.width)<tolerance&&Math.abs((a.x+a.width)/original.width-(b.x+b.width)/enlarged.width)<tolerance;
    return zoom.measures.map(m=>{
      const ids=staff.measures.map((old,j)=>matches(old,m)?j:-1).filter(j=>j>=0);
      return ids.length===1&&zoom.measures.filter(other=>matches(staff.measures[ids[0]],other)).length===1?ids[0]:-1;
    });
  });
  if(!pairs.some(ids=>ids.some(j=>j>=0)))return {...original,zoom:{attempted:true,selected:false,reason:'layout-disagreement'}};
  const next=structuredClone(enlarged),base=structuredClone(original);
  for(const [i,s] of next.staffs.entries())for(const [j,m] of s.measures.entries()){
    if(pairs[i][j]<0)continue;
    const oldStaff=original.staffs[staffPairs[i]],old=oldStaff.measures[pairs[i][j]];
    for(const c of s.candidates.filter(c=>c.cx>m.x&&c.cx<m.x+m.width)){
      if(c.restSymbol||c.nonFretSymbol)continue;
      const matches=oldStaff.candidates.filter(p=>p.string===c.string&&p.parts===c.parts&&p.cx>old.x&&p.cx<old.x+old.width&&Math.abs((p.cx-old.x)/old.width-(c.cx-m.x)/m.width)<Math.min(oldStaff.spacing/old.width,s.spacing/m.width)*.35);
      if(matches.length!==1||matches[0].restSymbol||matches[0].nonFretSymbol)continue;
      const p=matches[0];
      // One-to-one position matching lets a strong original reading survive a
      // weaker enlarged crop. This combines evidence, never score events. A
      // conflicting enlarged digit still prevents the transfer.
      const reverse= s.candidates.filter(q=>q.string===p.string&&q.parts===p.parts&&q.cx>m.x&&q.cx<m.x+m.width&&Math.abs((q.cx-m.x)/m.width-(p.cx-old.x)/old.width)<Math.min(oldStaff.spacing/old.width,s.spacing/m.width)*.35);
      if(reverse.length!==1)continue;
      const originalCopy=base.staffs[staffPairs[i]].candidates.find(q=>q.id===p.id),enlargedSource=enlarged.staffs[i].candidates.find(q=>q.id===c.id);
      transferReading(originalCopy,enlargedSource,'enlarged');
      transferReading(c,p,'original');
      // A confident matching winner at both scales can retain the established
      // recovery. But an uncertain original with competing digits must not be
      // promoted merely because selecting the whole zoom bar adds more notes.
      // The existing 7/rest discriminator supplies additional measured shape
      // evidence at both scales; it may preserve a previously valid zoom read.
      const matchedSevenCap=p.ocr?.text==='7'&&p.sevenCap===true&&enlargedSource.sevenCap===true;
      const corroboratedChoice=p.ocr?.text===enlargedSource.ocr?.text&&(p.ocr?.agrees&&p.ocr.confidence>=.95||matchedSevenCap);
      // A one-character read of a measured two-character crop is not a rival
      // to its matching "11" alternative. Compare only viable fret readings.
      const competingReading=[p.ocr,...(p.ocr?.alternatives??[])].some(r=>r&&r.confidence>=.85&&isFretText(r.text)&&normalizeFretText(r.text).length===p.parts&&normalizeFretText(r.text)!==normalizeFretText(enlargedSource.ocr?.text)&&!(normalizeFretText(r.text)==='7'&&p.sevenCap===false));
      // A recovered boundary can make a previously unmatched zoom span
      // selectable. It supplies geometry evidence, not new numeral evidence.
      // Keep the established OCR path unchanged for all other measures.
      const recoveredSpan=[old,m].some(bar=>bar.boundaryEvidence==='faint-rules');
      if(recoveredSpan&&p.reasons?.includes('ambiguous-digit')&&competingReading&&enlargedSource.status==='confirmed'&&!corroboratedChoice){
        c.ocr={...c.ocr,agrees:false,zoomConflict:p.ocr?.alternatives};m.zoomAmbiguityReview=true;continue;
      }
      // Corroboration uses only the two unmodified source readings. Transferred
      // evidence must not count as a second independent OCR observation.
      if(!readable(p)||!readable(enlargedSource))continue;
      if(p.ocr.text!==enlargedSource.ocr.text){c.ocr={...c.ocr,agrees:false,zoomConflict:p.ocr.text};continue;}
      for(const [target,other] of [[c,p],[originalCopy,enlargedSource]])target.ocr={...target.ocr,rawConfidence:target.ocr.confidence,confidence:Math.max(.95,target.ocr.confidence),crossScale:{text:other.ocr.text,confidence:other.ocr.confidence},method:target.ocr.method+'-cross-scale'};
    }
  }
  for(const [i,s] of next.staffs.entries())for(const [j,m] of s.measures.entries()){
    if(pairs[i][j]<0)continue;
    const old=base.staffs[staffPairs[i]].measures[pairs[i][j]],tolerance=Math.min(s.spacing/m.width,base.staffs[staffPairs[i]].spacing/old.width)*.35;
    corroborateZoomTuplets(old,m,tolerance);
    corroborateZoomTuplets(m,original.staffs[staffPairs[i]].measures[pairs[i][j]],tolerance);
    preservePhotoTupletReview(old,m,tolerance);
    preservePhotoTupletReview(m,old,tolerance);
    const oldStaff=base.staffs[staffPairs[i]];
    if([s,oldStaff].some(staff=>staff.candidates.some(c=>c.ocr?.method?.includes('camera-complete-glyph')))){
      // Readings added by a photo retry must not make us discard rhythm found
      // at the other scale. Transfer only measured, unambiguous columns into
      // unknown rhythm; keep any existing duration and all geometry anchors.
      const oldRhythm=structuredClone(old.rhythm),newRhythm=structuredClone(m.rhythm);
      supplementPhotoRhythm(old,m,newRhythm,oldStaff.candidates,tolerance);
      supplementPhotoRhythm(m,old,oldRhythm,s.candidates,tolerance);
    }
  }
  const resolved=resolvePage(next),refinedOriginal=resolvePage(base),result=structuredClone(refinedOriginal);
  // Select one version of each complete measure; never concatenate detections.
  // Each selected measure retains its own render dimensions in source metadata.
  let selected=0;
  for(const [i,s] of resolved.staffs.entries())for(const [j,m] of s.measures.entries()){
    const originalIndex=pairs[i][j];if(originalIndex<0)continue;
    const old=refinedOriginal.staffs[staffPairs[i]].measures[originalIndex],before=frets(old),after=frets(m),tolerance=s.spacing/m.width*.45;
    // A bar validated against a different time signature cannot replace this
    // bar merely because its durations fit the other capacity.
    if(old.meter.join('/')!==m.meter.join('/'))continue;
    const preserved=before.every(n=>after.some(p=>p.string===n.string&&p.fret===n.fret&&p.dead===n.dead&&Math.abs(p.x-n.x)<tolerance));
    const restsPreserved=old.slots.filter(r=>r.rest&&r.confidence>=.95).every(r=>m.slots.some(q=>q.rest&&q.duration===r.duration&&Math.abs((q.x-m.x)/m.width-(r.x-old.x)/old.width)<tolerance));
    // Keeping one uncertain zoom numeral for review must not discard the
    // rest/rhythm evidence from the otherwise better original zoom measure.
    const zoomCoverage=m.zoomAmbiguityReview&&after.length>=before.length&&frets(enlarged.staffs[i].measures[j]).length>before.length;
    // Filling a missing photo stem must not suppress the established clearer
    // zoom fret. Prefer that complete set of known notes and keep its rhythm
    // for review if its numeral placement still prevents a valid measure.
    const recoveredPhotoRhythm=old.rhythm.some(r=>r.method==='wide-photo-stem'||r.method==='isolated-detached-quarter');
    if(preserved&&restsPreserved&&(!old.rhythmValid||m.rhythmValid||recoveredPhotoRhythm)&&(after.length>before.length||zoomCoverage||m.rhythmValid&&!old.rhythmValid)){selected++;result.staffs[staffPairs[i]].measures[originalIndex]=m;}
    // Better fret/rhythm evidence is independent of chord-text evidence. A
    // selected zoom bar must not discard a complete name read at the other scale.
    combineMeasureChords(old,m,result.staffs[staffPairs[i]].measures[originalIndex]);
  }
  const recoveredOnOriginal=summarizeAnalysis([refinedOriginal]).confirmed-summarizeAnalysis([original]).confirmed;
  return {...result,...(selected&&enlarged.cameraCorrection?{enlargedPhotoCorrection:{width:enlarged.width,height:enlarged.height,...enlarged.cameraCorrection}}:{}),zoom:{attempted:true,selected:selected>0||recoveredOnOriginal>0,measures:selected,recoveredOnOriginal,matchedMeasures:pairs.flat().filter(j=>j>=0).length,confirmedBefore:summarizeAnalysis([original]).confirmed,confirmedAfter:summarizeAnalysis([result]).confirmed}};
}

// A zoom that misses a visible bracket must not turn its unresolved ratio into
// ordinary sixteenths when that version of the whole measure is selected.
export function preservePhotoTupletReview(target,source,tolerance){
 for(const r of source.rhythm.filter(r=>r.photoTupletUnverified)){
  const position=(r.x-source.x)/source.width;
  const matches=target.rhythm.filter(q=>Math.abs((q.x-target.x)/target.width-position)<tolerance);
  if(matches.length!==1)continue;
  const q=matches[0];
  if(q.tuplet&&q.confidence>=.95&&q.tupletEvidence?.confidence>=.95)continue;
  if(source.rhythm.filter(p=>Math.abs((p.x-source.x)/source.width-(q.x-target.x)/target.width)<tolerance).length!==1)continue;
  Object.assign(q,{duration:null,confidence:0,photoTupletUnverified:true,method:'unread-photo-tuplet-bracket'});
 }
}

export function supplementPhotoRhythm(target,source,readings,candidates,tolerance){
 for(const r of readings){
  if(!r.duration||r.confidence<.95||r.rest)continue;
  const position=(r.x-source.x)/source.width;
  const matches=target.rhythm.filter(q=>Math.abs((q.x-target.x)/target.width-position)<tolerance);
  if(matches.length>1||matches[0]?.duration)continue;
  if(matches[0]?.photoTupletUnverified&&!r.tuplet)continue;
  const frets=candidates.filter(c=>c.cx>target.x&&c.cx<target.x+target.width&&!c.nonFretSymbol&&!c.restSymbol&&(c.stringDistance??0)<=.22&&Math.abs((c.cx-target.x)/target.width-position)<tolerance);
  if(!frets.length)continue;
  const evidence={duration:r.duration,confidence:r.confidence,dotted:!!r.dotted,...(r.tuplet?{tuplet:structuredClone(r.tuplet)}:{}),method:'measured-cross-scale-photo-rhythm'};
  if(matches.length){Object.assign(matches[0],evidence);if(r.tuplet)delete matches[0].photoTupletUnverified;}
  else target.rhythm.push({x:target.x+position*target.width,y:target.y+target.height,...evidence});
 }
 target.rhythm.sort((a,b)=>a.x-b.x);
}
