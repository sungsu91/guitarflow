import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {compileDocumentV2,ticksOf} from '../src/etudes/scoreModel.js';
import {scorePlaybackReadiness} from '../src/etudes/scorePlaybackReadiness.js';
// Transcribed from the supplied page images, independently of model readings.
// Each entry describes one printed event, including every chord tone.
const oracle={
 8:['C5 F5 A5:4','E5 G5:8','D5 F5:8','C4 C5 E5:4','rest:8.','G4:16'],
 20:['C5 F5 A5:4','E5 G5:8','D5 F5:8','C4 C5 E5:4','rest:8.','E4:16'],
 24:['C5 F5 A5:4','E5 G5:8','D5 F5:8','C4 C5 E5:4','E5:16','D5:16','C5:8'],
 28:['C5:4','/:8','/:8','/:4','E5:16','D5:16','C5:8'],
 31:['/:4','/:8','/:8','/:4','/:8','/:8'],
 32:['/:4','/:4','/:2'],
 33:['C5 F5 A5:4','E5 G5:8','D5 F5:8','C4 C5 E5:4','B4b D5:8','A4 C5:8'],
 34:['G3 G4 B4:4','A4 C5:4','C4 G4 C5:4','/:8','G3:16','A3:16'],
 35:['C4:8','C4:8','D4:16t','E4b:16t','D4:16t','C4:8','D4:8','D4:8','G3:16','A3:16','C4:16','D4:16'],
 39:['D4:16t','E4b:16t','D4:16t','C4:8','A4:8','G4:16','E5:16','E5:16','D5:16','C5:16','D5:16','A4:8','G4:8'],
 46:['C5:4','/:8','/:8','/:4','rest:8.','E4:16'],
 50:['C5 F5 A5:4','E5 G5:8','D5 F5:8','C4 C5 E5:4','rest:8.','E4:16'],
 54:['C5 F5 A5:4','E5 G5:8','D5 F5:8','C4 C5 E5:4','E5:16','D5:16','C5:8'],
 58:['C5:4','/:8','/:8','/:4','E5:16','D5:16','C5:8'],
 61:['/:4','/:8','/:8','/:4','/:8','/:8'],
};
const root=process.env.STAFF_ORACLE_OUTPUT??'artifacts/omr-deep-audit/verified-live';
const doc=JSON.parse(await readFile(`${root}/after.json`,'utf8')),results=[];
const pitch=s=>{const m=s.match(/^([A-G])(\d)(b|#)?$/);return 12*(Number(m[2])+1)+({C:0,D:2,E:4,F:5,G:7,A:9,B:11})[m[1]]+(m[3]==='b'?-1:m[3]==='#'?1:0);};
for(const [bar,source] of Object.entries(oracle)){
 const measure=doc.measures[Number(bar)-1];assert.equal(measure.events.length,source.length,`bar ${bar} event count`);
 let noteCount=0;
 for(const [i,written] of source.entries()){
  const [heads,duration]=written.split(':'),event=measure.events[i],where=`bar ${bar} event ${i+1}`;
  assert.equal(event.duration,duration.replace(/[.t]/g,''),where);assert.equal(!!event.dotted,duration.includes('.'),where);assert.equal(!!event.tuplet,duration.includes('t'),where);assert.equal(event.blank,false,where);
  if(heads==='rest'){assert(event.rest,where);continue;}
  assert.equal(event.rest,false,where);
  if(heads==='/'){assert(event.rhythmSlash,where);assert(event.notes.length>=4,where);continue;}
  const expected=heads.split(' ').map(pitch).sort((a,b)=>a-b),actual=event.notes.map(n=>n.source.writtenMidi).sort((a,b)=>a-b);
  assert.deepEqual(actual,expected,where);noteCount+=expected.length;
  for(const n of event.notes)assert.equal(n.unplaced?n.midi:doc.tuning[n.string-1]+n.fret,n.source.writtenMidi-12,where+' TAB pitch');
 }
 results.push({bar:Number(bar),events:source.length,pitchedNotes:noteCount,passed:true});
}
assert.deepEqual(doc.measures[31].events.map(e=>e.notes[0].source.chord),['G','F','C']);
assert(doc.measures.every(m=>m.pdfImport.rhythmVerified&&m.events.reduce((sum,e)=>sum+ticksOf(e),0)===1920));
const compiled=compileDocumentV2(doc),readiness=scorePlaybackReadiness(doc,compiled);assert.deepEqual(compiled.errors,[]);assert(readiness.allowed);assert.equal(readiness.mutedMeasures?.length??0,0);
const result={passed:true,scope:'15 source-checked measures; pitch, rhythm, rests, rhythmic slashes and tuplets. This does not measure ties, repeats or accuracy on other source images.',measures:doc.measures.length,completeRhythm:doc.measures.filter(m=>m.pdfImport.rhythmVerified).length,gaps:doc.measures.flatMap(m=>m.events).filter(e=>e.blank).length,mutedBars:[],oracleEvents:results.reduce((sum,r)=>sum+r.events,0),oraclePitchedNotes:results.reduce((sum,r)=>sum+r.pitchedNotes,0),results};
await writeFile(`${root}/source-oracle.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
