import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {jsPDF} from 'jspdf';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const out='artifacts/imported-chords';await mkdir(out,{recursive:true});
const results=[];
try{
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:5174');
 for(const variant of ['tab-photo','staff-and-tab-photo','small-jpeg']){
  const result=await page.evaluate(async variant=>{
   const {binaryPage,detectStaffs}=await import('/src/pdf/tab-import/geometry.js');
   const {chordRegions}=await import('/src/pdf/tab-import/chordGeometry.js');
   const {recognizePageChords}=await import('/src/pdf/tab-import/chordRecognition.js');
   const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=600;const ctx=canvas.getContext('2d');
   ctx.fillStyle='white';ctx.fillRect(0,0,1400,600);ctx.strokeStyle='#222';ctx.lineWidth=2;
   const paired=variant==='staff-and-tab-photo',tabY=paired?320:180;
   const staff=(y,lines)=>{for(let i=0;i<lines;i++){ctx.beginPath();ctx.moveTo(50,y+i*20);ctx.lineTo(1350,y+i*20);ctx.stroke();}for(const x of [50,375,700,1025,1350]){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+(lines-1)*20);ctx.stroke();}};
   staff(tabY,6);if(paired)staff(180,5);
   ctx.font='bold 32px Georgia';ctx.fillStyle='#111';['Cmaj7','D/F#','Bb','Em7'].forEach((name,i)=>ctx.fillText(name,80+i*325,140));
   // A title and lyrics that happen to contain valid single-letter names must
   // not become harmony, nor may TAB fret numbers become chord symbols.
   ctx.fillText('A Different Song',400,45);ctx.fillText('C G A',440,540);
   ctx.font='18px Arial';for(let i=0;i<16;i++){const x=90+i*77;ctx.fillStyle='white';ctx.fillRect(x-2,tabY-12,18,20);ctx.fillStyle='#111';ctx.fillText(String(i%8),x,tabY+6);}
   let image=ctx.getImageData(0,0,1400,600);
   if(variant==='small-jpeg'){
    const small=document.createElement('canvas');small.width=840;small.height=360;small.getContext('2d').drawImage(canvas,0,0,840,360);
    const photo=new Image();photo.src=small.toDataURL('image/jpeg',.4);await photo.decode();small.getContext('2d').drawImage(photo,0,0);image=small.getContext('2d').getImageData(0,0,840,360);
   }
   const staffs=detectStaffs(binaryPage(image.data,image.width,image.height,230),image.width,image.height);
   const reads=await recognizePageChords(chordRegions(image.data,image.width,image.height,staffs));return reads.map(r=>r.words.map(w=>w.name));
  },variant);
  results.push({variant,read:result});console.log(JSON.stringify(results.at(-1)));
  assert.deepEqual(result,[['Cmaj7','D/F#','Bb','Em7']]);
 }
 const pdf=new jsPDF({unit:'pt',format:[700,420],orientation:'landscape'});
 pdf.setLineWidth(.7);for(let line=0;line<6;line++)pdf.line(30,170+line*12,670,170+line*12);
 for(const x of [30,190,350,510,670])pdf.line(x,170,x,230);
 pdf.setFont('helvetica','bold');pdf.setFontSize(17);['Cmaj7','D/F#','Bb','Em7'].forEach((name,i)=>pdf.text(name,55+i*160,145));
 pdf.setFont('helvetica','normal');pdf.setFontSize(11);
 for(let i=0;i<16;i++){const x=65+Math.floor(i/4)*160+(i%4)*32;pdf.setFillColor(255);pdf.rect(x-1,163,8,11,'F');pdf.text(String(i%6),x,174);pdf.line(x+4,235,x+4,258);}
 const data=new Uint8Array(pdf.output('arraybuffer'));await writeFile(`${out}/chord-tab.pdf`,data);
 const imported=await page.evaluate(async bytes=>{
  const {importPdfTab}=await import('/src/pdf/tab-import/importPdfTab.js');
  const {analysisToDocument}=await import('/src/pdf/tab-import/scoreAdapter.js');
  const analysis=await importPdfTab(new File([new Uint8Array(bytes)],'Chords.pdf',{type:'application/pdf'}),{sourceMode:'tab',autoZoom:false});
  const d=analysisToDocument(analysis);
  return {names:d.measures.map(m=>m.harmony),methods:d.measures.flatMap(m=>m.harmonyChanges?.map(c=>c.source.method)??[])};
 },Array.from(data));
 assert.deepEqual(imported.names,['Cmaj7','D/F#','Bb','Em7']);assert(imported.methods.every(m=>m==='pdf-chord-text'));
 results.push({variant:'digital-pdf',...imported});console.log(JSON.stringify(results.at(-1)));
}finally{await browser.close();await writeFile(`${out}/formats.json`,JSON.stringify(results,null,2));}
