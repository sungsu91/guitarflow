import {readFile,writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/pdf-tab-import',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('console',m=>{if(m.type()==='error'||m.text().includes('[PDF TAB]'))console.log(m.type(),m.text());});page.on('pageerror',e=>console.log('ERROR',e.message));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:5174',{waitUntil:'networkidle'});
 const bytes=Array.from(await readFile(process.argv[2]||'C:/Users/User/Downloads/Flower Dance.pdf'));
 const result=await page.evaluate(async bytes=>{
   const {importPdfTab}=await import('/src/pdf/tab-import/importPdfTab.js');
   return importPdfTab(new File([new Uint8Array(bytes)],'local-test.pdf',{type:'application/pdf'}),{debug:true,onProgress:p=>console.log('[PDF TAB]',p.message)});
 },bytes);
 await writeFile('artifacts/pdf-tab-import/analysis.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result.summary));
}finally{await browser.close();}
