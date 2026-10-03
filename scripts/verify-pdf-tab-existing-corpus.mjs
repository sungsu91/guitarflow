// Re-run local, previously audited PDFs with either the saved pre-change engine
// or current code. Ground-truth audits are separate and never enter the browser.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const label=process.argv[2]||'after',baseline=label==='before',indexes=process.argv.slice(3).map(Number);
const inventory=JSON.parse(await readFile('artifacts/pdf-tab-folder/inventory.json'));
const out=`artifacts/pdf-tab-corpus/existing-${label}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report=[];
try{for(const item of inventory.filter(i=>(indexes.length?indexes:[0,1,4,8]).includes(i.index))){
 const page=await browser.newPage(),errors=[],snapshotRequests={};page.on('pageerror',e=>errors.push(e.message));
 if(baseline)for(const file of ['geometry.js','recognition.js','zoomConsensus.js','importPdfTab.js']){
  const body=await readFile(`artifacts/pdf-tab-corpus/baseline-engine/${file}`,'utf8');
  await page.context().route(`**/src/pdf/tab-import/${file}*`,r=>{snapshotRequests[file]=(snapshotRequests[file]??0)+1;return r.fulfill({contentType:'application/javascript',body});});
 }
 await page.route('**/__pdf-tab-existing',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><input type="file" id="pdf">'}));
 await page.goto(`${process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174'}/__pdf-tab-existing`);
 await page.locator('#pdf').setInputFiles({name:`${randomUUID()}.pdf`,mimeType:'application/pdf',buffer:await readFile(item.path)});
 const start=Date.now();
 const data=await page.evaluate(async()=>{
  const {importPdfTab}=await import('/src/pdf/tab-import/importPdfTab.js');
  const {analysisToDocument}=await import('/src/pdf/tab-import/scoreAdapter.js');
  const analysis=await importPdfTab(document.querySelector('#pdf').files[0],{signal:AbortSignal.timeout(600000)});
  return {analysis,document:analysisToDocument(analysis)};
 });
 for(const key of ['analysis','document'])await writeFile(`${out}/${item.index}-${key}.json`,JSON.stringify(data[key]));
 if(baseline&&Object.keys(snapshotRequests).length!==4)throw Error('Not every baseline module, including Worker geometry, was intercepted');
 report.push({index:item.index,seconds:(Date.now()-start)/1000,summary:data.analysis.summary,errors,...(baseline?{snapshotRequests}:{})});
 console.log(JSON.stringify(report.at(-1)));await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await page.close();
}}finally{await browser.close();}
