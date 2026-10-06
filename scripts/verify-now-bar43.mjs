import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out='artifacts/editor-polish-20261006';await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false,hmr:false}});await server.listen();const browser=await qualityBrowser();
try{
 const page=await browser.newPage();
 await page.route('**/__now-bar43',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__now-bar43`);
 await page.locator('input').setInputFiles('C:/Users/User/Desktop/sheet music/NOW.pdf');
 await page.exposeFunction('trace',data=>console.log(JSON.stringify(data)));
 const result=await page.evaluate(async()=>{
  const start=performance.now(),signal=AbortSignal.timeout(120000);
  const {loadTabPdf}=await import('/src/pdf/tab-import/loadTabPdf.js'),{geometryInWorker}=await import('/src/pdf/tab-import/analyzeTabPage.js');
  const {createStaffOmrClient}=await import('/src/omr/staffOmrClient.js');
  const {parseStaffTokens,staffSystemToAnalysis}=await import('/src/omr/staffTokens.js');
  const {cropStaffMeasure,selectStaffMeasureReading}=await import('/src/omr/staffMeasureRecognition.js');
  const {analysisToDocument}=await import('/src/pdf/tab-import/scoreAdapter.js');
  const {compileDocumentV2}=await import('/src/etudes/scoreModel.js'),{scoreTimeline}=await import('/src/etudes/scorePlayback.js');
  const task=loadTabPdf(new Uint8Array(await document.querySelector('input').files[0].arrayBuffer()),signal);let omr;
  try{
   const pdf=await task.promise,p=await pdf.getPage(5),viewport=p.getViewport({scale:3.5}),c=document.createElement('canvas');c.width=Math.ceil(viewport.width);c.height=Math.ceil(viewport.height);const ctx=c.getContext('2d',{willReadFrequently:true});await p.render({canvasContext:ctx,viewport}).promise;
   const geometry=await geometryInWorker(ctx.getImageData(0,0,c.width,c.height),5,signal,[],'staff',false,6),system=geometry.notationSystems[0];
   await window.trace({stage:'geometry',systems:geometry.notationSystems.map(s=>({id:s.id,y:s.staff.y,measures:s.measures.length}))});
   omr=await createStaffOmrClient(signal);
   const row=await omr.recognize({rgba:system.rgba.slice(0),width:system.width,height:system.height});
   const parsed=parseStaffTokens(row.text,{key:'G',meter:[4,4]});await window.trace({stage:'row',raw:row.text});
   const readings=[];let chosen=null;const crops=[];
   for(const pad of [.5,2,1,2.5]){
    const crop=cropStaffMeasure(system,1,pad),canvas=document.createElement('canvas');canvas.width=crop.width;canvas.height=crop.height;canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(crop.rgba),crop.width,crop.height),0,0);crops.push(canvas.toDataURL().split(',')[1]);
    const read=await omr.recognize(crop);const raw=read.text.replace(/\+keySignature-[^+]+/g,'').replace(/\+timeSignature-[^+]+/g,'');readings.push(parseStaffTokens(raw,{key:'G',meter:[4,4]}));
    await window.trace({stage:'crop',pad,raw});
    if(readings.length>=2){chosen=selectStaffMeasureReading({key:'G',meter:[4,4]},readings,system.measures[1]);if(chosen)break;}
   }
   const target={instrument:'guitar',notationPitch:'concert'};
   const single={...parsed,measures:[chosen??parsed.measures[1]]},bound={...system,measures:[system.measures[1]]};
   const staff=staffSystemToAnalysis(single,{system:bound,page:5,width:c.width,height:c.height,target}).staff;
   const doc=analysisToDocument({fileName:'NOW-bar43.pdf',target,pages:[{page:5,width:c.width,height:c.height,notation:true,octaveShift:0,staffs:[staff]}],summary:{}});
   return {ms:performance.now()-start,row:parsed,readings,chosen,document:doc,audio:scoreTimeline(compileDocumentV2(doc).score,60).events.map(n=>[n.midi,n.start,n.duration]),crops};
  }catch(e){return {error:e.message,stack:e.stack};}finally{omr?.close();await task.destroy();}
 });
 for(const [i,crop] of (result.crops??[]).entries())await writeFile(`${out}/now-bar43-crop-${i}.png`,Buffer.from(crop,'base64'));delete result.crops;
 await writeFile(`${out}/now-bar43.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify({ms:result.ms,error:result.error,chosen:result.chosen,audio:result.audio}));
 assert(!result.error,result.error);
 assert.deepEqual(result.audio,[[69,0,.75],[67,.75,.25],[69,1,.75],[67,1.75,.25],[69,2,.25],[71,2.25,.75]]);
 assert.equal(result.chosen.events.at(-1).rest,true);assert.equal(result.chosen.events.at(-1).duration,'4');
 console.log('PASS: NOW page 5 printed bar 43, six pitches and their rhythm plus quarter rest.');
}finally{await browser.close();await server.close();}
