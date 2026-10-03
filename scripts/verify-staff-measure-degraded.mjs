import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const out=process.env.STAFF_DEGRADED_OUTPUT??'artifacts/omr-deep-audit/degraded';await mkdir(out,{recursive:true});
try{
 const page=await browser.newPage();await page.route('**/__measure-degraded',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));await page.goto('http://127.0.0.1:5174/__measure-degraded');
 await page.exposeFunction('record',async r=>{await writeFile(`${out}/${r.kind}.json`,JSON.stringify(r,null,2));console.log(JSON.stringify(r));});
 const png=(await readFile('artifacts/omr-deep-audit/page-2-system-1.png')).toString('base64');
 const results=await page.evaluate(async png=>{
  const {cropNotationSystems}=await import('/src/omr/staffSystems.js'),{recognizeStaffSystem,hasCompleteStaffRhythm}=await import('/src/omr/staffRecognition.js'),{createStaffOmrClient}=await import('/src/omr/staffOmrClient.js');
  const img=new Image();img.src='data:image/png;base64,'+png;await img.decode();const omr=await createStaffOmrClient(),results=[];
  const expected=[[['/','4'],['/','4'],['/','2']],[[[72,77,81],'4'],[[76,79],'8'],[[74,77],'8'],[[60,72,76],'4'],[[70,74],'8'],[[69,72],'8']],[[[55,67,71],'4'],[[69,72],'4'],[[60,67,72],'4'],['/','8'],[[55],'16'],[[57],'16']]];
  try{for(const kind of ['original','low-resolution','blur','low-contrast','jpeg']){
   const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d',{willReadFrequently:true});
   ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);
   if(kind==='low-resolution'){const small=document.createElement('canvas');small.width=Math.round(c.width*.6);small.height=Math.round(c.height*.6);small.getContext('2d').drawImage(img,0,0,small.width,small.height);ctx.drawImage(small,0,0,c.width,c.height);}
   else{if(kind==='blur')ctx.filter='blur(.55px)';ctx.drawImage(img,0,0);ctx.filter='none';}
   if(kind==='low-contrast'){const im=ctx.getImageData(0,0,c.width,c.height);for(let i=0;i<im.data.length;i+=4)for(let k=0;k<3;k++)im.data[i+k]=95+im.data[i+k]*.55;ctx.putImageData(im,0,0);}
   if(kind==='jpeg'){const compressed=new Image();compressed.src=c.toDataURL('image/jpeg',.15);await compressed.decode();ctx.drawImage(compressed,0,0);}
   const im=ctx.getImageData(0,0,c.width,c.height),systems=cropNotationSystems(im.data,im.width,im.height),start=performance.now();let calls=0;
   const parsed=await recognizeStaffSystem({recognize:async input=>{calls++;return omr.recognize(input);}},systems[0]);
   const actual=parsed.measures.map(m=>m.events.map(e=>[e.rhythmSlash?'/':e.notes.map(n=>n.midi),e.duration]));
   const matches=expected.reduce((sum,bar,i)=>sum+bar.filter((e,j)=>JSON.stringify(e)===JSON.stringify(actual[i]?.[j])).length,0),total=expected.flat().length;
   const r={kind,seconds:(performance.now()-start)/1000,calls,matches,total,exactEventPercent:100*matches/total,complete:parsed.measures.filter(hasCompleteStaffRhythm).length,bars:parsed.measures.length,actual,expected};
   await window.record(r);results.push(r);
  }}finally{omr.close();}return results;
 },png);
 for(const r of results){assert(r.calls<=14);assert.equal(r.bars,3);assert.equal(r.matches,r.total,r.kind);assert.equal(r.complete,3,r.kind);}
 await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
}finally{await browser.close();}
