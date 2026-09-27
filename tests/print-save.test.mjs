import test from 'node:test';
import assert from 'node:assert/strict';
import {pdfFilename,savePdf} from '../src/printing/savePdf.js';

test('PDF filename preserves the title without duplicated suffix or path characters',()=>{
 assert.equal(pdfFilename('  연습/악보.pdf  '),'연습_악보.pdf');
 assert.equal(pdfFilename('  '),'FRETIVA LAB.pdf');
});
test('mobile sharing sends the prepared PDF file and handles cancellation without navigation',async()=>{
 const blob=new Blob(['%PDF-test'],{type:'application/pdf'}),calls=[];
 const target={File,navigator:{canShare:({files})=>files[0].type==='application/pdf',share:data=>{calls.push(data);return Promise.resolve();}}};
 assert.equal(await savePdf(blob,'연습.pdf',{mobile:true,target}),true);
 assert.equal(calls[0].files[0].name,'연습.pdf');assert.equal(await calls[0].files[0].text(),'%PDF-test');
 target.navigator.share=()=>Promise.reject(new DOMException('Cancelled','AbortError'));
 assert.equal(await savePdf(blob,'연습.pdf',{mobile:true,target}),false);
 target.navigator.share=()=>Promise.reject(new DOMException('Unavailable','NotAllowedError'));
 await assert.rejects(savePdf(blob,'연습.pdf',{mobile:true,target}),{name:'NotAllowedError'});
});
test('desktop or unsupported sharing downloads without opening a viewer',async()=>{
 for(const mobile of [false,true]){
  const calls=[],link={click:()=>calls.push('click'),remove:()=>calls.push('remove')};
  const target={File,navigator:{canShare:()=>false},document:{createElement:()=>link,body:{append:el=>assert.equal(el,link)}},URL:{createObjectURL:()=> 'blob:pdf',revokeObjectURL:url=>calls.push(url)},setTimeout:fn=>fn()};
  assert.equal(await savePdf(new Blob(['pdf']),'test.pdf',{mobile,target}),true);
  assert.equal(link.download,'test.pdf');assert.equal(link.href,'blob:pdf');assert.deepEqual(calls,['click','remove','blob:pdf']);
 }
});
