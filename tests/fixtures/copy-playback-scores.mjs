import {createBlankDocument,blankEvent} from '../../src/etudes/scoreModel.js';

export function navigationScores() {
 const cases=[
  ['repeat',{0:{repeatStart:true},2:{repeatEnd:true}},[0,1,2,0,1,2,3,4,5]],
  ['endings',{0:{repeatStart:true},2:{ending:1,repeatEnd:true},3:{ending:2}},[0,1,2,0,1,3,4,5]],
  ['dc',{4:{command:'dc'}},[0,1,2,3,4,0,1,2,3,4,5]],
  ['ds-fine',{1:{marker:'segno'},2:{marker:'fine'},4:{command:'dsAlFine'}},[0,1,2,3,4,1,2]],
  ['dc-coda',{2:{marker:'toCoda'},4:{command:'dcAlCoda'},5:{marker:'coda'}},[0,1,2,3,4,0,1,2,5]],
  ['ds-coda',{1:{marker:'segno'},2:{marker:'toCoda'},4:{command:'dsAlCoda'},5:{marker:'coda'}},[0,1,2,3,4,1,2,5]],
 ];
 return cases.map(([name,marks,expected])=>{
  const document=createBlankDocument();document.id=`navigation-check-${name}`;document.title=`재생 검증 ${name}`;document.english=document.title;document.bpm=240;
  // Short musical bars let a browser run the complete real audio route.
  document.meter=[2,8];document.viewSettings.measuresPerRow=3;
  document.measures=Array.from({length:6},(_,bar)=>({id:`${name}-${bar}`,chord:null,...marks[bar],events:[{...blankEvent(0,'4'),blank:false,rest:false,notes:[{id:`${name}-note-${bar}`,string:1,fret:bar}]}]}));
  return {name,document,expected};
 });
}

export function copyLayoutAnalysis(counts=[[4,5],[3,4],[2]]) {
 let bar=0;
 return {fileName:'Independent copy layout.pdf',sourceType:'pdf',summary:{},pages:counts.map((rows,page)=>({page:page+1,staffs:rows.map((count,staff)=>({id:staff+1,measures:Array.from({length:count},()=>({
  source:{page:page+1,staff:staff+1,measure:++bar},reasons:[],needsReview:false,rhythmValid:true,meter:[4,4],slots:[{source:{page:page+1},notes:[{status:'confirmed',string:1,fret:bar%8,confidence:{fret:1,string:1}}],rejections:[],duration:'1',status:'confirmed',confidence:1}]
 }))}))}))};
}
