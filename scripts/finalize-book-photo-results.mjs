// Rebuild only review metadata/documents from saved optical results. Never
// replace photographed glyph readings with an oracle or synthesized notes.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {analysisPartOptions} from '../src/pdf/tab-import/photoParts.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {summarizeAnalysis} from '../src/pdf/tab-import/recognition.js';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
const root=process.argv[2]??'artifacts/book-photo-followup-20261006',out=`${root}/final`;await mkdir(out,{recursive:true});
const manifest=JSON.parse(await readFile('artifacts/book-photo-20261005/manifest.json')),reports=[];
for(const c of manifest.cases){
 const saved=JSON.parse(await readFile(`${root}/verified/${c.id}.json`));
 if(!saved.analysis)throw Error(`${c.id}: missing analysis`);
 const analysis={...saved.analysis,summary:summarizeAnalysis(saved.analysis.pages)},parts=analysisPartOptions(analysis);
 const documents=(parts.length?parts:[null]).map(part=>{try{const document=analysisToDocument(analysis,{part});return {part,document,compileErrors:compileDocumentV2(document).errors};}catch(e){return {part,error:e.message};}});
 const report={...saved.report,summary:analysis.summary,compileErrors:documents.flatMap(d=>d.compileErrors??[])};
 await writeFile(`${out}/${c.id}.json`,JSON.stringify({analysis,...(parts.length?{documents}: {document:documents[0].document}),compileErrors:report.compileErrors,report}));reports.push(report);
}
await writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2));await writeFile(`${out}/report.json`,JSON.stringify(reports,null,2));
const files=['geometry.js','geometry.worker.js','cameraPhotoGeometry.js','photoParts.js','recognition.js','scoreAdapter.js','paperScan.js','usePdfTabImport.js','MobilePdfTabImport.jsx','DesktopPdfTabImport.jsx'];
await writeFile(`${out}/source-hashes.json`,JSON.stringify(await Promise.all(files.map(async name=>({path:`src/pdf/tab-import/${name}`,sha256:createHash('sha256').update(await readFile(`src/pdf/tab-import/${name}`)).digest('hex')}))),null,2));
if(reports.some(r=>r.compileErrors.length))throw Error('Document compilation failed');console.log('Finalized 9 saved optical results; no OCR rerun or oracle substitution.');
