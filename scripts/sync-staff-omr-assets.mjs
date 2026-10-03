import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Ship the exact tested WASM build: the upstream Pages URL is mutable and can
// change independently of our checksum pins. These files retain their licenses.
const vendor=new URL('../vendor/staff-omr/',import.meta.url);
const root='public/staff-omr';await mkdir(root,{recursive:true});
const files=[
 ['crispembed_ocr.js',null,'e35942986fcac5b42ba5647c270a5793874b8de5006cbd2f313ab97799017ccc'],
 ['crispembed_ocr.wasm',null,'ba54ac4f3ad06ddc6b1bb72626414b39498baacd9e768ae8e3736678b085ab1c'],
 ['crispembed-ocr.js',null,'f4d7a196227ba1650f1f5d5a22af2b0f5c70df70e035ef0504d9bb995cd96925'],
 ['tromr-q8_0.gguf','https://huggingface.co/cstr/tromr-GGUF/resolve/f7912e2c68d5d89c9ff2546bbbcc736268822af0/tromr-q8_0.gguf','dcefa3654290c2d0fd170cab75404b478b28ad926566c45c57dbd5bb299c105e'],
];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const [name,url,digest] of files){
 let bytes=await readFile(`${root}/${name}`).catch(()=>null);if(bytes&&hash(bytes)===digest)continue;
 if(url){const response=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error(`${name}: ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());}
 else bytes=await readFile(new URL(name,vendor));
 if(hash(bytes)!==digest)throw Error(`${name}: OMR runtime hash mismatch; review the upstream change before updating`);
 await writeFile(`${root}/${name}`,bytes);
}
for(const name of ['CrispEmbed-LICENSE.txt','TrOMR-LICENSE.txt'])await cp(new URL(name,vendor),`${root}/${name}`);
await cp('src/omr/staffOmr.worker.js',`${root}/worker.js`);
console.log('Pinned local staff OMR runtime and licenses ready.');
