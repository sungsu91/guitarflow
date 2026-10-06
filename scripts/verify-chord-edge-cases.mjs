import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const out='artifacts/chord-regression-audit/chord-edge-cases';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
try{
 const page=await browser.newPage();
 await page.route('**/__chord-edges',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Chord OCR regression</title>'}));
 await page.goto('http://127.0.0.1:5174/__chord-edges');
 for(const variant of ['no-chords','silence','mixed-native-raster','mixed-native-minor']){
  const names=variant==='no-chords'?[]:variant==='silence'?['G','N.C.','D7','Am']:variant==='mixed-native-minor'?['Cm7','Am','D7','G']:['G','Am','D7','G'];
  const result=await page.evaluate(async({variant,names})=>{
   const {binaryPage,detectStaffs}=await import('/src/pdf/tab-import/geometry.js');
   const {chordRegions}=await import('/src/pdf/tab-import/chordGeometry.js');
   const {recognizePageChords}=await import('/src/pdf/tab-import/chordRecognition.js');
   const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=600;const c=canvas.getContext('2d');c.fillStyle='white';c.fillRect(0,0,1400,600);c.strokeStyle='#222';c.lineWidth=2;
   for(let i=0;i<6;i++){c.beginPath();c.moveTo(50,180+i*20);c.lineTo(1350,180+i*20);c.stroke();}
   for(const x of [50,375,700,1025,1350]){c.beginPath();c.moveTo(x,180);c.lineTo(x,280);c.stroke();}
   c.font='bold 32px Georgia';c.fillStyle='#111';names.forEach((name,i)=>c.fillText(name,80+i*325,140));
   c.fillText('A Different Song',400,45);c.fillText('C G A',440,540);
   const data=c.getImageData(0,0,1400,600),staffs=detectStaffs(binaryPage(data.data,1400,600,230),1400,600);
   const native=variant.startsWith('mixed-native')?[{text:names[0],x:80,y:116,width:variant==='mixed-native-minor'?70:24,height:25,confidence:1,method:'pdf-chord-text'}]:[];
   const reads=await recognizePageChords(chordRegions(data.data,1400,600,staffs),native);
   return {names:reads.flatMap(r=>r.words.map(w=>w.name)),words:reads.flatMap(r=>r.words),unresolved:reads.flatMap(r=>r.unresolvedWords??[])};
  },{variant,names});
  results.push({variant,expected:names,...result,passed:JSON.stringify(names)===JSON.stringify(result.names)});console.log(JSON.stringify(results.at(-1)));
  if(variant.startsWith('mixed-native'))assert.equal(result.words[0].method,'pdf-chord-text','native chord text takes precedence over image character retries');
 }
 assert(results.every(r=>r.passed),'Chord OCR edge cases must preserve all symbols, including silence and mixed PDF text');
}finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));}
