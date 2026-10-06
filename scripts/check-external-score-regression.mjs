// A higher average must not conceal a newly missed note or rhythmic position.
export function externalFailurePositions(report,kind){
 return report.failures.filter(f=>f.expected&&!f[kind]).map(f=>`${f.bar}:${f.event}`).sort();
}

export function checkExternalScoreRegression(baseline,reports){
 const failures=[];
 if(!Array.isArray(baseline)||!baseline.length||!Array.isArray(reports))return {passed:false,failures:['Missing reference or results']};
 if(new Set(reports.map(r=>r.id)).size!==reports.length)failures.push('Duplicate results');
 for(const old of baseline){
  const next=reports.find(r=>r.id===old.id),where=old.id;
  if(!next||next.error){failures.push(`${where}: missing or failed import`);continue;}
  if(!Array.isArray(next.failures)||next.oracleEvents!==old.oracleEvents){failures.push(`${where}: changed or missing audited sample`);continue;}
  if(next.barCountCorrect!==true||next.detectedBars!==old.detectedBars)failures.push(`${where}: changed bar count`);
  for(const key of ['correctNoteEvents','correctRhythmEvents'])if(!Number.isInteger(next[key])||next[key]<old[key])failures.push(`${where}: ${key} declined`);
  if(!Number.isInteger(next.extraEvents)||next.extraEvents>old.extraEvents||next.extraEvents<0)failures.push(`${where}: added events`);
  for(const kind of ['notes','rhythm']){
   const allowed=new Set(old.failedPositions[kind]);
   for(const position of externalFailurePositions(next,kind))if(!allowed.has(position))failures.push(`${where}: newly failed ${kind} at ${position}`);
  }
  if(next.liveWorkers!==0||next.pageErrors?.length||next.compileErrors?.length)failures.push(`${where}: cleanup, browser or score error`);
 }
 return {passed:failures.length===0,failures};
}
