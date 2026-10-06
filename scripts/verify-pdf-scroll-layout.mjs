// Run against a local server or deployment with PLAYWRIGHT_MODULE and AUDIT_URL.
// Generated pages keep this regression independent of personal sheet music.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {jsPDF} from 'jspdf';
import {exportPdfPractice} from '../src/pdf/pdfLibrary.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const out='artifacts/pdf-scroll-layout';await mkdir(out,{recursive:true});
const pdf=new jsPDF({unit:'pt',format:[612,792]}),barMap=[];
for(let n=1;n<=10;n++){
 if(n>1)pdf.addPage(n%3===0?[595,842]:[612,792]);
 const w=pdf.internal.pageSize.getWidth(),h=pdf.internal.pageSize.getHeight();
 pdf.setFontSize(44);pdf.text(`PAGE ${n}`,50,80);pdf.setLineWidth(.6);
 for(let row=0;row<4;row++){
  const top=160+row*130;for(let line=0;line<5;line++)pdf.line(50,top+line*10,w-50,top+line*10);
  for(let col=0;col<=4;col++)pdf.line(50+(w-100)*col/4,top,50+(w-100)*col/4,top+40);
 }
 barMap.push({number:n,page:n,x:50/w,y:160/h,width:(w-100)/w,height:40/h,count:1,beats:4});
}
const thumbnail='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="285"><rect width="220" height="285" fill="white"/><text x="30" y="100" font-size="45">PAGE 1</text></svg>');
const record={id:'pdf-scroll-layout-regression',title:'PDF scroll layout regression',pageCount:10,thumbnail,lastPage:1,bpm:80,meter:[4,4],barMap,practiceOrder:[],pageEdits:{2:{margins:{top:.1,right:.1,bottom:.1,left:.1}},4:{cuts:[{start:.4,end:.5}]}},zoom:'auto',viewMode:'continuous',audible:false};
await writeFile(`${out}/fixture.fretiva-pdf`,new Uint8Array(await exportPdfPractice(record,pdf.output('blob')).arrayBuffer()));
const browser=await chromium.launch({headless:true,channel:'msedge'}),results=[];
try{
 for(const [width,height] of [[1920,912],[1280,800],[390,844]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('language','ko');window.layoutAudit={frames:0,bad:[],wrongThumbnails:[]};
   const frame=()=>{
    const root=document.querySelector('.pdfContinuous');
    if(root){const viewport=root.getBoundingClientRect(),audit=window.layoutAudit;audit.frames++;
     for(const slot of root.querySelectorAll('[data-pdf-page-slot]')){
      const s=slot.getBoundingClientRect();if(s.bottom<=viewport.top||s.top>=viewport.bottom)continue;
      const paper=slot.querySelector('.pdfPaper'),p=paper?.getBoundingClientRect(),n=+slot.dataset.pdfPageSlot;
      if(p&&(p.width>s.width+1||Math.abs(p.height-(s.height-30))>1))audit.bad.push({page:n,paper:[p.width,p.height],slot:[s.width,s.height]});
      if(n!==1&&slot.querySelector('.pdfThumbnailPreview,img'))audit.wrongThumbnails.push(n);
     }
    }requestAnimationFrame(frame);
   };requestAnimationFrame(frame);
  });
  try{
   await page.goto(process.env.AUDIT_URL||'http://127.0.0.1:5173/#etudes');await page.locator('.launchSplash').waitFor({state:'detached'});
   await page.locator('input[accept=".fretiva-pdf"]').last().setInputFiles(`${out}/fixture.fretiva-pdf`);await page.locator('.pdfContinuous canvas').first().waitFor();
   const sweep=async label=>{
    await page.evaluate(()=>window.layoutAudit={frames:0,bad:[],wrongThumbnails:[]});
    for(const fraction of [.3,.7,1,.7,.3,0,.9,0,1,.2,.8,0]){
     await page.locator('.pdfContinuous').evaluate((e,f)=>e.scrollTo({top:(e.scrollHeight-e.clientHeight)*f,behavior:'instant'}),fraction);await page.waitForTimeout(90);
    }
    await page.waitForTimeout(250);const audit=await page.evaluate(()=>window.layoutAudit);
    results.push({width,height,label,...audit});console.log(width,label,{frames:audit.frames,bad:audit.bad.length,wrongThumbnails:audit.wrongThumbnails.length});
    assert.ok(audit.frames>12);assert.deepEqual(audit.bad,[]);assert.deepEqual(audit.wrongThumbnails,[]);
   };
   await sweep('cold and cached pages');
   if(width>1000){
    await page.getByLabel('PDF 확대',{exact:true}).selectOption('150');await sweep('150% with cropped pages');
    await page.getByLabel('PDF 확대',{exact:true}).selectOption('auto');await sweep('return to auto with mixed cached sizes');
    await page.getByRole('button',{name:'전체화면',exact:true}).click();await sweep('fullscreen');await page.keyboard.press('Escape');
   }else assert.equal(await page.locator('.desktopPdfTools').count(),0);
   await page.screenshot({path:`${out}/${width}.png`});assert.deepEqual(errors,[]);
  }catch(error){await page.screenshot({path:`${out}/failure-${width}.png`});throw error;}finally{await page.close();}
 }
}finally{await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();}
