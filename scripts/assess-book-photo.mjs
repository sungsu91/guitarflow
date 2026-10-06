// Oracle stays in Node. Coordinates match actual source bars, never flattened
// indices (which would silently score the wrong bar after a missed boundary).
export function assessBookPhoto(analysis,oracle){
 const page=analysis?.pages[0],failures=[],checks=[];
 const staves=page?.staffs.filter(s=>Math.abs((s.y+s.height/2)/page.height-oracle.rowCenter)<.025)??[];
 const ticks=e=>1920/Number(e.duration)*(e.dotted?1.5:1)*(e.tuplet?e.tuplet.normalNotes/e.tuplet.actualNotes:1);
 const normalize=events=>{let onset=0;return events.map(e=>{const next={...e,onset,notes:[...e.notes].sort((a,b)=>a[0]-b[0]),rest:!!e.rest,dotted:!!e.dotted,tuplet:e.tuplet?{actualNotes:e.tuplet.actualNotes,normalNotes:e.tuplet.normalNotes}:null};onset=onset===null||!e.duration?null:onset+ticks(e);return next;});};
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 for(const bar of oracle.bars){
  const candidates=staves.length===1?staves[0].measures.filter(m=>Math.abs(m.x/(m.source?.pageWidth??page.width)-bar.left)<.022&&Math.abs((m.x+m.width)/(m.source?.pageWidth??page.width)-bar.right)<.022):[];
  const actual=normalize(candidates.length===1?candidates[0].slots.map(s=>({...s,notes:s.notes.filter(n=>n.status==='confirmed').map(n=>[n.string,n.dead?'X':n.fret])})):[]),expected=normalize(bar.events);
  const pitch=(a,b)=>!!a&&a.rest===b.rest&&equal(a.notes,b.notes);
  const duration=(a,b)=>!!a&&a.duration===b.duration&&a.rest===b.rest&&a.dotted===b.dotted&&equal(a.tuplet,b.tuplet);
  const rhythm=(a,b)=>duration(a,b)&&a.onset===b.onset;
  const dp=Array.from({length:expected.length+1},()=>Array(actual.length+1).fill(0));
  for(let i=0;i<=expected.length;i++)dp[i][0]=i*5;for(let j=0;j<=actual.length;j++)dp[0][j]=j*5;
  const cost=(a,b)=>(pitch(a,b)?0:3)+(duration(a,b)?0:1)+(a.onset===b.onset?0:1);
  for(let i=1;i<=expected.length;i++)for(let j=1;j<=actual.length;j++)dp[i][j]=Math.min(dp[i-1][j-1]+cost(actual[j-1],expected[i-1]),dp[i-1][j]+5,dp[i][j-1]+5);
  let i=expected.length,j=actual.length;const rows=[];
  while(i||j){
   if(i&&j&&dp[i][j]===dp[i-1][j-1]+cost(actual[j-1],expected[i-1])){
    const a=actual[--j],e=expected[--i];rows.push({event:i+1,pitch:pitch(a,e),duration:duration(a,e),rhythm:rhythm(a,e),expected:e,actual:a});
   }else if(i&&dp[i][j]===dp[i-1][j]+5){const e=expected[--i];rows.push({event:i+1,pitch:false,duration:false,rhythm:false,expected:e,actual:null});}
   else rows.push({extra:true,actual:actual[--j]});
  }
  const noteCounts=rows.reduce((sum,r)=>{const expected=r.expected?.notes??[],actual=r.actual?.notes??[],hit=actual.filter(n=>expected.some(e=>equal(n,e))).length;return {expected:sum.expected+expected.length,correct:sum.correct+hit,extra:sum.extra+actual.length-hit,missing:sum.missing+expected.length-hit};},{expected:0,correct:0,extra:0,missing:0});
  const result={printedBar:bar.printed,boundaryMatched:candidates.length===1,expectedEvents:expected.length,actualEvents:actual.length,exact:rows.every(r=>r.pitch&&r.rhythm),correctPitchEvents:rows.filter(r=>r.pitch).length,correctDurationEvents:rows.filter(r=>r.duration).length,correctRhythmEvents:rows.filter(r=>r.rhythm).length,extraEvents:rows.filter(r=>r.extra).length,noteCounts};
  checks.push(result);failures.push(...rows.reverse().filter(r=>!r.pitch||!r.rhythm).map(r=>({printedBar:bar.printed,...r})));
 }
 return {id:oracle.id,part:oracle.part,checks,failures,expectedEvents:checks.reduce((n,r)=>n+r.expectedEvents,0),correctPitchEvents:checks.reduce((n,r)=>n+r.correctPitchEvents,0),correctDurationEvents:checks.reduce((n,r)=>n+r.correctDurationEvents,0),correctRhythmEvents:checks.reduce((n,r)=>n+r.correctRhythmEvents,0),exactBars:checks.filter(r=>r.exact).length,extraEvents:checks.reduce((n,r)=>n+r.extraEvents,0),wholePageSuccess:false};
}
