import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve,isAbsolute,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

test('photo audit permits only an unchanged glyph moving from unknown rhythm to its measured stem',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tab-photo-audit-'));
 assert(isAbsolute(root));assert.equal(dirname(root),resolve(tmpdir()));assert(basename(root).startsWith('tab-photo-audit-'));
 try{
  for(const name of ['baseline-print','candidate-print'])await mkdir(join(root,name));
  await writeFile(join(root,'manifest.json'),JSON.stringify({cases:[{id:'audit-only',group:'photo'}]}));
  const note={string:5,fret:1,status:'confirmed',source:{x:400,y:300,width:12,height:20}};
  const make=(x,duration,method)=>({analysis:{pages:[{page:1,width:1000,height:1000,staffs:[{id:1,measures:[{x:100,y:200,width:500,height:100,source:{measure:1},slots:[{x,duration,method,notes:[structuredClone(note)]}]}]}]}]},report:{detectedBars:1,pageErrors:[],compileErrors:[],liveWorkers:0}});
  for(const [change,passed] of [[()=>{},true],[(b,c)=>{c.analysis.pages[0].staffs[0].measures[0].slots[0].notes[0].source.x+=5;},false],[(b,c)=>{c.analysis.pages[0].staffs[0].measures[0].slots[0].notes[0].fret=2;},false],[(b,c)=>{b.analysis.pages[0].staffs[0].measures[0].slots[0].duration='8';},false],[(b,c)=>{c.analysis.pages[0].staffs[0].measures[0].slots[0].method='unmeasured';},false]]){
   const baseline=make(380,null),candidate=make(410,'8','wide-photo-stem');change(baseline,candidate);
   await writeFile(join(root,'baseline-print/audit-only.json'),JSON.stringify(baseline));await writeFile(join(root,'candidate-print/audit-only.json'),JSON.stringify(candidate));
   const result=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/assess-photo-recheck.mjs',import.meta.url)),root],{encoding:'utf8',windowsHide:true});
   assert.equal(result.status,passed?0:1,result.stderr||result.stdout);
  }
 }finally{await rm(root,{recursive:true,force:true});}
});
