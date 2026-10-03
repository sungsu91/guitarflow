import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const out='artifacts/imported-chords';await mkdir(out,{recursive:true});
try{
 const page=await browser.newPage();
 await page.route('**/__chords',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><input type="file">'}));
 await page.goto('http://127.0.0.1:5174/__chords');
 await page.locator('input').setInputFiles('C:/Users/User/Desktop/sheet music/풀잎사랑(코드)_페이지_1.jpg');
 const raw=JSON.parse(await readFile('artifacts/staff-photo/raw-page-1.json','utf8'));
 const result=await page.evaluate(async ({raw,live})=>{
  const {loadTabImage,drawTabImage,importImageTab}=await import('/src/pdf/tab-import/imageTabSource.js');
  const {binaryPage,detectStaffs}=await import('/src/pdf/tab-import/geometry.js');
  const {chordRegions}=await import('/src/pdf/tab-import/chordGeometry.js');
  const {recognizePageChords,attachPageChords}=await import('/src/pdf/tab-import/chordRecognition.js');
  const {parseStaffTokens,staffSystemToAnalysis}=await import('/src/omr/staffTokens.js');
  const {analysisToDocument}=await import('/src/pdf/tab-import/scoreAdapter.js');
  const {summarizeAnalysis}=await import('/src/pdf/tab-import/recognition.js');
  const {applyArpeggio}=await import('/src/etudes/arpeggioPattern.js');
  const source=await loadTabImage(document.querySelector('input').files[0]),canvas=drawTabImage(source,0,2083);
  const image=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
  const staffs=detectStaffs(binaryPage(image.data,image.width,image.height,230),image.width,image.height,undefined,5);
  const regions=chordRegions(image.data,image.width,image.height,staffs),reads=await recognizePageChords(regions);
  const analysisPage=live?(await importImageTab(source,{sourceMode:'staff',autoZoom:false})).pages[0]:{page:1,notation:true,octaveShift:-12,width:image.width,height:image.height,staffs:raw.map((r,i)=>staffSystemToAnalysis(parseStaffTokens(r.text),{system:{id:i+1,staff:staffs[i],rect:r.rect},page:1,width:image.width,height:image.height}).staff)};
  if(!live)attachPageChords(analysisPage,reads);
  const doc=analysisToDocument({fileName:source.fileName,sourceType:'image',pages:[analysisPage],summary:summarizeAnalysis([analysisPage])});
  let arp,error;try{arp=applyArpeggio(doc,{end:doc.measures.length-1});}catch(e){error=e.message;}
  source.close();canvas.width=canvas.height=0;
  return {reads,counts:analysisPage.staffs.map(s=>s.measures.length),chords:doc.measures.map(m=>m.harmony),review:analysisPage.staffs.map(s=>s.chordReview),doc,arp,error};
 },{raw,live:Boolean(process.env.LIVE_IMPORT)});
 await writeFile(`${out}/result.json`,JSON.stringify(result,null,2));
 await writeFile(`${out}/document.json`,JSON.stringify(result.doc));
 assert.deepEqual(result.chords,[...Array.from({length:6},()=>['G','Am','D7','G']).flat(),'D7',null,'G',null,'D7',null,'G',null,'C',null,'G',null]);
 assert.equal(result.error,undefined);
 assert(result.arp.measures.every(m=>!m.chord));
 assert.deepEqual(result.arp.measures.map(m=>m.harmony),result.chords);
 console.log(JSON.stringify({counts:result.counts,chords:result.chords,error:result.error,review:result.review,reads:result.reads.map(r=>({staff:r.staff,bars:r.measures.length,words:r.words.map(w=>({name:w.name,x:Math.round(w.x),y:Math.round(w.y),confidence:w.confidence}))}))},null,2));
}finally{await browser.close();}
