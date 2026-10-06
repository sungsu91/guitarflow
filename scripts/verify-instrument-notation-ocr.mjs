import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out=process.argv[2]??'artifacts/instrument-support-20261005/notation';await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await qualityBrowser(),reports=[];
try{
 for(const kind of (process.env.NOTATION_CASES?.split(',')??['standard','grand','paired','paired-mismatch'])){
  const page=await browser.newPage({viewport:{width:900,height:430}});
  await page.route('**/__notation',r=>r.fulfill({contentType:'text/html',body:'<body style="margin:0;background:white"><div id="score"></div><input type="file" style="display:none"></body>'}));await page.goto(origin+'/__notation');
  await page.evaluate(async kind=>{
   const {default:VF}=await import('/node_modules/vexflow/build/esm/entry/vexflow.js');const f=VF.Flow??VF;
   const renderer=new f.Renderer(document.getElementById('score'),f.Renderer.Backends.SVG);renderer.resize(900,430);const ctx=renderer.getContext();
   const top=new f.Stave(35,55,810).addClef('treble').addTimeSignature('4/4').setContext(ctx);
   const upper=['c/5','d/5','e/5','g/5'].map(key=>new f.StaveNote({clef:'treble',keys:[key],duration:'q'}));
   const right=new f.Voice({num_beats:4,beat_value:4}).addTickables(upper);let bottom,left;
   if(kind==='grand'){
    bottom=new f.Stave(35,210,810).addClef('bass').addTimeSignature('4/4').setContext(ctx);
    left=new f.Voice({num_beats:4,beat_value:4}).addTickables(['c/3','g/2'].map(key=>new f.StaveNote({clef:'bass',keys:[key],duration:'h'})));
   }else if(kind.startsWith('paired')){
    bottom=new f.TabStave(35,210,810,{num_lines:6}).addTabGlyph().setContext(ctx);
    left=new f.Voice({num_beats:4,beat_value:4}).addTickables([[2,1],[2,kind==='paired-mismatch'?4:3],[1,0],[1,3]].map(([str,fret])=>new f.TabNote({positions:[{str,fret}],duration:'q'},{draw_stem:true})));
   }
   const start=Math.max(top.getNoteStartX(),bottom?.getNoteStartX()??0);top.setNoteStartX(start).draw();bottom?.setNoteStartX(start).draw();
   const fmt=new f.Formatter().joinVoices([right]);if(left)fmt.joinVoices([left]);fmt.format(left?[right,left]:[right],690);right.draw(ctx,top);if(left)left.draw(ctx,bottom);
   if(kind==='grand')new f.StaveConnector(top,bottom).setType(f.StaveConnector.type.BRACE).setContext(ctx).draw();
  },kind);
  const file=`${out}/${kind}.pdf`;await page.pdf({path:file,width:'900px',height:'430px',printBackground:true});await page.screenshot({path:`${out}/${kind}.png`});
  await page.locator('input').setInputFiles({name:randomUUID()+'.pdf',mimeType:'application/pdf',buffer:await readFile(file)});
  try{
   const result=await page.evaluate(async kind=>{
    const target=kind==='grand'?undefined:{instrument:'guitar',notationPitch:kind.startsWith('paired')?'octave-down':'concert'};
    const a=await(await import('/src/pdf/tab-import/importPdfTab.js')).importPdfTab(document.querySelector('input').files[0],{target,sourceMode:kind==='grand'?'grand':kind==='standard'?'staff':'tab',verifyNotation:kind.startsWith('paired'),signal:AbortSignal.timeout(240000)});
    const d=(await import('/src/pdf/tab-import/scoreAdapter.js')).analysisToDocument(a),compiled=(await import('/src/etudes/scoreModel.js')).compileDocumentV2(d);
    const {soundingMidi}=await import('/src/etudes/scoreTuning.js');
    return {analysis:a,document:d,errors:compiled.errors,bars:d.measures.length,events:d.measures.flatMap(m=>m.events.map(e=>({onset:e.onset,duration:e.duration,voice:e.voice,notes:e.notes.map(n=>soundingMidi(d,n)),check:e.pdfImport?.notationCheck}))),raw:a.pages.flatMap(p=>p.staffs.map(s=>s.notation?.raw)),checks:a.pages.flatMap(p=>p.pairedNotation??[])};
   },kind);
   await writeFile(`${out}/${kind}-result.json`,JSON.stringify(result,null,2));
   assert.equal(result.bars,1);assert.deepEqual(result.errors,[]);
   if(kind==='grand'){
    assert.deepEqual(result.events.filter(e=>e.voice==='right').map(e=>[e.onset,e.duration,e.notes]),[[0,'4',[72]],[480,'4',[74]],[960,'4',[76]],[1440,'4',[79]]]);
    assert.deepEqual(result.events.filter(e=>e.voice==='left').map(e=>[e.onset,e.duration,e.notes]),[[0,'2',[48]],[960,'2',[43]]]);
   }else if(kind==='standard')assert.deepEqual(result.events.map(e=>e.notes),[[72],[74],[76],[79]]);
   else assert.deepEqual(result.events.map(e=>e.check?.status),kind==='paired'?['match','match','match','match']:['match','mismatch','match','match']);
   reports.push({kind,passed:true,bars:result.bars,events:result.events});
  }catch(error){
   reports.push({kind,passed:false,error:error.message});
  }
  await page.close();console.log(JSON.stringify(reports.at(-1)));await writeFile(`${out}/report.json`,JSON.stringify(reports,null,2));
 }
}finally{await browser.close();await server.close();}
assert(reports.every(r=>r.passed),JSON.stringify(reports));
