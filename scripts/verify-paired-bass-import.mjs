import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const out='artifacts/ocr-instruments-20261005',base='http://127.0.0.1:5174',reports=[];
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{for(const count of [4,5]){
 const fixture=await browser.newPage();await fixture.goto(base);
 await fixture.evaluate(async count=>{
  const {default:VF}=await import('/node_modules/vexflow/build/esm/entry/vexflow.js');document.querySelectorAll('style,link[rel=stylesheet]').forEach(n=>n.remove());document.body.innerHTML='<div id="score"></div>';document.body.style.cssText='margin:0;background:white;color:black';
  const f=VF.Flow??VF,r=new f.Renderer(document.getElementById('score'),f.Renderer.Backends.SVG);r.resize(850,380);const c=r.getContext();
  const staff=new f.Stave(30,40,770).addClef('bass').addTimeSignature('4/4').setContext(c),tab=new f.TabStave(30,190,770,{num_lines:count}).addTabGlyph().setContext(c);staff.draw();tab.draw();
  const sn=['g/2','a/2','b/2','d/3'].map(k=>new f.StaveNote({clef:'bass',keys:[k],duration:'q'}));
  const tn=[[4,3],[3,0],[3,2],[2,0]].map(([str,fret])=>new f.TabNote({positions:[{str,fret}],duration:'q'},{draw_stem:true}));
  const v1=new f.Voice({num_beats:4,beat_value:4}).addTickables(sn),v2=new f.Voice({num_beats:4,beat_value:4}).addTickables(tn);
  new f.Formatter().joinVoices([v1]).joinVoices([v2]).format([v1,v2],630);v1.draw(c,staff);v2.draw(c,tab);
 },count);
 const path=`${out}/paired-bass${count}`;await fixture.pdf({path:path+'.pdf',width:'880px',height:'400px',printBackground:true});await fixture.setViewportSize({width:880,height:400});await fixture.screenshot({path:path+'.png'});await fixture.close();
 for(const ext of ['pdf','png']){
 const page=await browser.newPage();await page.route('**/__paired-bass',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(base+'/__paired-bass');await page.locator('input').setInputFiles(path+'.'+ext);
 const result=await page.evaluate(async count=>{
  const target={instrument:'bass',tuning:[43,38,33,28,...(count===5?[23]:[])]},file=document.querySelector('input').files[0],options={target,sourceMode:'tab',signal:AbortSignal.timeout(120000)};
  let a;if(file.name.endsWith('.pdf'))a=await(await import('/src/pdf/tab-import/importPdfTab.js')).importPdfTab(file,options);else{const m=await import('/src/pdf/tab-import/photoBatch.js');a=await m.importPhotoBatch([await m.preparePhoto(file)],options);}
  const notes=a.pages.flatMap(p=>p.staffs).flatMap(s=>s.measures).flatMap(m=>m.slots).flatMap(t=>t.notes.filter(n=>n.status==='confirmed').map(n=>[n.string,n.fret]));
  return {count,staffs:a.summary.staffs,bars:a.summary.measures,notes,diagnostics:a.pages.flatMap(p=>p.staffs.map(s=>({y:s.y,spacing:s.spacing,nativeText:s.nativeText,candidates:s.candidates.map(c=>({string:c.string,x:c.x,y:c.y,width:c.width,height:c.height,ocr:c.ocr,nonFretSymbol:c.nonFretSymbol}))})))};
 },count);result.ext=ext;reports.push(result);console.log(JSON.stringify({...result,diagnostics:undefined}));await page.close();
 assert.equal(result.staffs,1);assert.equal(result.bars,1);assert.deepEqual(result.notes,[[4,3],[3,0],[3,2],[2,0]]);
}}}finally{await browser.close();await writeFile(`${out}/paired-bass-results.json`,JSON.stringify(reports,null,2));}
