import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const out='artifacts/staff-photo';await mkdir(out,{recursive:true});
const page=await browser.newPage();
await page.route('**/__staff-inspect',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><input type="file">'}));await page.goto('http://127.0.0.1:5174/__staff-inspect');
try{
 for(const number of [1,2]){
  await page.locator('input').setInputFiles(`C:/Users/User/Desktop/sheet music/풀잎사랑(코드)_페이지_${number}.jpg`);
  const results=await page.evaluate(async number=>{
   const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js');
   const {binaryPage,detectStaffs}=await import('/src/pdf/tab-import/geometry.js');
   const src=await loadTabImage(document.querySelector('input').files[0]),canvas=drawTabImage(src,0,2083),ctx=canvas.getContext('2d');
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),staffs=detectStaffs(binaryPage(pixels.data,pixels.width,pixels.height,230),pixels.width,pixels.height,undefined,5),results=[];
   for(const [i,s] of staffs.entries()){
    const x=Math.max(0,Math.floor(s.x-s.spacing*3)),y=Math.max(0,Math.floor(s.y-s.spacing*3.5)),right=Math.min(canvas.width,Math.ceil(s.x+s.width+s.spacing)),bottom=Math.min(canvas.height,Math.ceil(s.y+s.height+s.spacing*2.5));
    const crop=ctx.getImageData(x,y,right-x,bottom-y);
    const result=await new Promise((resolve,reject)=>{const worker=new Worker('/experiments/omr/worker.js'),timer=setTimeout(()=>{worker.terminate();reject(Error('timeout'));},120000);worker.onmessage=({data})=>{if(data.stage==='loaded')return;clearTimeout(timer);worker.terminate();resolve(data);};worker.onerror=e=>{clearTimeout(timer);worker.terminate();reject(Error(e.message));};worker.postMessage({data:crop.data.buffer,width:crop.width,height:crop.height},[crop.data.buffer]);});
    results.push({page:number,staff:i+1,rect:{x,y,width:right-x,height:bottom-y},...result});
   }
   src.close();return results;
  },number);
  await writeFile(`${out}/raw-page-${number}.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({page:r.page,staff:r.staff,text:r.text,error:r.message,inferenceMs:r.inferenceMs}))));
 }
}finally{await browser.close();}
