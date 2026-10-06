// Compare every case and duration separately so an average cannot hide a loss.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export const failureLocation=f=>JSON.stringify([f.type,f.page,f.bar,f.event??null,f.expected?.string??null,f.expected?.fret??null]);

export function checkTabRegression(baseline,candidate){
const failures = [];
if(!Array.isArray(baseline)||!baseline.length||!Array.isArray(candidate)||!candidate.length)return {cases:0,passed:false,failures:['Missing or empty test results']};
const compare = (before, after, where) => {
  if (!after) { failures.push(`${where}: missing result`); return; }
  for(const key of Object.keys(before))if(!Number.isSafeInteger(after[key])||after[key]<0)failures.push(`${where}: invalid or missing ${key}`);
  for (const key of ['notes', 'events', 'expectedBars']) {
    if (before[key] !== after[key]) failures.push(`${where}: ${key} changed (${before[key]} -> ${after[key]})`);
  }
  for (const key of ['correct', 'rhythmCorrect']) {
    if (after[key] < before[key]) failures.push(`${where}: ${key} fell (${before[key]} -> ${after[key]})`);
  }
  for (const key of ['fretErrors', 'stringErrors', 'missing', 'added', 'rhythmErrors', 'beamErrors', 'restErrors', 'tieErrors', 'tupletErrors', 'barErrors', 'compiledErrors']) {
    if (after[key] > before[key]) failures.push(`${where}: ${key} rose (${before[key]} -> ${after[key]})`);
  }
};
if(new Set(candidate.map(r => r.id)).size!==candidate.length)failures.push('duplicate candidate cases');
if (baseline.length !== candidate.length) failures.push(`case count changed (${baseline.length} -> ${candidate.length})`);
for (const old of baseline) {
  const next = candidate.find(r => r.id === old.id);
  if (!next || next.error) { failures.push(`${old.id}: ${next?.error ?? 'missing case'}`); continue; }
  compare(old.totals, next.totals, old.id);
  for (const [duration, counts] of Object.entries(old.byDuration)) compare(counts, next.byDuration?.[duration], `${old.id}/${duration}`);
  compare(old.doubleDigit, next.doubleDigit, `${old.id}/double-digit`);
  const previousLocations=old.failureLocations??old.failures?.map(failureLocation);
  if(previousLocations){
    const locations=next.failureLocations??next.failures?.map(failureLocation);
    if(!Array.isArray(locations))failures.push(`${old.id}: missing failure locations`);
    else {
      const known=new Set(previousLocations);
      for(const location of locations)if(!known.has(location))failures.push(`${old.id}: newly failed position ${location}`);
    }
  }
  if(old.documentStats){
    if(!next.documentStats)failures.push(`${old.id}: missing document statistics`);
    else if(!Number.isSafeInteger(next.documentStats.exactBars)||next.documentStats.exactBars<old.documentStats.exactBars)failures.push(`${old.id}: fewer exact converted bars`);
  }
}
return {cases:candidate.length,passed:!failures.length,failures};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [baselinePath,candidatePath]=process.argv.slice(2);
 assert(baselinePath&&candidatePath,'usage: node scripts/check-tab-32-regression.mjs baseline.json candidate.json');
 const result=checkTabRegression(JSON.parse(await readFile(baselinePath)),JSON.parse(await readFile(candidatePath)));
 console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
}
