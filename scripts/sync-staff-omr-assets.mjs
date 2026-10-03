import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='public/staff-omr';await mkdir(root,{recursive:true});
const files=[
 ['crispembed_ocr.js','https://crispstrobe.github.io/CrispEmbed/crispembed_ocr.js','e35942986fcac5b42ba5647c270a5793874b8de5006cbd2f313ab97799017ccc'],
 ['crispembed_ocr.wasm','https://crispstrobe.github.io/CrispEmbed/crispembed_ocr.wasm','ba54ac4f3ad06ddc6b1bb72626414b39498baacd9e768ae8e3736678b085ab1c'],
 ['crispembed-ocr.js','https://raw.githubusercontent.com/CrispStrobe/CrispEmbed/main/wasm/crispembed-ocr.js','f4d7a196227ba1650f1f5d5a22af2b0f5c70df70e035ef0504d9bb995cd96925'],
 ['tromr-q8_0.gguf','https://huggingface.co/cstr/tromr-GGUF/resolve/main/tromr-q8_0.gguf','dcefa3654290c2d0fd170cab75404b478b28ad926566c45c57dbd5bb299c105e'],
];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const [name,url,digest] of files){
 let bytes=await readFile(`${root}/${name}`).catch(()=>null);if(bytes&&hash(bytes)===digest)continue;
 bytes=await readFile(`tmp/omr-research/${name}`).catch(()=>null);
 if(!bytes||hash(bytes)!==digest){const response=await fetch(url);if(!response.ok)throw Error(`${name}: ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());}
 if(hash(bytes)!==digest)throw Error(`${name}: OMR runtime hash mismatch; review the upstream change before updating`);
 await writeFile(`${root}/${name}`,bytes);
}
for(const [name,url] of [['CrispEmbed-LICENSE.txt','https://raw.githubusercontent.com/CrispStrobe/CrispEmbed/main/LICENSE'],['TrOMR-LICENSE.txt','https://raw.githubusercontent.com/NetEase/Polyphonic-TrOMR/master/LICENSE']]){
 const cached=await readFile(`tmp/omr-research/${name}`).catch(()=>null);
 if(cached)await writeFile(`${root}/${name}`,cached);else if(!await readFile(`${root}/${name}`).catch(()=>null)){const response=await fetch(url);if(!response.ok)throw Error(`Missing license ${name}`);await writeFile(`${root}/${name}`,await response.text());}
}
await cp('src/omr/staffOmr.worker.js',`${root}/worker.js`);
console.log('Pinned local staff OMR runtime and licenses ready.');
