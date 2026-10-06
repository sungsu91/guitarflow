import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const base='artifacts/flower-connections-20261006',analysis=JSON.parse(await readFile(`${base}/baseline/analysis.json`));
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();const browser=await qualityBrowser();
try{
 const page=await browser.newPage();await page.route('**/__probe',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__probe`);await page.locator('input').setInputFiles('C:/Users/User/Desktop/sheet music/Flower Dance.pdf');
 const result=await page.evaluate(async ({analysis,ocrLabels})=>{
  const {loadTabPdf}=await import('/src/pdf/tab-import/loadTabPdf.js'),{binaryPage,removeStaffRules,fretComponents,analyseGeometry}=await import('/src/pdf/tab-import/geometry.js');
  const task=loadTabPdf(new Uint8Array(await document.querySelector('input').files[0].arrayBuffer())),pdf=await task.promise,result=[];let bar=0;
  try{for(const p of analysis.pages){const selected=p.staffs.flatMap(s=>s.measures.map(m=>({s,m,bar:++bar}))).filter(o=>[27,28,48,49].includes(o.bar));if(!selected.length)continue;
   const source=await pdf.getPage(p.page),view=source.getViewport({scale:3.5}),canvas=document.createElement('canvas');canvas.width=p.width;canvas.height=p.height;const ctx=canvas.getContext('2d');await source.render({canvasContext:ctx,viewport:view}).promise;const rgba=ctx.getImageData(0,0,p.width,p.height).data,ink=binaryPage(rgba,p.width,p.height);
   const geometry=analyseGeometry({rgba,width:p.width,height:p.height,page:p.page});
   if(ocrLabels){const {createLocalOcr}=await import('/src/pdf/tab-import/localOcr.js'),{recognizeConnectionLabels}=await import('/src/pdf/tab-import/tabConnectionLabels.js');const ocr=await createLocalOcr();try{await recognizeConnectionLabels(geometry,ocr);}finally{await ocr.close();}}
   for(const [from,to,line] of p.page===2?[[1329,1364,712],[1671,1696,712],[1571,1596,775]]:[[1394,1524,714],[1687,1719,756],[1752,1785,714]]){
    const strip=[];for(let y=line-35;y<=line+35;y++)strip.push(Array.from({length:to-from+15},(_,i)=>ink[y*p.width+from-7+i]?'#':'.').join(''));
    result.push({strip:{from,to,line,rows:strip}});
   }
   for(const o of selected){const clean=removeStaffRules(ink,p.width,p.height,o.s),parts=fretComponents(clean,p.width,p.height,o.s).filter(c=>c.cx>o.m.x&&c.cx<o.m.x+o.m.width);result.push({bar:o.bar,parts:parts.map(c=>({...c,pixels:Array.from({length:c.height},(_,y)=>Array.from({length:c.width},(_,x)=>clean[(c.y+y)*p.width+c.x+x]?'#':'.').join(''))})),geometry:geometry.staffs.find(s=>s.id===o.s.id)});}
  }}finally{await task.destroy();}return result;
 },{analysis,ocrLabels:process.argv.includes('--labels')});
 await mkdir(`${base}/probe`,{recursive:true});await writeFile(`${base}/probe/parts.json`,JSON.stringify(result,null,2));
 for(const o of result)if(o.parts)console.log(JSON.stringify({bar:o.bar,parts:o.parts.filter(p=>o.bar===28&&p.string===4||o.bar===49&&[1,2,3].includes(p.string))}));
}finally{await browser.close();await server.close();}
