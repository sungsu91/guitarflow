import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage();await page.route('**/__staff-degraded',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));await page.goto('http://127.0.0.1:5174/__staff-degraded');
 const png=(await readFile('artifacts/let-it-be-ocr/system-3.png')).toString('base64');
 await page.exposeFunction('saveDegraded',async result=>{await writeFile(`artifacts/let-it-be-ocr/degraded-${result.kind}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));});
 const result=await page.evaluate(async png=>{
  const {recognizeStaffSystem,hasCompleteStaffRhythm}=await import('/src/omr/staffRecognition.js');const {parseStaffTokens}=await import('/src/omr/staffTokens.js');const {createStaffOmrClient}=await import('/src/omr/staffOmrClient.js');
  const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();const omr=await createStaffOmrClient(),results=[];
  try{for(const kind of ['low-resolution','blur','low-contrast','jpeg']){
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
   if(kind==='low-resolution'){const small=document.createElement('canvas');small.width=Math.round(canvas.width*.6);small.height=Math.round(canvas.height*.6);small.getContext('2d').drawImage(image,0,0,small.width,small.height);ctx.drawImage(small,0,0,canvas.width,canvas.height);small.width=small.height=0;}
   else{if(kind==='blur')ctx.filter='blur(0.55px)';ctx.drawImage(image,0,0);ctx.filter='none';}
   if(kind==='low-contrast'){const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<pixels.data.length;i+=4)for(let c=0;c<3;c++)pixels.data[i+c]=95+pixels.data[i+c]*.55;ctx.putImageData(pixels,0,0);}
   if(kind==='jpeg'){const compressed=new Image();compressed.src=canvas.toDataURL('image/jpeg',.15);await compressed.decode();ctx.drawImage(compressed,0,0);}
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),readings=[],start=performance.now(),parsed=await recognizeStaffSystem({recognize:async input=>{const result=await omr.recognize(input);readings.push(result.text);return result;}},{width:canvas.width,height:canvas.height,staff:{spacing:15},rgba:pixels.data.buffer});
   const before=parseStaffTokens(readings[0]),result={kind,calls:readings.length,seconds:(performance.now()-start)/1000,before:{bars:before.measures.length,complete:before.measures.filter(hasCompleteStaffRhythm).length},after:{bars:parsed.measures.length,complete:parsed.measures.filter(hasCompleteStaffRhythm).length},accepted:parsed.retry?.acceptedMeasures??[],unchangedValidBars:before.measures.every((m,i)=>!hasCompleteStaffRhythm(m)||JSON.stringify(m)===JSON.stringify(parsed.measures[i])),rawBefore:readings[0],rawAfter:parsed.raw};
   await window.saveDegraded(result);results.push(result);canvas.width=canvas.height=0;
  }}finally{omr.close();}return results;
 },png);
 for(const r of result){assert(r.calls<=2);assert.equal(r.before.bars,r.after.bars);assert(r.after.complete>=r.before.complete);assert(r.unchangedValidBars);}
 await writeFile('artifacts/let-it-be-ocr/degraded-results.json',JSON.stringify(result,null,2));
}finally{await browser.close();}
