import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out=process.env.PIANO_AUDIT_OUT??'artifacts/guitar-arrangement-20261006';await mkdir(out,{recursive:true});
const sources=JSON.parse(await readFile('artifacts/present-check-20261006/sources.json'));
const sourceId=process.argv[2],mode=process.argv[3]??'geometry',pageNumber=Number(process.argv[4]??1),seconds=Number(process.argv[5]??150);
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false,hmr:false}});await server.listen();const browser=await qualityBrowser();
try{
 for(const source of sources.filter(s=>!sourceId||s.id===sourceId)){
  const number=!sourceId&&source.id==='present'?3:pageNumber,key=`${source.id}-p${number}-${mode}`;
  const page=await browser.newPage();
  await page.exposeFunction('trace',async data=>{await appendFile(`${out}/${key}-trace.jsonl`,JSON.stringify(data)+'\n');if(data.event==='done'||data.event==='progress')console.log(JSON.stringify({key,...data}));});
  await page.addInitScript(()=>{
   const Base=window.Worker;window.workerTrace=[];
   window.Worker=class extends Base{
    constructor(url,...args){super(url,...args);this.url=String(url);this.requests=new Map();
     this.addEventListener('message',({data})=>{const request=this.requests.get(data.id);if(!request)return;this.requests.delete(data.id);const entry={event:'done',url:this.url,...request,ms:performance.now()-request.start,text:data.result?.text,error:data.error};window.workerTrace.push(entry);void window.trace(entry);});
    }
    postMessage(data,...args){if(this.url.includes('staff-omr')){const entry={action:data.action,id:data.id,width:data.width,height:data.height,start:performance.now()};this.requests.set(data.id,entry);void window.trace({event:'start',url:this.url,...entry});}return super.postMessage(data,...args);}
   };
  });
  await page.route('**/__present-profile',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__present-profile`);await page.locator('input').setInputFiles(source.path);
  const result=await page.evaluate(async({number,mode,seconds,staffId,barLimit})=>{
   const begin=performance.now(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),seconds*1000),signal=controller.signal;
   const {loadTabPdf}=await import('/src/pdf/tab-import/loadTabPdf.js');
   const {geometryInWorker,createTabPageAnalyzer}=await import('/src/pdf/tab-import/analyzeTabPage.js');
   const {projectPdfText}=await import('/src/pdf/tab-import/pdfText.js');const {projectChordText}=await import('/src/pdf/tab-import/chordRecognition.js');
   const task=loadTabPdf(new Uint8Array(await document.querySelector('input').files[0].arrayBuffer()),signal);let analyzer;
   try{
    const pdf=await task.wait(task.promise),p=await pdf.getPage(number),v=p.getViewport({scale:3.5}),canvas=document.createElement('canvas');canvas.width=Math.ceil(v.width);canvas.height=Math.ceil(v.height);const ctx=canvas.getContext('2d',{willReadFrequently:true});
    await p.render({canvasContext:ctx,viewport:v}).promise;const content=await p.getTextContent(),glyphs=projectPdfText(content,v),chordText=projectChordText(content,v);
    if(mode==='geometry'){
     const geometry=await geometryInWorker(ctx.getImageData(0,0,canvas.width,canvas.height),number,signal,glyphs,'staff',false,6);
     window.profileGeometry=geometry;
     const {planNotationSource}=await import('/src/omr/notationSourcePlan.js');const plans={};
     for(const sourceMode of ['staff','grand'])try{const p=planNotationSource(geometry.notationSystems,sourceMode);plans[sourceMode]={ids:p.systems.map(s=>s.id),excluded:p.excludedStaffIds};}catch(e){plans[sourceMode]={error:e.message};}
     return {ms:performance.now()-begin,totalPages:pdf.numPages,chordText,plans,geometry:{width:geometry.width,height:geometry.height,staffs:geometry.staffs.length,systems:geometry.notationSystems?.map(s=>({id:s.id,connectedStaffIds:s.connectedStaffIds,y:s.staff.y,spacing:s.staff.spacing,width:s.width,height:s.height,measures:s.measures.map(m=>({x:m.x,width:m.width,stems:m.stems.length,heads:m.stems.reduce((n,s)=>n+(s.heads?.length??0),0)}))}))}};
    }
    if(mode==='piano-staff'){
     const {createStaffOmrClient}=await import('/src/omr/staffOmrClient.js'),{recognizePianoStaff}=await import('/src/omr/pianoStaffRecognition.js');
     const geometry=await geometryInWorker(ctx.getImageData(0,0,canvas.width,canvas.height),number,signal,glyphs,'grand',false,6),system=geometry.notationSystems.find(s=>s.id===staffId);
     if(barLimit)system.measures=system.measures.slice(0,barLimit);
     const client=await createStaffOmrClient(signal);analyzer={close:()=>client.close()};
     const parsed=await recognizePianoStaff(client,system,{key:'G',meter:[4,4]},staffId%3===0?'clef-F4':'clef-G2',{signal});
     return {ms:performance.now()-begin,parsed};
    }
    if(mode==='sample'){
     const {createStaffOmrClient}=await import('/src/omr/staffOmrClient.js');
     const {cropStaffMeasure}=await import('/src/omr/staffMeasureRecognition.js');
     const {parseStaffTokens}=await import('/src/omr/staffTokens.js');
     const geometry=await geometryInWorker(ctx.getImageData(0,0,canvas.width,canvas.height),number,signal,glyphs,'staff',false,6);
     const client=await createStaffOmrClient(signal);analyzer={close:()=>client.close()};const readings=[];
     for(const margin of [.5,2]){const r=await client.recognize(cropStaffMeasure(geometry.notationSystems[2],0,margin));readings.push({margin,parsed:parseStaffTokens(r.text,{key:'G',meter:[4,4]})});}
     return {ms:performance.now()-begin,readings};
    }
    analyzer=createTabPageAnalyzer(signal);
    const analysis=await analyzer.analyze(ctx.getImageData(0,0,canvas.width,canvas.height),{page:number,glyphs,chordText,sourceMode:mode,target:{instrument:'piano',notationPitch:'concert'},signal,onProgress:f=>void window.trace({event:'progress',fraction:f,elapsedMs:performance.now()-begin})});
    return {ms:performance.now()-begin,totalPages:pdf.numPages,analysis};
   }catch(e){return {ms:performance.now()-begin,error:e.message,name:e.name,pianoReadings:e.pianoReadings};}
   finally{clearTimeout(timer);await analyzer?.close();await task.destroy();}
  },{number,mode,seconds,staffId:Number(process.env.PIANO_AUDIT_STAFF??9),barLimit:Number(process.env.PIANO_AUDIT_BARS??0)});
  result.workerTrace=await page.evaluate(()=>window.workerTrace);await writeFile(`${out}/${key}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({key,ms:result.ms,error:result.error,geometry:result.geometry,workers:result.workerTrace.length}));await page.close();
 }
}finally{await browser.close();await server.close();}
