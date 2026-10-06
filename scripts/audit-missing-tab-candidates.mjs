import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),out='artifacts/ocr-review-focused-20261005';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage();await page.route('**/__missing-candidates',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto('http://127.0.0.1:5174/__missing-candidates');
 await page.locator('input').setInputFiles(`${out}/holdout-guitar/mixed-932-scan.png`);
 const result=await page.evaluate(async()=>{
  const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js');
  const {binaryPage,analyseGeometry,removeStaffRules,fretComponents}=await import('/src/pdf/tab-import/geometry.js');
  const {markNonFretSymbols}=await import('/src/pdf/tab-import/imageTabTokens.js');
  const src=await loadTabImage(document.querySelector('input').files[0]),c=drawTabImage(src),im=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height),ink=binaryPage(im.data,im.width,im.height),geo=analyseGeometry({rgba:im.data,width:im.width,height:im.height,page:1}),results=[];
  for(const staff of geo.staffs){
   const clean=removeStaffRules(ink,im.width,im.height,staff),parts=fretComponents(clean,im.width,im.height,staff);
   markNonFretSymbols(ink,im.width,{...staff,candidates:parts});
   for(const p of parts.filter(p=>p.width/staff.spacing<.35)){
    const widths=[];for(let y=p.y;y<p.y+p.height;y++){if(staff.lines.some(line=>Math.abs(y-line)<=staff.thickness+1))continue;let count=0;for(let x=p.x;x<p.x+p.width;x++)count+=ink[y*im.width+x];widths.push(count);}
    results.push({staff:staff.id,g:staff.spacing,...p,widths,kept:staff.candidates.some(c=>c.x===p.x&&c.y===p.y)});
   }
  }
  src.close();return results;
 });await mkdir(out,{recursive:true});await writeFile(`${out}/missing-candidates.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
