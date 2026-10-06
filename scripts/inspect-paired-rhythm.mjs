import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const [file,out]=process.argv.slice(2),server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();const browser=await qualityBrowser();
try{
 const page=await browser.newPage();await page.route('**/__paired',r=>r.fulfill({body:'<input type="file">',contentType:'text/html'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__paired`);await page.locator('input').setInputFiles(file);
 const result=await page.evaluate(async()=>{
 const {loadTabPdf}=await import('/src/pdf/tab-import/loadTabPdf.js');const task=loadTabPdf(new Uint8Array(await document.querySelector('input').files[0].arrayBuffer()));
 try{
  const pdf=await task.promise,p=await pdf.getPage(1),v=p.getViewport({scale:3.5}),canvas=document.createElement('canvas');canvas.width=Math.ceil(v.width);canvas.height=Math.ceil(v.height);await p.render({canvasContext:canvas.getContext('2d'),viewport:v}).promise;
  const im=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height),{binaryPage,analyseGeometry,detectStaffs}=await import('/src/pdf/tab-import/geometry.js'),{projectPdfText}=await import('/src/pdf/tab-import/pdfText.js'),{staffMeasureInk}=await import('/src/omr/staffMeasureInk.js'),{notationBarBounds}=await import('/src/pdf/tab-import/chordGeometry.js'),{pairedStemDuration}=await import('/src/pdf/tab-import/pairedStaffRhythm.js');
  const ink=binaryPage(im.data,im.width,im.height),rules=binaryPage(im.data,im.width,im.height,230),geo=analyseGeometry({rgba:im.data,width:im.width,height:im.height,page:1,glyphs:projectPdfText(await p.getTextContent(),v)}),staffs=detectStaffs(rules,im.width,im.height,undefined,5);
  const rows=staffs.slice(0,1).map(s=>({staff:s,boxes:notationBarBounds(ink,im.width,s).map((b,i)=>({box:b,stems:staffMeasureInk(ink,im.width,im.height,s,b,{first:i===0}).stems.map(st=>({...st,duration:pairedStemDuration(ink,im.width,im.height,s,st)}))}))}));
  return {rows,tab:geo.staffs[0],png:canvas.toDataURL('image/png')};
 }finally{task.destroy();}
 });await writeFile(out+'.png',Buffer.from(result.png.split(',')[1],'base64'));delete result.png;await writeFile(out+'.json',JSON.stringify(result,(k,v)=>['grayscale','bitmap','paddedGlyph'].includes(k)?undefined:v));console.log(JSON.stringify(result.rows));
}finally{await browser.close();await server.close();}
