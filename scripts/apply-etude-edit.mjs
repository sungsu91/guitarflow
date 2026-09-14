// Apply the same portable document exported by the in-app editor to the built-in catalog.
// Usage: node scripts/apply-etude-edit.mjs path/to/study.fretiva.json [--check]
import {readFile,writeFile} from 'node:fs/promises';
import {BASE_ETUDES} from '../src/etudes/catalog.js';
import {compileScoreDocument} from '../src/etudes/scoreDocument.js';
import {validateEtude} from '../src/etudes/notationData.js';
import {educationIssues} from '../src/etudes/pedagogy.js';
const input=process.argv[2];
if(!input)throw new Error('악보 JSON 파일 경로를 지정하세요.');
const raw=await readFile(input,'utf8');
if(Buffer.byteLength(raw)>2*1024*1024)throw new Error('2MB 이하의 파일을 사용하세요.');
const document=JSON.parse(raw.replace(/^\uFEFF/,''));
const base=BASE_ETUDES.find(e=>e.templateId===document.templateId);
if(!base)throw new Error('현재 커리큘럼에 없는 과제입니다.');
const result=compileScoreDocument(document,base);
if(!result.score)throw new Error(result.errors.join('\n'));
const review=[...(result.issues??[]),...validateEtude(result.score),...educationIssues(result.score)];
if(review.length)throw new Error(review.join('\n'));
if(!process.argv.includes('--check')) {
 const path=new URL('../src/etudes/scoreOverrides.json',import.meta.url);
 const documents=JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''));
 const revision=(documents[base.templateId]?.origin?.revision??base.document.origin.revision)+1;
 documents[base.templateId]={...document,id:base.id,kind:'builtin',origin:{templateId:base.templateId,revision}};
 await writeFile(path,JSON.stringify(documents,null,2)+'\n','utf8');
}
console.log(`${process.argv.includes('--check')?'검증 완료':'기본 악보 반영'}: ${base.templateId}`);
