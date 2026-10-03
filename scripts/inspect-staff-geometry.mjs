import {mkdir,writeFile} from 'node:fs/promises';
const name=process.env.STAFF_SCORE_NAME??'Let_It_Be(코드)',out=process.env.STAFF_GEOMETRY_OUTPUT??'artifacts/omr-deep-audit';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{const page=await browser.newPage();await page.route('**/__staff-geometry',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><input type="file" multiple>'}));await page.goto('http://127.0.0.1:5174/__staff-geometry');await page.locator('input').setInputFiles([1,2].map(n=>`C:/Users/User/Desktop/sheet music/${name}_페이지_${n}.jpg`));
 const all=await page.evaluate(async()=>{
  const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js');const {cropNotationSystems}=await import('/src/omr/staffSystems.js');const {chordRegions}=await import('/src/pdf/tab-import/chordGeometry.js');const {binaryPage}=await import('/src/pdf/tab-import/geometry.js');const {staffMeasureInk}=await import('/src/omr/staffMeasureInk.js');const all=[];
  for(const [p,file] of [...document.querySelector('input').files].entries()){const src=await loadTabImage(file),c=drawTabImage(src),im=c.getContext('2d').getImageData(0,0,c.width,c.height),ink=binaryPage(im.data,im.width,im.height),systems=cropNotationSystems(im.data,im.width,im.height),regions=chordRegions(im.data,im.width,im.height,systems.map(s=>s.staff));
   for(const [i,s] of systems.entries()){const bars=regions[i].measures.map((m,j)=>({...m,...staffMeasureInk(ink,im.width,im.height,s.staff,m,{first:j===0})}));all.push({page:p+1,staff:i+1,geometry:s.staff,bars});}src.close();}
  return all;
 });await mkdir(out,{recursive:true});await writeFile(`${out}/geometry.json`,JSON.stringify(all,null,2));console.log(JSON.stringify(all.map(s=>({page:s.page,staff:s.staff,bars:s.bars.length}))));
}finally{await browser.close();}
