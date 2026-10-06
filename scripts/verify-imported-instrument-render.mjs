import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
const base='artifacts/instrument-support-20261005',out=base+'/render';await mkdir(out,{recursive:true});
const docs={guitar7:analysisToDocument(JSON.parse(await readFile(base+'/instruments-final/guitar7-helvetica-pdf-analysis.json'))),piano:JSON.parse(await readFile(base+'/notation-complete/grand-result.json')).document};
await writeFile(out+'/harness.jsx',`import React from 'react';import {createRoot} from 'react-dom/client';import ScoreEditor from '/src/etudes/ScoreEditor.jsx';const root=createRoot(document.getElementById('root'));window.mountDocument=(document,mobile)=>root.render(<ScoreEditor document={document} mobile={mobile} onClose={()=>{}} onSave={d=>window.savedDocument=d}/>);`);
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();const browser=await qualityBrowser(),report=[];
try{for(const mobile of [false,true])for(const [kind,document] of Object.entries(docs)){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const html=await server.transformIndexHtml('/__instrument-render',`<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/${out}/harness.jsx"></script></body></html>`);
 await p.route('**/__instrument-render',r=>r.fulfill({contentType:'text/html',body:html}));await p.goto(`http://127.0.0.1:${server.httpServer.address().port}/__instrument-render`);
 await p.waitForFunction(()=>window.mountDocument);await p.evaluate(({document,mobile})=>window.mountDocument(document,mobile),{document,mobile});await p.locator('[data-draw-count]').first().waitFor();
 assert.equal(await p.getByText(/이 마디를 표시하지 못했습니다/).count(),0);
 if(kind==='guitar7'){
  const strings=await p.locator('[data-bar-index="0"] [data-mode="tab"][data-string]').evaluateAll(nodes=>[...new Set(nodes.map(n=>Number(n.dataset.string)))].sort((a,b)=>a-b));
  assert.deepEqual(strings,[1,2,3,4,5,6,7]);
 }else{
  const clefs=await p.locator('[data-clef]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.dataset.clef))].sort());assert.deepEqual(clefs,['bass','treble']);
  const notes=await p.locator('.etudeNoteHandle[data-midi]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.midi)).sort((a,b)=>a-b));assert.deepEqual(notes,[43,48,72,74,76,79]);
 }
 await p.screenshot({path:`${out}/${kind}-${mobile?'mobile':'desktop'}.png`});
 await p.getByRole('button',{name:'악보 재생',exact:true}).click();await p.getByRole('button',{name:'악보 재생 정지',exact:true}).waitFor();await p.getByRole('button',{name:'악보 재생 정지',exact:true}).click();
 assert.deepEqual(errors,[]);report.push({kind,mobile,rendered:true,playbackStartedStopped:true});await p.close();
}}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(report));
