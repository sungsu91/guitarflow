import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {flowerAudit} from '../tests/fixtures/pdf-tab-flower-audit.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),out='artifacts/ocr-review-20261005';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
try{
 const page=await browser.newPage();await page.route('**/__zero',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));await page.goto('http://127.0.0.1:5174/__zero');
 const source='data:image/png;base64,'+(await readFile(`${out}/bars5-8-source.png`)).toString('base64');
 for(const variant of [{id:'jpeg-original',width:1880,quality:.92},{id:'jpeg-1280',width:1280,quality:.7},{id:'jpeg-960',width:960,quality:.5},{id:'jpeg-shadow',width:1280,quality:.7,shadow:true}]){
  const result=await page.evaluate(async({source,variant})=>{
   const image=new Image();image.src=source;await image.decode();const canvas=document.createElement('canvas');canvas.width=variant.width;canvas.height=Math.round(image.height*variant.width/image.width);
   const c=canvas.getContext('2d');c.drawImage(image,0,0,canvas.width,canvas.height);
   if(variant.shadow){const shade=c.createLinearGradient(0,0,canvas.width,canvas.height);shade.addColorStop(0,'rgba(0,0,0,.24)');shade.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=shade;c.fillRect(0,0,canvas.width,canvas.height);}
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',variant.quality));
   const {loadTabImage,importImageTab,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js');const input=await loadTabImage(new File([blob],'test.jpeg',{type:'image/jpeg'}));
   try{return await importImageTab(input,{sourceMode:'tab',signal:AbortSignal.timeout(180000)});}catch(error){
 const {analyseGeometry,binaryPage,detectTabStaffs,runs}=await import('/src/pdf/tab-import/geometry.js');
 const {normalizePhotoPaper,photoStaffTracks,CAMERA_TAB_CONFIG}=await import('/src/pdf/tab-import/cameraPhotoGeometry.js');
 const c=drawTabImage(input,0),w=c.width,h=c.height,rgba=c.getContext('2d').getImageData(0,0,w,h).data;
 const binary=binaryPage(rgba,w,h,230),ys=[];for(let y=0;y<h;y++){let n=0;for(let x=0;x<w;x++)n+=binary[y*w+x];if(n>w*.4)ys.push(y);}
 const norm=normalizePhotoPaper(rgba,w,h),normalized=analyseGeometry({rgba:norm,width:w,height:h,page:1,config:CAMERA_TAB_CONFIG});
 return {error:error.message,debug:{w,h,lines:runs(ys),staffs:detectTabStaffs(binary,w,h),tracks:photoStaffTracks(norm,w,h),normalized:normalized.staffs.map(s=>({lines:s.lines,measures:s.measures.length}))},jpeg:canvas.toDataURL('image/jpeg',variant.quality)};
 }finally{input.close();canvas.width=canvas.height=0;}
  },{source,variant});
  await writeFile(`${out}/${variant.id}.json`,JSON.stringify(result));
  if(result.error){results.push({...variant,error:result.error});console.log(JSON.stringify(results.at(-1)));continue;}
  const measures=result.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures)),first=measures[0],expected=flowerAudit.get(5);
  const notes=first?.slots?.map(s=>s.notes.filter(n=>n.status==='confirmed'))??[],zero=notes[2]?.some(n=>n.string===1&&n.fret===0)??false;
  const missing=expected.flatMap((e,i)=>e.notes.filter(n=>!notes[i]?.some(g=>g.string===n.string&&g.fret===n.fret)).map(n=>({event:i+1,...n})));
  const wrong=notes.flatMap((ns,i)=>ns.filter(n=>!expected[i]?.notes.some(e=>e.string===n.string&&e.fret===n.fret)).map(n=>({event:i+1,string:n.string,fret:n.fret})));
  const report={...variant,bars:measures.length,zero,missing,wrong,rhythm:first?.slots?.map(s=>s.duration),unreadMarked:first?.slots[2]?.status==='unresolved'&&Boolean(first?.slots[2]?.rejections?.length)};results.push(report);console.log(JSON.stringify(report));
 }
 assert(results.every(r=>r.bars===4&&!r.wrong.length&&r.rhythm.length===8&&r.rhythm.every(d=>d==='8')),'Keep bar boundaries and rhythms without inventing notes');
 assert(results.filter(r=>r.id!=='jpeg-960').every(r=>r.zero&&!r.missing.length),'Readable open strings must survive');
 const weak=results.find(r=>r.id==='jpeg-960');assert(weak.zero||weak.unreadMarked,'An eroded numeral must remain a navigable review target, never disappear silently');
}finally{await browser.close();await writeFile(`${out}/open-string-results.json`,JSON.stringify(results,null,2));}
