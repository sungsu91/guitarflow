import {readFile,writeFile} from 'node:fs/promises';
import {assessBookPhoto} from './assess-book-photo.mjs';
import {bookPhotoOracle} from '../tests/fixtures/book-photo-oracle.mjs';
import {canonPhotoOracle} from '../tests/fixtures/canon-photo-oracle.mjs';
const [root='artifacts/photo-recheck-20261006',prefix='candidate']=process.argv.slice(2),manifest=JSON.parse(await readFile(`${root}/manifest.json`));
const report=[],missing=[];
for(const item of manifest.cases){
 const group=item.group==='book'?'book':'print';let candidate;
 try{candidate=JSON.parse(await readFile(`${root}/${prefix}-${group}/${item.id}.json`));}catch(error){if(error.code!=='ENOENT')throw error;missing.push(item.id);continue;}
 const baseline=JSON.parse(await readFile(`${root}/baseline-${group}/${item.id}.json`)),losses=[];
 let established=0;
 for(const page of baseline.analysis?.pages??[])for(const staff of page.staffs)for(const m of staff.measures){
  const oldWidth=m.source?.pageWidth??page.width,oldHeight=m.source?.pageHeight??page.height;
  const newPage=candidate.analysis?.pages.find(p=>p.page===page.page);
  const matches=newPage?.staffs.flatMap(s=>s.measures).filter(n=>{
   const w=n.source?.pageWidth??newPage.width,h=n.source?.pageHeight??newPage.height;
   return Math.abs(m.y/oldHeight-n.y/h)<.012&&Math.abs(m.x/oldWidth-n.x/w)<.012&&Math.abs((m.x+m.width)/oldWidth-(n.x+n.width)/w)<.012;
  })??[];
  const next=matches.length===1?matches[0]:null;
  const notes=next?.slots.flatMap(s=>s.notes.filter(n=>n.status==='confirmed').map(n=>({string:n.string,fret:n.fret,dead:!!n.dead,position:(s.x-next.x)/next.width})))??[];
  for(const slot of m.slots)for(const note of slot.notes.filter(n=>n.status==='confirmed')){
   established++;const at=(slot.x-m.x)/m.width;
   if(!notes.some(n=>n.string===note.string&&n.fret===note.fret&&n.dead===!!note.dead&&Math.abs(n.position-at)<.035))losses.push({staff:staff.id,measure:m.source.measure,string:note.string,fret:note.fret,position:at});
  }
 }
 const oracle=[canonPhotoOracle,...bookPhotoOracle.cases].find(c=>c.id===item.id);
 const audit=oracle?{before:assessBookPhoto(baseline.analysis,oracle),after:assessBookPhoto(candidate.analysis,oracle)}:null;
 report.push({id:item.id,established,preserved:established-losses.length,losses,bars:candidate.report.detectedBars,expectedPhysicalTabBars:item.expectedBars,barCountOnly:item.expectedBars==null?null:candidate.report.detectedBars===item.expectedBars,errors:[...(candidate.report.pageErrors??[]),...(candidate.report.compileErrors??[])],liveWorkers:candidate.report.liveWorkers,audit,wholePageVerified:false});
}
await writeFile(`${root}/${prefix}-comparison.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report.map(r=>({id:r.id,established:r.established,preserved:r.preserved,losses:r.losses.length,bars:r.bars,expected:r.expectedPhysicalTabBars,exactSampleBars:r.audit?[r.audit.before.exactBars,r.audit.after.exactBars]:null})),null,2));
if(missing.length)console.error(`Missing completed photo analyses: ${missing.join(', ')}`);
if(missing.length||report.some(r=>r.losses.length||r.errors.length||r.liveWorkers))process.exitCode=1;
