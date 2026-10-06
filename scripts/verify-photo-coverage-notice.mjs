import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out=process.argv[2];await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();
const browser=await qualityBrowser();const results=[];
try{
 const page=await browser.newPage();
 await page.route('**/__notice',r=>r.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__notice`);
 await page.evaluate(async()=>{
  const {default:RefreshRuntime}=await import('/@react-refresh');RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
  const {default:React}=await import('/node_modules/.vite/deps/react.js'),{default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
  const {default:Notice}=await import('/src/pdf/tab-import/PdfTabCoverageNotice.jsx');
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Notice,{summary:{incompletePhotoPages:[{page:1}],pagesWithoutTab:[2]},showPhotoRecovery:true}));
 });
 await page.getByRole('alert').waitFor();
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:500});
  const result=await page.evaluate(()=>({width:innerWidth,text:document.querySelector('[role=alert]').textContent,otherNotice:!!document.querySelector('[role=status]'),overflow:document.documentElement.scrollWidth>innerWidth}));
  if(result.overflow||!result.otherNotice||result.text.includes('{value1}'))throw Error(JSON.stringify(result));
  results.push(result);await page.screenshot({path:`${out}/${width}.png`});
 }
 await writeFile(`${out}/report.json`,JSON.stringify(results,null,2));console.log(results);
}finally{await browser.close();await server.close();}
