import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),out=process.env.STAFF_MEASURE_OUTPUT??'artifacts/omr-deep-audit/measures';await mkdir(out,{recursive:true});
const pageNumber=Number(process.env.STAFF_PAGE??2),targets=process.argv.slice(2).map(s=>s.split(':').map(Number)),variants=(process.env.STAFF_MEASURE_VARIANTS??'expanded,padded').split(',');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage();await page.route('**/__staff-measures',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><input type="file">'}));await page.goto('http://127.0.0.1:5174/__staff-measures');await page.locator('input').setInputFiles(`C:/Users/User/Desktop/sheet music/${process.env.STAFF_SCORE_NAME??'Let_It_Be(코드)'}_페이지_${pageNumber}.jpg`);
 await page.exposeFunction('record',async r=>{await writeFile(`${out}/${r.id}.png`,Buffer.from(r.png.split(',')[1],'base64'));delete r.png;await writeFile(`${out}/${r.id}.json`,JSON.stringify(r,null,2));console.log(JSON.stringify(r));});
 await page.evaluate(async({targets,variants,pageNumber})=>{
  const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js');const {cropNotationSystems}=await import('/src/omr/staffSystems.js');const {chordRegions}=await import('/src/pdf/tab-import/chordGeometry.js');const {createStaffOmrClient}=await import('/src/omr/staffOmrClient.js');
  const src=await loadTabImage(document.querySelector('input').files[0]),canvas=drawTabImage(src),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height),systems=cropNotationSystems(pixels.data,pixels.width,pixels.height),regions=chordRegions(pixels.data,pixels.width,pixels.height,systems.map(s=>s.staff)),omr=await createStaffOmrClient();
  try{for(const [system,bar] of targets){const s=systems[system-1],g=s.staff.spacing,m=regions[system-1].measures[bar-1];if(!m)throw Error(`missing ${system}:${bar}`);
   for(const variant of variants){
    const top=Math.max(0,Math.floor(s.staff.y-3.5*g)),bottom=Math.min(canvas.height,Math.ceil(s.staff.y+s.staff.height+4*g)),pad=variant.startsWith('pad-')?Math.ceil(g*Number(variant.slice(4))):variant==='padded'?Math.ceil(g*2):Math.ceil(g*.5),prefix=bar>1?Math.ceil(g*6):0;
    const left=bar===1?s.rect.x:Math.floor(m.x),right=Math.ceil(m.x+m.width),c=document.createElement('canvas');c.width=right-left+prefix+pad*2;c.height=bottom-top+pad*2;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);
    if(prefix)ctx.drawImage(canvas,s.rect.x,top,prefix,bottom-top,pad,pad,prefix,bottom-top);
    ctx.drawImage(canvas,left,top,right-left,bottom-top,pad+prefix,pad,right-left,bottom-top);
    const png=c.toDataURL(),rgba=ctx.getImageData(0,0,c.width,c.height).data.buffer,start=performance.now(),read=await omr.recognize({rgba,width:c.width,height:c.height});
    await window.record({id:`p${pageNumber}-s${system}-b${bar}-${variant}`,system,bar,bounds:m,width:c.width,height:c.height,...read,seconds:(performance.now()-start)/1000,png});
   }
  }}finally{omr.close();src.close();}
 },{targets,variants,pageNumber});
}finally{await browser.close();}
