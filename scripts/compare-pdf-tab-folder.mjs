import{readFile,writeFile,mkdir,readdir}from'node:fs/promises';
import path from 'node:path';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const mode=process.argv[2]||'after',folder=`artifacts/pdf-tab-folder/${mode}`;await mkdir(folder,{recursive:true});
const inventory=await readFile('artifacts/pdf-tab-folder/inventory.json','utf8').then(JSON.parse).catch(async()=>{
 const source=process.env.PDF_TAB_TEST_FOLDER||'C:/Users/User/Desktop/sheet music';
 const files=(await readdir(source)).filter(n=>/\.pdf$/i.test(n)).sort();
 const list=files.map((name,index)=>({index,name,path:path.join(source,name)}));
 await writeFile('artifacts/pdf-tab-folder/inventory.json',JSON.stringify(list,null,2));return list;
}),selection=process.argv.slice(3).map(Number),queue=selection.length?selection:inventory.map(i=>i.index),reports=await readFile(`${folder}/report.json`,'utf8').then(JSON.parse).catch(()=>[]);
const base=mode==='before'?'/artifacts/pdf-tab-folder/baseline':'/src/pdf/tab-import';
try{for(const index of queue){const old=reports.findIndex(r=>r.index===index);if(old>=0)reports.splice(old,1);const item=inventory[index],p=await browser.newPage(),errors=[],start=Date.now();p.on('pageerror',e=>errors.push(e.message));let last='';p.on('console',m=>{const t=m.text();if(t.startsWith('PAGE ')&&t!==last){last=t;console.log(index,t);}});
try{await p.route('**/__tab-import-test',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>TAB comparison</title>'}));await p.goto('http://127.0.0.1:5174/__tab-import-test');await p.evaluate(()=>{const i=document.createElement('input');i.id='batch';i.type='file';document.body.append(i);});await p.locator('#batch').setInputFiles(item.path);
const data=await p.evaluate(async base=>{const{importPdfTab}=await import(`${base}/importPdfTab.js`),{analysisToDocument}=await import(`${base}/scoreAdapter.js`);const a=await importPdfTab(document.querySelector('#batch').files[0],{signal:AbortSignal.timeout(600000),debug:false,onProgress:p=>{if(p.message.includes('마디 분석'))console.log('PAGE '+p.message);}});const documents=[analysisToDocument(a)];return{analysis:a,document:documents[0],documents};},base);
await writeFile(`${folder}/${index}-analysis.json`,JSON.stringify(data.analysis));await writeFile(`${folder}/${index}-document.json`,JSON.stringify(data.document));await writeFile(`${folder}/${index}-documents.json`,JSON.stringify(data.documents));reports.push({index,name:item.name,seconds:(Date.now()-start)/1000,summary:data.analysis.summary,parts:data.documents.length,insertedFrets:data.documents.flatMap(d=>d.measures.flatMap(m=>m.events.flatMap(e=>e.notes))).length,errors});
}catch(e){reports.push({index,name:item.name,seconds:(Date.now()-start)/1000,error:e.message,errors});}finally{await p.close();}console.log(JSON.stringify(reports.at(-1)));await writeFile(`${folder}/report.json`,JSON.stringify(reports,null,2));}
}finally{await browser.close();}
