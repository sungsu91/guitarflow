// Optional developer experiment only: assets remain in ignored tmp/, not the app bundle.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../tmp/omr-research/',import.meta.url);await mkdir(root,{recursive:true});
const files=[
 ['crispembed_ocr.js','https://crispstrobe.github.io/CrispEmbed/crispembed_ocr.js','e35942986fcac5b42ba5647c270a5793874b8de5006cbd2f313ab97799017ccc'],
 ['crispembed_ocr.wasm','https://crispstrobe.github.io/CrispEmbed/crispembed_ocr.wasm','ba54ac4f3ad06ddc6b1bb72626414b39498baacd9e768ae8e3736678b085ab1c'],
 ['crispembed-ocr.js','https://raw.githubusercontent.com/CrispStrobe/CrispEmbed/main/wasm/crispembed-ocr.js','f4d7a196227ba1650f1f5d5a22af2b0f5c70df70e035ef0504d9bb995cd96925'],
 ['tromr-q8_0.gguf','https://huggingface.co/cstr/tromr-GGUF/resolve/main/tromr-q8_0.gguf','dcefa3654290c2d0fd170cab75404b478b28ad926566c45c57dbd5bb299c105e'],
];
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const [name,url,expected] of files){
 const target=new URL(name,root),old=await readFile(target).catch(()=>null);
 if(old&&hash(old)===expected){console.log('Verified',name);continue;}
 const response=await fetch(url);if(!response.ok)throw Error(`${name}: HTTP ${response.status}`);
 const data=Buffer.from(await response.arrayBuffer());if(hash(data)!==expected)throw Error(`${name}: upstream changed; review before updating the pinned hash`);
 await writeFile(target,data);console.log('Downloaded and verified',name,data.length);
}
for(const [name,url] of [['CrispEmbed-LICENSE.txt','https://raw.githubusercontent.com/CrispStrobe/CrispEmbed/main/LICENSE'],['TrOMR-LICENSE.txt','https://raw.githubusercontent.com/NetEase/Polyphonic-TrOMR/master/LICENSE']]){
 const response=await fetch(url);if(!response.ok)throw Error(`License retrieval failed: ${url}`);await writeFile(new URL(name,root),await response.text());
}
console.log('Open http://127.0.0.1:5173/experiments/omr/ after starting Vite. No user PDF is uploaded.');
