import test from 'node:test';
import assert from 'node:assert/strict';
import {pdfFilename,savePdf,canChoosePdfFile,choosePdfFile} from '../src/printing/savePdf.js';

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

test('the computer save picker opens immediately with a PDF filename and filter',async()=>{
 const handle={name:'chosen.pdf'},calls=[],target={showSaveFilePicker:options=>{calls.push(options);return Promise.resolve(handle);}};
 assert.equal(canChoosePdfFile(target),true);assert.equal(canChoosePdfFile({}),false);
 const pending=choosePdfFile('  연습/악보.pdf  ',{target});
 assert.equal(calls.length,1,'picker must run synchronously within the user gesture');
 assert.equal(await pending,handle);assert.equal(calls[0].suggestedName,'연습_악보.pdf');
 assert.deepEqual(calls[0].types,[{description:'PDF',accept:{'application/pdf':['.pdf']}}]);
 assert.equal(calls[0].excludeAcceptAllOption,true);
});

test('cancelling the computer picker is not an error and cannot start another download',async()=>{
 const target={showSaveFilePicker:()=>Promise.reject(new DOMException('Cancelled','AbortError'))};
 assert.equal(await choosePdfFile('score',{target}),null);
 target.showSaveFilePicker=()=>Promise.reject(new DOMException('Denied','SecurityError'));
 await assert.rejects(choosePdfFile('score',{target}),{name:'SecurityError'});
});

test('a selected computer file receives the exact PDF bytes and is closed before success',async()=>{
 const blob=new Blob(['%PDF-test'],{type:'application/pdf'}),calls=[];
 const fileHandle={createWritable:async()=>({write:async data=>{assert.equal(data,blob);calls.push('write');},close:async()=>{calls.push('close');}})};
 assert.equal(await savePdf(blob,'ignored.pdf',{fileHandle,target:{}}),true);
 assert.deepEqual(calls,['write','close']);
});

test('write failures and cancellation abort the transaction without committing or downloading elsewhere',async()=>{
 for(const mode of ['write','close','cancel']){
  const calls=[],controller=new AbortController(),failure=new Error('Disk full');
  const fileHandle={createWritable:async()=>({
   write:async()=>{calls.push('write');if(mode==='write')throw failure;if(mode==='cancel')controller.abort();},
   close:async()=>{calls.push('close');throw failure;},
   abort:async()=>{calls.push('abort');},
  })};
  await assert.rejects(savePdf(new Blob(['pdf']),'score.pdf',{fileHandle,signal:controller.signal,target:{}}),mode==='cancel'?{name:'AbortError'}:failure);
  assert.deepEqual(calls,mode==='close'?['write','close','abort']:['write','abort']);
 }
 const controller=new AbortController();controller.abort();
 await assert.rejects(savePdf(new Blob(['pdf']),'score.pdf',{signal:controller.signal,fileHandle:{createWritable:()=>assert.fail('must not touch a file after cancellation')},target:{}}),{name:'AbortError'});
});
