import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5174');
 const samples=await page.evaluate(async()=>{
  const {Glyph}=await import('/node_modules/.vite/deps/vexflow.js');
  return ['rest8th','rest16th','rest32nd'].map(code=>{
   const canvas=document.createElement('canvas');canvas.width=180;canvas.height=220;
   const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,180,220);ctx.fillStyle='black';Glyph.renderGlyph(ctx,60,85,76,code);
   const data=ctx.getImageData(0,0,180,220).data,points=[];
   for(let y=0;y<220;y++)for(let x=0;x<180;x++)if(data[(y*180+x)*4]<128)points.push({x,y});
   const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y));
   return {code,width:right-left+1,height:bottom-top+1,spacing:20,points:points.map(p=>({x:p.x-left,y:p.y-top})),png:canvas.toDataURL()};
  });
 });
 for(const sample of samples){await writeFile(`artifacts/32nd-support/${sample.code}.png`,Buffer.from(sample.png.split(',')[1],'base64'));delete sample.png;}
 await writeFile('artifacts/32nd-support/rest-glyphs.json',JSON.stringify(samples));console.log(samples.map(({code,width,height})=>({code,width,height})));
}finally{await browser.close();}
