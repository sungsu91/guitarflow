// Test-only original composition. No ground-truth material feeds the importer.
import {daylightDocument} from '../src/etudes/daylightFingerstyle.js';
import {readFile,writeFile} from 'node:fs/promises';
const expected=daylightDocument.measures;
const rhythm=e=>e.duration+(e.dotted?'.':'')+(e.tuplet?'t':'')+(e.rest?'r':'');
const results=[];
for(const file of process.argv.slice(2).length?process.argv.slice(2):['artifacts/pdf-tab-folder/whole/0-analysis.json','artifacts/pdf-tab-100/final/0-analysis.json']){
 const a=JSON.parse(await readFile(file)),bars=a.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures));
 const result={file,expectedBars:40,expectedFrets:508,alignedNonrestBars:0,correctFrets:0,wrongFrets:[],exactFretBars:0,exactNonrestDurationBars:0,exactRhythmIncludingRestsBars:0,exactCompleteBars:0};
 for(const [i,bar] of expected.entries()){
  const source=bar.events.filter(e=>!e.rest),actual=bars[i]?.slots.filter(s=>!s.rest)??[];
  const fullRhythm=bar.events.map(rhythm).join(' ')===bars[i]?.slots.map(rhythm).join(' ');if(fullRhythm)result.exactRhythmIncludingRestsBars++;
  if(source.length!==actual.length)continue;result.alignedNonrestBars++;
  if(source.every((e,j)=>rhythm(e)===rhythm(actual[j])))result.exactNonrestDurationBars++;
  let exact=true;
  for(const [j,e] of source.entries()){
   const notes=actual[j].notes.filter(n=>n.status==='confirmed');if(notes.length!==e.notes.length)exact=false;
   for(const n of notes)if(e.notes.some(t=>t.string===n.string&&t.fret===n.fret))result.correctFrets++;else {exact=false;result.wrongFrets.push({bar:i+1,event:j+1,string:n.string,fret:n.fret});}
  }
  if(exact)result.exactFretBars++;if(exact&&fullRhythm)result.exactCompleteBars++;
 }
 result.missingFrets=result.expectedFrets-result.correctFrets;results.push(result);
}
console.log(JSON.stringify(results,null,2));await writeFile(`${process.env.PDF_TAB_QUALITY_OUTPUT||'artifacts/pdf-tab-100'}/accuracy.json`,JSON.stringify(results,null,2));
