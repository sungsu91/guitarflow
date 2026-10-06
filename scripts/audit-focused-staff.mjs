import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const out=process.env.STAFF_AUDIT_OUTPUT??'artifacts/ocr-review-focused-20261005/chords';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage();await page.route('**/__focused-staff',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));
 await page.goto('http://127.0.0.1:5174/__focused-staff');await page.locator('input').setInputFiles(process.env.STAFF_AUDIT_FILE??'C:/Users/User/Desktop/sheet music/일어나(코드)_페이지_2.jpg');
 const result=await page.evaluate(async ids=>{
  const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js');
  const {cropNotationSystems}=await import('/src/omr/staffSystems.js');
  const {chordRegions,textComponents}=await import('/src/pdf/tab-import/chordGeometry.js');
  const {recognizePageChords}=await import('/src/pdf/tab-import/chordRecognition.js');
  const src=await loadTabImage(document.querySelector('input').files[0]),c=drawTabImage(src),im=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height);
  const systems=cropNotationSystems(im.data,im.width,im.height),regions=chordRegions(im.data,im.width,im.height,systems.map(s=>s.staff));
  const selected=regions.filter(r=>ids.includes(r.staff)),images=[],rawParts=selected.map(r=>({staff:r.staff,parts:textComponents(new Uint8ClampedArray(r.rgba),r.width,r.height,r.spacing)}));
  for(const r of selected){const c=document.createElement('canvas');c.width=r.width;c.height=r.height;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(r.rgba),r.width,r.height),0,0);images.push({staff:r.staff,png:c.toDataURL()});}
  const reads=[],chords=await recognizePageChords(selected,[],{onReading:r=>reads.push(r)});src.close();return {chords,reads,images,rawParts};
 },JSON.parse(process.env.STAFF_AUDIT_SYSTEMS??'[3,6]'));
 for(const item of result.images)await writeFile(`${out}/staff-${item.staff}.png`,Buffer.from(item.png.split(',')[1],'base64'));delete result.images;
 await writeFile(`${out}/analysis.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result.chords.map(r=>({staff:r.staff,words:r.words.map(w=>w.name),triplets:r.triplets}))));
}finally{await browser.close();}
