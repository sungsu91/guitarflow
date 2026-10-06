import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const label=process.argv[2]??'baseline',root='artifacts/flower-connections-20261006',out=`${root}/${label}`,source='C:/Users/User/Desktop/sheet music/Flower Dance.pdf';await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();const browser=await qualityBrowser();
try{
 const page=await browser.newPage();await page.route('**/__flower',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__flower`);await page.locator('input').setInputFiles(source);
 await page.exposeFunction('report',p=>console.log(JSON.stringify(p)));
 const result=await page.evaluate(async()=>{
  const {importPdfTab}=await import('/src/pdf/tab-import/importPdfTab.js'),{analysisToDocument}=await import('/src/pdf/tab-import/scoreAdapter.js'),{compileDocumentV2}=await import('/src/etudes/scoreModel.js');
  const start=performance.now(),progress=[];
  const analysis=await importPdfTab(document.querySelector('input').files[0],{sourceMode:'tab',signal:AbortSignal.timeout(600000),debug:true,onProgress:p=>{progress.push({ms:performance.now()-start,progress:p.progress,message:p.message});if(p.detail?.phase==='complete')window.report(progress.at(-1));}});
  const documentResult=analysisToDocument(analysis),compiled=compileDocumentV2(documentResult);
  return {analysis,document:documentResult,ms:performance.now()-start,progress,errors:compiled.errors};
 });
 for(const [i,preview] of result.analysis.previews.entries())await writeFile(`${out}/page-${i+1}.jpg`,Buffer.from(preview.split(',')[1],'base64'));delete result.analysis.previews;
 await writeFile(`${out}/analysis.json`,JSON.stringify(result.analysis));await writeFile(`${out}/document.json`,JSON.stringify(result.document));
 const bars=result.analysis.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures));
 const crops=await page.evaluate(async({analysis,wanted})=>{
  const {loadTabPdf}=await import('/src/pdf/tab-import/loadTabPdf.js'),task=loadTabPdf(new Uint8Array(await document.querySelector('input').files[0].arrayBuffer()));const pdf=await task.promise,images=[];let index=0;
  try{for(const a of analysis.pages){const selected=a.staffs.flatMap(s=>s.measures.map(m=>({staff:s,measure:m,number:++index}))).filter(m=>wanted.includes(m.number));if(!selected.length)continue;
   const p=await pdf.getPage(a.page),base=p.getViewport({scale:1});
   for(const {staff:s,measure:m,number} of selected){const source=m.source,scale=[3.5,4.5].find(scale=>Math.ceil(base.width*scale)===source.pageWidth);if(!scale)throw Error('Unexpected source render size');const v=p.getViewport({scale}),c=document.createElement('canvas');c.width=source.pageWidth;c.height=source.pageHeight;await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;
    const spacing=s.spacing*source.pageWidth/a.width,pad=spacing*2,x=Math.max(0,Math.floor(m.x-pad)),y=Math.max(0,Math.floor(source.y-pad)),right=Math.min(c.width,Math.ceil(m.x+m.width+pad)),bottom=Math.min(c.height,Math.ceil(source.y+source.height+spacing*4.5)),b=document.createElement('canvas');b.width=right-x;b.height=bottom-y;b.getContext('2d').drawImage(c,x,y,b.width,b.height,0,0,b.width,b.height);images.push({number,png:b.toDataURL()});}
  }}finally{await task.destroy();}return images;
 },{analysis:result.analysis,wanted:[11,12,27,28,48,49]});
 for(const c of crops)await writeFile(`${out}/bar-${c.number}.png`,Buffer.from(c.png.split(',')[1],'base64'));
 const report={source,sha256:createHash('sha256').update(await readFile(source)).digest('hex'),ms:result.ms,summary:result.analysis.summary,errors:result.errors,review:bars.flatMap((m,i)=>m.needsReview?[{bar:i+1,reasons:m.reasons,slots:m.slots.map(s=>({x:s.x,duration:s.duration,rest:s.rest,status:s.status,notes:s.notes.map(n=>[n.string,n.fret,n.reading,n.status,n.reasons]),rejected:s.rejections}))}]:[]),progress:result.progress};
 await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({label,ms:result.ms,summary:result.analysis.summary,errors:result.errors}));
}finally{await browser.close();await server.close();}
