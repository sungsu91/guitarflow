import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const out=process.env.STAFF_AUDIT_OUTPUT||'artifacts/let-it-be-ocr';await mkdir(out,{recursive:true});
const file=process.env.STAFF_AUDIT_FILE||'C:/Users/User/Desktop/sheet music/Let_It_Be(코드)_페이지_1.jpg';
const selection=process.argv.slice(2).map(Number),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage();await page.route('**/__staff-audit',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><input type="file">'}));await page.goto('http://127.0.0.1:5174/__staff-audit');await page.locator('input').setInputFiles(file);
 await page.exposeFunction('recordSystem',async result=>{await writeFile(`${out}/system-${result.system}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({system:result.system,text:result.text,seconds:result.seconds}));});
 const results=await page.evaluate(async ({selection,variants})=>{
  const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js');const {cropNotationSystems}=await import('/src/omr/staffSystems.js');const {createStaffOmrClient}=await import('/src/omr/staffOmrClient.js');
  const src=await loadTabImage(document.querySelector('input').files[0]),canvas=drawTabImage(src),img=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height),systems=cropNotationSystems(img.data,img.width,img.height),omr=await createStaffOmrClient(),results=[];
  try{for(const [i,s] of systems.entries()){
   if(selection.length&&!selection.includes(i+1))continue;
   for(const variant of variants){
    const crop=document.createElement('canvas'),g=s.staff.spacing;
    let rect={...s.rect};
    if(variant==='lower-margin')rect.height=Math.min(canvas.height-rect.y,Math.ceil(s.staff.y+s.staff.height+g*4)-rect.y);
    if(variant==='tight-top'){rect.y=Math.max(0,Math.floor(s.staff.y-g*2));rect.height=Math.min(canvas.height-rect.y,Math.ceil(s.staff.y+s.staff.height+g*4)-rect.y);}
    const pad=variant==='padding'?Math.ceil(g*2):0,scale=variant==='smaller'?.75:1;
    crop.width=Math.ceil((rect.width+pad*2)*scale);crop.height=Math.ceil((rect.height+pad*2)*scale);const ctx=crop.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,crop.width,crop.height);ctx.drawImage(canvas,rect.x,rect.y,rect.width,rect.height,pad*scale,pad*scale,rect.width*scale,rect.height*scale);
    const pixels=ctx.getImageData(0,0,crop.width,crop.height);if(variant==='binary')for(let p=0;p<pixels.data.length;p+=4){const v=pixels.data[p]<180?0:255;pixels.data[p]=pixels.data[p+1]=pixels.data[p+2]=v;}ctx.putImageData(pixels,0,0);
    const png=crop.toDataURL('image/png'),start=performance.now(),read=await omr.recognize({rgba:pixels.data.buffer,width:crop.width,height:crop.height}),result={system:variant==='original'?i+1:`${i+1}-${variant}`,rect,staff:s.staff,pageWidth:img.width,pageHeight:img.height,...read,seconds:(performance.now()-start)/1000,png};
    await window.recordSystem(result);results.push(result);crop.width=crop.height=0;
   }
  }}finally{omr.close();src.close();canvas.width=canvas.height=0;}return results;
 },{selection,variants:process.env.STAFF_CROP_VARIANTS?.split(',')??['original']});
 for(const r of results){await writeFile(`${out}/system-${r.system}.png`,Buffer.from(r.png.split(',')[1],'base64'));delete r.png;await writeFile(`${out}/system-${r.system}.json`,JSON.stringify(r,null,2));}
 await writeFile(`${out}/systems.json`,JSON.stringify(results,null,2));
}finally{await browser.close();}
