import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {bookPhotoOracle} from '../tests/fixtures/book-photo-oracle.mjs';
import {assessBookPhoto} from './assess-book-photo.mjs';
const root=process.argv[2]??'artifacts/book-photo-followup-20261006',prior='artifacts/book-photo-20261005';
const run=process.argv[3]??'final';
const manifest=JSON.parse(await readFile(`${prior}/manifest.json`)),layout=JSON.parse(await readFile(`${prior}/source-layout.json`));
const preserved=JSON.parse(await readFile(`${root}/prior-result-hashes.json`));
for(const f of preserved){const hash=createHash('sha256').update(await readFile(f.Path)).digest('hex').toUpperCase();if(hash!==f.Hash)throw Error('Prior result modified: '+f.Path);}
const music=d=>d.analysis?.pages.map(p=>p.staffs.map(s=>({x:s.x,y:s.y,width:s.width,height:s.height,measures:s.measures.map(m=>({x:m.x,width:m.width,slots:m.slots.map(t=>({x:t.x,duration:t.duration,dotted:!!t.dotted,rest:!!t.rest,tuplet:t.tuplet,notes:t.notes.map(n=>[n.string,n.fret,n.status])}))}))})));
const notes=d=>d.analysis?.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures.flatMap(m=>m.slots.flatMap(t=>t.notes.filter(n=>n.status==='confirmed').map(n=>({string:n.string,fret:n.fret,x:t.x/(t.source?.pageWidth??p.width),y:(m.y+m.height/2)/(m.source?.pageHeight??p.height)}))))))??[];
const comparison=[],audits=[];
for(const item of manifest.cases){
 const old=JSON.parse(await readFile(`${prior}/verified/${item.id}.json`)),next=JSON.parse(await readFile(`${root}/${run}/${item.id}.json`)),source=layout.cases.find(c=>c.id===item.id);
 const before=notes(old),after=notes(next),lost=before.filter(n=>!after.some(m=>m.string===n.string&&m.fret===n.fret&&Math.abs(m.x-n.x)<.012&&Math.abs(m.y-n.y)<.015));
 const partLayout=next.analysis?.pages[0].partLayout,parts=partLayout?Object.values(Object.groupBy(partLayout.rows,r=>r.system)).map(rows=>rows.length):null;
 comparison.push({id:item.id,barsBefore:old.report.detectedBars,barsAfter:next.report.detectedBars,physicalBars:source.tabBarsPerRow.reduce((a,b)=>a+b,0),musicalBars:source.musicalBars[1]-source.musicalBars[0]+1,strictMusicUnchanged:JSON.stringify(music(old))===JSON.stringify(music(next)),priorNotes:before.length,lostPriorNotes:lost,partSystems:parts,expectedPartSystems:source.partsPerSystem??source.tabBarsPerRow.map(()=>1),partRows:partLayout?.rows,exportedParts:next.documents?.map(d=>({part:d.part,bars:d.document?.measures.length,error:d.error})),pageErrors:next.report.pageErrors,liveWorkers:next.report.liveWorkers,compileErrors:next.compileErrors??[],error:next.error});
 const oracle=bookPhotoOracle.cases.find(c=>c.id===item.id);
 if(oracle)audits.push({id:item.id,before:assessBookPhoto(old.analysis,oracle),after:assessBookPhoto(next.analysis,oracle)});
}
const failures=comparison.flatMap(c=>[...(c.lostPriorNotes.length?[`${c.id}: prior confirmed notes missing`]:[]),...(['book-9','book-11','book-12'].includes(c.id)&&!c.strictMusicUnchanged?[`${c.id}: established music changed`]:[]),...(c.expectedPartSystems.some(n=>n>1)&&JSON.stringify(c.partSystems)!==JSON.stringify(c.expectedPartSystems)?[`${c.id}: part inventory incomplete`]:[]),...(c.error||c.pageErrors.length||c.liveWorkers||c.compileErrors.length?[`${c.id}: runtime/conversion failure`]:[])]);
await writeFile(`${root}/comparison.json`,JSON.stringify({priorHashesPreserved:true,comparison,failures},null,2));
await writeFile(`${root}/accuracy.json`,JSON.stringify({scope:bookPhotoOracle.scope,audits,completePageSuccesses:0},null,2));
console.log(JSON.stringify({comparison:comparison.map(({partRows,...c})=>c),failures,accuracy:audits.map(a=>({id:a.id,before:{pitch:a.before.correctPitchEvents,rhythm:a.before.correctRhythmEvents},after:{pitch:a.after.correctPitchEvents,rhythm:a.after.correctRhythmEvents},expectedEvents:a.after.expectedEvents,exactBars:a.after.exactBars,extraEvents:a.after.extraEvents,noteCounts:a.after.checks.map(c=>c.noteCounts)}))},null,2));
if(failures.length)process.exitCode=1;
