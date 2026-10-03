import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage();await page.route('**/__chord-audit',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto('http://127.0.0.1:5174/__chord-audit');await page.locator('input').setInputFiles('C:/Users/User/Desktop/sheet music/Let_It_Be(코드)_페이지_2.jpg');
 const result=await page.evaluate(async()=>{
  const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js'),{cropNotationSystems}=await import('/src/omr/staffSystems.js'),{chordRegions}=await import('/src/pdf/tab-import/chordGeometry.js'),{recognizePageChords}=await import('/src/pdf/tab-import/chordRecognition.js'),{binaryPage,detectBarlines}=await import('/src/pdf/tab-import/geometry.js');
  const src=await loadTabImage(document.querySelector('input').files[0]),canvas=drawTabImage(src),im=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height),systems=cropNotationSystems(im.data,im.width,im.height),regions=chordRegions(im.data,im.width,im.height,systems.map(s=>s.staff));
  const readings=[];const chords=await recognizePageChords(regions.slice(0,3),[],{onReading:r=>readings.push(r)}),ink=binaryPage(im.data,im.width,im.height,230);
  const bars=[3,7].map(i=>{const s=systems[i],g=s.staff.spacing,columns=[];for(let x=s.staff.x+g*10;x<s.staff.x+s.staff.width-g;x++){let n=0;for(let y=s.staff.y;y<=s.staff.y+s.staff.height;y++)n+=ink[y*im.width+x];if(n/(s.staff.height+1)>.93)columns.push(x);}return {id:s.id,staff:s.staff,actual:s.measures,raw:detectBarlines(ink,im.width,s.staff),relaxed:detectBarlines(ink,im.width,s.staff,{minCoverage:.93}),extensions:detectBarlines(ink,im.width,s.staff,{allowExtensions:true}),columns};});
  return {chords,bars,readings};
 });await mkdir('artifacts/omr-deep-audit',{recursive:true});await writeFile('artifacts/omr-deep-audit/chords.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
