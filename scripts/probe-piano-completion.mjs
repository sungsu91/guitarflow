import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out=process.env.PIANO_COMPLETION_OUT??'artifacts/piano-completion-20261006';
await mkdir(out,{recursive:true});
const prior=JSON.parse(await readFile('artifacts/grand-color-20261006/p4-focused/now-p4-piano-staff.json'));
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();const browser=await qualityBrowser();
try{
 const page=await browser.newPage();await page.route('**/__piano-probe',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__piano-probe`);await page.locator('input').setInputFiles('C:/Users/User/Desktop/sheet music/NOW.pdf');
 const result=await page.evaluate(async prior=>{
  const {loadTabPdf}=await import('/src/pdf/tab-import/loadTabPdf.js'),{cropNotationSystems}=await import('/src/omr/staffSystems.js'),{parsePianoTokens}=await import('/src/omr/pianoPolyphony.js'),{refinePianoChordHeads}=await import('/src/omr/pianoHeadEvidence.js'),{pianoMeasureConsensus}=await import('/src/omr/pianoStaffRecognition.js'),{attachPianoTieEvidence}=await import('/src/omr/pianoTieEvidence.js');
  const task=loadTabPdf(new Uint8Array(await document.querySelector('input').files[0].arrayBuffer()));
  try{
   const pdf=await task.promise,p=await pdf.getPage(4),v=p.getViewport({scale:3.5}),c=document.createElement('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);const ctx=c.getContext('2d',{willReadFrequently:true});await p.render({canvasContext:ctx,viewport:v}).promise;
   const im=ctx.getImageData(0,0,c.width,c.height),system=cropNotationSystems(im.data,c.width,c.height,{piano:true})[5];
   const patches=[];
   for(const [label,x,y] of [['beam',1653,1247],['head',1653,1315],['bass',1653,1350]]){
    const b=document.createElement('canvas');b.width=100;b.height=50;b.getContext('2d').drawImage(c,x-50,y-25,100,50,0,0,100,50);
    patches.push({label,png:b.toDataURL().split(',')[1]});
   }
   const results=prior.pianoReadings.map((a,index)=>{const readings=a.raw.map(raw=>refinePianoChordHeads(parsePianoTokens(raw,{key:'G',meter:[4,4]}),system,index));return {bar:index+1,readings,chosen:pianoMeasureConsensus(readings,'clef-F4')};});
   const chosen=results.every(r=>r.chosen)?attachPianoTieEvidence(system,parsePianoTokens(results.map(r=>r.chosen.raw).join('+'),{key:'G',meter:[4,4]})):null;
   const pixels=[];for(let y=1237;y<=1253;y++){
    let row='';for(let x=1608;x<=1675;x++)row+=im.data[(y*c.width+x)*4]<180?'#':'.';pixels.push(`${y}: ${row}`);
   }
   const g=system.staff.spacing,cy=system.staff.lines.at(-1)-9*system.staff.height/8,stats=[];
   for(const side of [-1,1]){let n=0,dark=0,rows=0;for(let dy=-Math.floor(g*.33);dy<=g*.33;dy++)for(let dx=-Math.floor(g*.43);dx<=g*.43;dx++){if((dx/(g*.43))**2+(dy/(g*.33))**2>1)continue;const y=Math.round(cy+dy);if(system.staff.lines.some(l=>Math.abs(y-l)<=system.staff.thickness/2+.5))continue;n++;dark+=im.data[(y*c.width+Math.round(1653+side*g*.48+dx))*4]<180?1:0;}
   for(let dy=-Math.floor(g*.33);dy<=g*.33;dy++){const y=Math.round(cy+dy);if(system.staff.lines.some(l=>Math.abs(y-l)<=system.staff.thickness/2+1))continue;let hit=0,total=0;for(let dx=Math.ceil(g*.2);dx<=g*2.2;dx++){total++;hit+=im.data[(y*c.width+1653+side*dx)*4]<180?1:0;}if(hit/total>=.9)rows++;}stats.push({side,n,dark,support:dark/n,rows});}
   return {results,chosen,patches,pixels,stats};
  }finally{await task.destroy();}
 },prior);
 for(const p of result.patches)await writeFile(`${out}/${p.label}.png`,Buffer.from(p.png,'base64'));delete result.patches;
 await writeFile(`${out}/p4-replay.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result.results.map(r=>({bar:r.bar,accepted:!!r.chosen,changes:r.readings.map(r=>r.headEvidence)}))));
}finally{await browser.close();await server.close();}
