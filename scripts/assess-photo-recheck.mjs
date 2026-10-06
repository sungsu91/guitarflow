import {readFile,writeFile} from 'node:fs/promises';
import {assessBookPhoto} from './assess-book-photo.mjs';
import {bookPhotoOracle} from '../tests/fixtures/book-photo-oracle.mjs';
import {canonPhotoOracle} from '../tests/fixtures/canon-photo-oracle.mjs';
const [root='artifacts/photo-recheck-20261006',prefix='candidate',baselineRoot=root,baselinePrefix='baseline']=process.argv.slice(2),manifest=JSON.parse(await readFile(`${root}/manifest.json`));
const report=[],missing=[];
for(const item of manifest.cases){
 const group=item.group==='book'?'book':'print';let candidate;
 try{candidate=JSON.parse(await readFile(`${root}/${prefix}-${group}/${item.id}.json`));}catch(error){if(error.code!=='ENOENT')throw error;missing.push(item.id);continue;}
 const baseline=JSON.parse(await readFile(`${baselineRoot}/${baselinePrefix}-${group}/${item.id}.json`)),losses=[],rhythmRelocations=[];
 let established=0;
 for(const page of baseline.analysis?.pages??[])for(const staff of page.staffs)for(const m of staff.measures){
  const oldWidth=m.source?.pageWidth??page.width,oldHeight=m.source?.pageHeight??page.height;
  const newPage=candidate.analysis?.pages.find(p=>p.page===page.page);
  const matches=newPage?.staffs.flatMap(s=>s.measures).filter(n=>{
   const w=n.source?.pageWidth??newPage.width,h=n.source?.pageHeight??newPage.height;
   return Math.abs(m.y/oldHeight-n.y/h)<.012&&Math.abs(m.x/oldWidth-n.x/w)<.012&&Math.abs((m.x+m.width)/oldWidth-(n.x+n.width)/w)<.012;
  })??[];
  const next=matches.length===1?matches[0]:null;
  const notes=next?.slots.flatMap(s=>s.notes.filter(n=>n.status==='confirmed').map(n=>({string:n.string,fret:n.fret,dead:!!n.dead,position:(s.x-next.x)/next.width,source:n.source,method:s.method})))??[];
  for(const slot of m.slots)for(const note of slot.notes.filter(n=>n.status==='confirmed')){
   established++;const at=(slot.x-m.x)/m.width;
   const identity=n=>n.string===note.string&&n.fret===note.fret&&n.dead===!!note.dead;
   if(notes.some(n=>identity(n)&&Math.abs(n.position-at)<.035))continue;
   // An unknown rhythm slot can collect a nearby chord digit. A recovered
   // stem then places the SAME glyph on its measured column. Require its
   // actual source box to match, not a widened musical-position tolerance.
   const width=next?.source?.pageWidth??newPage?.width,height=next?.source?.pageHeight??newPage?.height;
   const relocated=!slot.duration&&note.source&&notes.find(n=>identity(n)&&n.source&&['wide-photo-stem','isolated-detached-quarter'].includes(n.method)&&['x','y','width','height'].every(key=>Math.abs(n.source[key]/(['x','width'].includes(key)?width:height)-note.source[key]/(['x','width'].includes(key)?oldWidth:oldHeight))<.001));
   if(relocated)rhythmRelocations.push({staff:staff.id,measure:m.source.measure,string:note.string,fret:note.fret,from:at,to:relocated.position,sourceBoxPreserved:true});
   else losses.push({staff:staff.id,measure:m.source.measure,string:note.string,fret:note.fret,position:at});
  }
 }
 const oracle=[canonPhotoOracle,...bookPhotoOracle.cases].find(c=>c.id===item.id);
 const audit=oracle?{before:assessBookPhoto(baseline.analysis,oracle),after:assessBookPhoto(candidate.analysis,oracle)}:null;
 report.push({id:item.id,established,preserved:established-losses.length,losses,rhythmRelocations,bars:candidate.report.detectedBars,expectedPhysicalTabBars:item.expectedBars,barCountOnly:item.expectedBars==null?null:candidate.report.detectedBars===item.expectedBars,errors:[...(candidate.report.pageErrors??[]),...(candidate.report.compileErrors??[])],liveWorkers:candidate.report.liveWorkers,audit,wholePageVerified:false});
}
await writeFile(`${root}/${prefix}-comparison.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report.map(r=>({id:r.id,established:r.established,preserved:r.preserved,losses:r.losses.length,bars:r.bars,expected:r.expectedPhysicalTabBars,exactSampleBars:r.audit?[r.audit.before.exactBars,r.audit.after.exactBars]:null})),null,2));
if(missing.length)console.error(`Missing completed photo analyses: ${missing.join(', ')}`);
if(missing.length||report.some(r=>r.losses.length||r.errors.length||r.liveWorkers))process.exitCode=1;
