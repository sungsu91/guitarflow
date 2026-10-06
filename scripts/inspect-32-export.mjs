import {readFile,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),root='artifacts/32nd-support/browser';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const p=await browser.newPage();await p.route('**/__32-inspect',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await p.goto('http://127.0.0.1:5174/__32-inspect');await p.locator('input').setInputFiles(`${root}/32nd-original-exercise.pdf`);
 const result=await p.evaluate(async()=>{
  const {loadPdfTask}=await import('/src/pdf/pdfRenderer.js'),{analyseGeometry,binaryPage}=await import('/src/pdf/tab-import/geometry.js');
  const pdf=await loadPdfTask(new Uint8Array(await document.querySelector('input').files[0].arrayBuffer()),{analysis:true}).promise,pg=await pdf.getPage(1),viewport=pg.getViewport({scale:2084/pg.getViewport({scale:1}).width});
  const c=document.createElement('canvas');c.width=Math.ceil(viewport.width);c.height=Math.ceil(viewport.height);const ctx=c.getContext('2d',{willReadFrequently:true});await pg.render({canvasContext:ctx,viewport}).promise;
  const rgba=ctx.getImageData(0,0,c.width,c.height).data,g=analyseGeometry({rgba,width:c.width,height:c.height,page:1}),ink=binaryPage(rgba,c.width,c.height);
  const s=g.staffs[1],points=[];for(let y=s.y+13;y<s.lines.at(-1)-13;y++)for(let x=455;x<=505;x++)if(!s.lines.some(line=>Math.abs(line-y)<=Math.ceil(s.thickness/2)+1)&&ink[y*c.width+x])points.push({x,y});
  const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y)),w=Math.max(...points.map(p=>p.x))-x+1,h=Math.max(...points.map(p=>p.y))-y+1;
  const rest={points:points.map(p=>({x:p.x-x,y:p.y-y})),width:w,height:h,spacing:s.spacing,masked:Array.from({length:h},(_,i)=>i).filter(i=>s.lines.some(line=>Math.abs(line-y-i)<=Math.ceil(s.thickness/2)+1))};
  const crops=g.staffs.map(s=>{const v=document.createElement('canvas');v.width=Math.ceil(s.width+20);v.height=Math.ceil(s.spacing*11);v.getContext('2d').drawImage(c,s.x-10,s.y-s.spacing,v.width,v.height,0,0,v.width,v.height);return v.toDataURL();});
  const flag=[];for(let y=1135;y<=1210;y++)flag.push(Array.from({length:30},(_,i)=>ink[y*c.width+533+i]?'#':' ').join(''));
  return {crops,rest,flag,staffs:g.staffs.map(s=>({...s,candidates:s.candidates.map(c=>({...c,bitmap:Array.from(c.bitmap??[]),grayscale:undefined,paddedGlyph:undefined})),tupletCandidates:s.tupletCandidates.map(c=>({...c,grayscale:undefined}))}))};
 });
 for(const [i,c] of result.crops.entries())await writeFile(`${root}/export-row-${i+1}.png`,Buffer.from(c.split(',')[1],'base64'));
 await writeFile(`${root}/export-geometry.json`,JSON.stringify(result.staffs));
 await writeFile(`${root}/export-rest.json`,JSON.stringify(result.rest));await writeFile(`${root}/export-flag.txt`,result.flag.join('\n'));
 console.log(result.staffs.map(s=>({g:s.spacing,lines:s.lines,thickness:s.thickness,candidates:s.candidates.length,tuplets:s.tupletCandidates.length,rests:s.measures.flatMap(m=>m.rhythm).filter(r=>r.rest)})));
}finally{await browser.close();}
