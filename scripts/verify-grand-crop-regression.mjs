import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out='artifacts/grand-color-20261006';await mkdir(out,{recursive:true});
const sources=JSON.parse(await readFile('artifacts/present-check-20261006/sources.json'));
const before=await readFile('work/grand-color-20261006/staffSystems.js','utf8');
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();const browser=await qualityBrowser();
try{const page=await browser.newPage();await page.route('**/__beforeSystems.js',r=>r.fulfill({contentType:'text/javascript',body:before.replaceAll("'../pdf/","'/src/pdf/").replaceAll("'./","'/src/omr/")}));await page.route('**/__cropcheck',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__cropcheck`);
 const reports=[];
 for(const source of sources.filter(s=>s.id!=='present')){
  await page.locator('input').setInputFiles(source.path);
  const result=await page.evaluate(async()=>{
   const {loadTabPdf}=await import('/src/pdf/tab-import/loadTabPdf.js'),{cropNotationSystems}=await import('/src/omr/staffSystems.js'),{cropNotationSystems:old}=await import('/__beforeSystems.js'),{cropPianoMeasure}=await import('/src/omr/pianoStaffRecognition.js');
   const task=loadTabPdf(new Uint8Array(await document.querySelector('input').files[0].arrayBuffer()));const reports=[];
   const same=(a,b)=>a.byteLength===b.byteLength&&new Uint8Array(a).every((v,i)=>v===new Uint8Array(b)[i]);
   try{const pdf=await task.promise;for(let number=1;number<=pdf.numPages;number++){
    const p=await pdf.getPage(number),v=p.getViewport({scale:3.5}),c=document.createElement('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);const ctx=c.getContext('2d',{willReadFrequently:true});await p.render({canvasContext:ctx,viewport:v}).promise;const im=ctx.getImageData(0,0,c.width,c.height);
    const a=old(im.data,im.width,im.height),b=cropNotationSystems(im.data,im.width,im.height,{piano:true}),plain=cropNotationSystems(im.data,im.width,im.height);
    reports.push({page:number,staffs:a.length,plainUnchanged:JSON.stringify(a)===JSON.stringify(plain)&&a.every((s,i)=>same(s.rgba,plain[i].rgba)&&same(s.extension,plain[i].extension)),standardUnchanged:a.length===b.length&&a.every((s,i)=>same(s.rgba,b[i].rgba)&&JSON.stringify(s.measures)===JSON.stringify(b[i].measures)&&s.measures.every((_,j)=>[null,Math.floor(s.staff.spacing*9)].every(header=>{const x=cropPianoMeasure(s,j,.5,header),y=cropPianoMeasure(b[i],j,.5,header);return x.width===y.width&&x.height===y.height&&same(x.rgba,y.rgba);}))),bars:a.reduce((n,s)=>n+s.measures.length,0)});
    c.width=c.height=0;p.cleanup();
   }return reports;}finally{await task.destroy();}
  });reports.push({source:source.id,pages:result});console.log(JSON.stringify({source:source.id,pages:result.length,pass:result.every(p=>p.plainUnchanged&&p.standardUnchanged)}));
 }
 await writeFile(`${out}/crop-regression.json`,JSON.stringify(reports,null,2));assert(reports.every(r=>r.pages.every(p=>p.plainUnchanged&&p.standardUnchanged)));
}finally{await browser.close();await server.close();}
