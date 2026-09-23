import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
// Original mixed-rhythm phrases, authored as two-beat cells. Not transcriptions.
const cell=(frets,durations,marks={},bends={},slurs=[])=>({frets,durations,marks,bends,slurs});
const a=['8','16','16','4'],b=['16','16','8','4'],c=['4','8','8'],d=['8','8','8','8'];
function study(id,type,level,name,cells,bpm=60){
 const pairs=[[0,1],[1,2],[2,3],[3,0],[2,0],[1,3],[3,2],[0,3]];
 const rows=pairs.map(([a,b])=>{
  const first=cells[a],second=cells[b],offset=first.frets.length;
  return {frets:[...first.frets,...second.frets],durations:[...first.durations,...second.durations],marks:{...first.marks,...Object.fromEntries(Object.entries(second.marks).map(([i,k])=>[Number(i)+offset,k]))},bends:{...first.bends,...Object.fromEntries(Object.entries(second.bends).map(([i,k])=>[Number(i)+offset,k]))},slurs:[...first.slurs,...second.slurs.map(([x,y])=>[x+offset,y+offset])]};
 });
 return {id,type,level,name,english:name,bpm,style:ko["etudes.basics"],family:'minor',fixedRoot:'A',intervals:[0,2,3,5,7,8,10],complete:true,
 shape:[[2,5],[2,8],[2,10]],patterns:rows.map(r=>r.frets),rhythms:rows.map(r=>r.durations),techniqueMap:rows.map(r=>r.marks),bendMap:rows.map(r=>r.bends),slurMap:rows.map(r=>r.slurs),
 purpose:ko["etudes.connectEighthSixteenthSixteenthAndSixteenthSixteenthEighthPatternsToLongDestination"],difficultyReason:formatMessage(ko["etudes.valueMixedRhythmsAndPreciseTechniqueArrivals"], { value1: level })};
}
const up={amount:2,phase:'up'},release={amount:2,phase:'up-release'},half={amount:1,phase:'up-release'};
export const mixedTechniqueStudies=[
 study('hammer-mixed',ko["etudes.hammerOn"],ko["etudes.intermediate"],ko["etudes.mixedEighthSixteenthHammerOns"],[
 cell([0,1,2,1],a,{0:'H',1:'H'}),cell([0,1,2,-1],b,{0:'H',1:'H'}),cell([0,1,2],c,{1:'H'}),cell([0,1,0,1],d,{0:'H',2:'H'})]),
 study('pull-mixed',ko["etudes.pullOff"],ko["etudes.intermediate"],ko["etudes.mixedSixteenthEighthPullOffs"],[
 cell([2,1,0,0],a,{0:'P',1:'P'}),cell([2,1,0,-1],b,{0:'P',1:'P'}),cell([2,1,0],c,{1:'P'}),cell([2,1,1,0],d,{0:'P',2:'P'})]),
 study('slide-slur-mixed',ko["etudes.slide"],ko["etudes.intermediate"],ko["etudes.mixedRhythmSlidesAndSlurs"],[
 cell([0,1,2,1],a,{0:'S',1:'S'},{},[[0,2]]),cell([2,1,0,-1],b,{0:'S',1:'S'},{},[[0,2]]),cell([0,1,2],c,{1:'S'}),cell([2,1,0,1],d,{0:'S',2:'S'},{},[[2,3]])]),
 study('legato-hph-mixed',ko["etudes.legato"],ko["etudes.intermediate"],ko["etudes.hphPhpMixedRhythms"],[
 cell([0,1,0,1],a,{0:'H',1:'P',2:'H'}),cell([2,1,2,1],b,{0:'P',1:'H',2:'P'}),cell([0,1,0],c,{0:'H',1:'P'}),cell([2,1,0,-1],d,{0:'P',1:'P'})]),
 study('legato-slide-mixed',ko["etudes.legato"],ko["etudes.advanced"],ko["etudes.hphAndLegatoSlideResponse"],[
 cell([0,1,0,1],a,{0:'H',1:'P',2:'H'}),cell([2,1,0,1],b,{0:'P',1:'S',2:'H'},{},[[1,3]]),cell([0,1,2],c,{0:'S',1:'H'},{},[[0,2]]),cell([2,1,0,-1],d,{0:'S',1:'P'},{},[[0,2]])],68),
 study('bend-target',ko["etudes.bending"],ko["etudes.beginner"],ko["etudes.halfStepAndWholeStepBendTargets"],[
 cell([1,2,-1],c,{}, {0:up}),cell([0,1,2,1],a,{}, {3:half}),cell([1,0,-1],c,{}, {0:release}),cell([0,1,0,-1],d,{}, {1:half})],48),
 study('bend-release-mixed',ko["etudes.bending"],ko["etudes.intermediate"],ko["etudes.bendReleaseAndEighthSixteenthResponse"],[
 cell([1,0,1,0],a,{1:'H',2:'P'},{0:release}),cell([0,1,2,-1],b,{0:'H'},{2:up}),cell([0,1,0],c,{1:'P'},{0:half}),cell([1,0,1,-1],d,{0:'P'},{2:release})],56),
 study('bend-legato-phrase',ko["etudes.bending"],ko["etudes.advanced"],ko["etudes.bendHphAndSlidePhrase"],[
 cell([1,0,1,0],a,{1:'H',2:'P'},{0:release}),cell([0,1,0,1],b,{0:'H',1:'P',2:'H'}),cell([1,0,1],c,{1:'S'},{0:half},[[1,2]]),cell([2,1,0,-1],d,{0:'P'},{1:release})],64),
];
export function applyStudyExpressions(document,template){
 document.measures.forEach((bar,b)=>{
  for(const group of template.tupletMap?.[b]??[])for(const i of group)bar.events[i].tuplet={actualNotes:3,normalNotes:2,groupId:bar.events[group[0]].id};
  if(template.tupletMap){let onset=0;for(const e of bar.events){e.onset=onset;onset+=1920/Number(e.duration)*(e.tuplet?2/3:1);}}
  for(const [i,bend] of Object.entries(template.bendMap?.[b]??{}))bar.events[i].notes[0].bendEffect={...bend};
  for(const [from,to] of template.slurMap?.[b]??[])bar.events[from].slurTo=bar.events[to].id;
 });
}
