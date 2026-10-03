import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const base='artifacts/tab-photo',manifest=JSON.parse(await readFile('artifacts/pdf-tab-corpus/manifest.json','utf8'));
const expected=manifest.cases.find(c=>c.id==='helvetica-native'),reports=[];
for(const name of ['score.png','score.JPG','compressed.jpeg','camera-exif.jpg','sideways.png','transparent.png','blurred.jpg']){
 const result=JSON.parse(await readFile(`${base}/${name}.json`,'utf8'));let correct=0,wrong=0,missing=0,rhythm=0;
 const bars=result.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures));
 assert.equal(bars.length,expected.bars.length);
 for(const [i,bar] of expected.bars.entries()){
  // Zoom consensus retains each selected measure's own pixel coordinate space.
  const actual=bars[i],width=actual.source.pageWidth;let exact=actual.slots.length===bar.events.length;
  const claimed=new Set();
  for(const event of bar.events){
   const slot=actual.slots.find(s=>Math.abs(s.x/width-event.x/manifest.width)<.009);if(slot)claimed.add(slot);
   const notes=slot?.notes.filter(n=>n.status==='confirmed')||[];
   for(const n of event.notes){if(notes.some(a=>a.string===n.string&&(n.fret==='X'?a.dead:!a.dead&&a.fret===n.fret)))correct++;else missing++;}
   for(const n of notes)if(!event.notes.some(a=>a.string===n.string&&(a.fret==='X'?n.dead:!n.dead&&n.fret===a.fret)))wrong++;
   if(!slot||slot.duration!==event.duration||slot.rest||slot.dotted||slot.tuplet)exact=false;
  }
  for(const slot of actual.slots)if(!claimed.has(slot))wrong+=slot.notes.filter(n=>n.status==='confirmed').length;
  if(exact)rhythm++;
 }
 const report={name,correct,wrong,missing,exactRhythmBars:rhythm};reports.push(report);
 assert.equal(wrong,0,`${name}: confidently wrong fret/string`);
 if(!['compressed.jpeg','blurred.jpg'].includes(name)){assert.equal(correct,39);assert.equal(rhythm,4);}
}
await writeFile(`${base}/accuracy.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
