import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {spawnSync} from 'node:child_process';

test('clean OCR runtime setup preserves audited bytes without mutable upstream downloads',async()=>{
 const root=await mkdtemp(join(tmpdir(),'fretiva-omr-install-'));
 try{
  await mkdir(join(root,'public/staff-omr'),{recursive:true});
  await mkdir(join(root,'src/omr'),{recursive:true});
  await cp(new URL('../public/staff-omr/tromr-q8_0.gguf',import.meta.url),join(root,'public/staff-omr/tromr-q8_0.gguf'));
  await writeFile(join(root,'src/omr/staffOmr.worker.js'),'// test worker\n');
  const script=new URL('../scripts/sync-staff-omr-assets.mjs',import.meta.url);
  const child=spawnSync(process.execPath,['--input-type=module','--eval',`globalThis.fetch=()=>{throw Error('Unexpected upstream request');};await import(${JSON.stringify(script.href)});`],{cwd:root,encoding:'utf8',timeout:30000});
  assert.equal(child.status,0,child.stderr);
  for(const name of ['crispembed_ocr.js','crispembed_ocr.wasm','crispembed-ocr.js','CrispEmbed-LICENSE.txt','TrOMR-LICENSE.txt']){
   assert.deepEqual(await readFile(join(root,'public/staff-omr',name)),await readFile(new URL('../vendor/staff-omr/'+name,import.meta.url)),name);
  }
  assert.equal(await readFile(join(root,'public/staff-omr/worker.js'),'utf8'),'// test worker\n');
 }finally{
  assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep+'fretiva-omr-install-'));
  await rm(root,{recursive:true,force:true});
 }
});
