import {readFile} from 'node:fs/promises';
import {flowerAudit} from '../tests/fixtures/pdf-tab-flower-audit.mjs';
const reports=[];
for(const path of process.argv.slice(2)){
 const a=JSON.parse(await readFile(path)),measures=a.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures));
 const report={path,bars:flowerAudit.size,expected:0,correct:0,missing:0,wrong:[],unaligned:[],exactRhythm:0,complete:0};
 for(const [bar,expected] of flowerAudit){
  const slots=measures[bar-1].slots.filter(s=>s.duration);report.expected+=expected.flatMap(e=>e.notes).length;
  const unmatched=measures[bar-1].slots.filter(s=>!s.duration).flatMap(s=>s.notes.filter(n=>n.status==='confirmed'));
  for(const n of unmatched)report.wrong.push({bar,slot:'unmatched',string:n.string,fret:n.dead?'X':n.fret});
  if(slots.length!==expected.length){report.unaligned.push(bar);continue;}
  let exact=unmatched.length===0;
  if(slots.every((s,i)=>s.duration===expected[i].duration&&!s.dotted&&!s.tuplet))report.exactRhythm++;else exact=false;
  for(const [i,e] of expected.entries()){
   const actual=slots[i].notes.filter(n=>n.status==='confirmed').map(n=>({string:n.string,fret:n.dead?'X':n.fret}));
   for(const n of e.notes){if(actual.some(a=>a.string===n.string&&a.fret===n.fret))report.correct++;else{report.missing++;exact=false;}}
   for(const n of actual)if(!e.notes.some(a=>a.string===n.string&&a.fret===n.fret)){report.wrong.push({bar,slot:i+1,...n});exact=false;}
  }
  if(exact)report.complete++;
 }
 reports.push(report);
}
console.log(JSON.stringify(reports,null,2));
