import test from 'node:test';
import assert from 'node:assert/strict';
import {importedScoreTitle,normalizeImportedScoreTitle} from '../src/etudes/importedScoreTitle.js';
import {createBlankDocument,upgradeDocument,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {LIBRARY_KEY,loadLibrary,saveLibraryDocument} from '../src/etudes/scoreLibrary.js';

const imported=()=>({...createBlankDocument(),title:'Let_It_Be(코드)_페이지_1 · TAB 초안',english:'Let_It_Be(코드)_페이지_1 · TAB 초안',pdfTabImport:{fileName:'Let_It_Be(코드)_페이지_1.jpg',summary:{needsReview:1}}});
test('source file labels become song titles without losing musical numbers or subtitles',()=>{
 for(const [file,title] of [
  ['Let_It_Be(코드)_페이지_1.jpg','Let It Be'],['풀잎사랑(코드)_페이지_2.PNG','풀잎사랑'],
  ['TalkFile_Flower Dance.pdf','Flower Dance'],['Canon_in_C_TAB_Page_2.jpeg','Canon in C TAB'],
  ['Song (Live)_page_2_of_3.pdf','Song (Live)'],['일어나 (코드).pdf','일어나'],
  ['Summer_of_69.pdf','Summer of 69'],['24K Magic.pdf','24K Magic'],['Symphony No. 5.pdf','Symphony No. 5'],
  ['Let It Be (Acoustic).pdf','Let It Be (Acoustic)'],['C:\\Scores\\Flower_Dance.pdf','Flower Dance'],
  ['KakaoTalk_20261004_124105538.jpg','KakaoTalk 20261004 124105538'],['','불러온 악보'],
 ])assert.equal(importedScoreTitle(file),title,file);
});
test('legacy automatic titles migrate without changing notes, IDs, import evidence or user titles',()=>{
 const old=imported(),before=structuredClone(old),next=normalizeImportedScoreTitle(old);
 assert.equal(next.title,'Let It Be');assert.equal(next.english,next.title);
 assert.equal(next.measures,old.measures);assert.equal(next.pdfTabImport,old.pdfTabImport);
 assert.deepEqual(old,before);assert.equal(normalizeImportedScoreTitle(next),next);
 assert.deepEqual({...next,title:old.title,english:old.english},old);
 for(const title of ['직접 정한 곡 제목','Let_It_Be(코드)_페이지_1 · TAB 초안 - 편곡']){
  const manual={...old,title};assert.equal(normalizeImportedScoreTitle(manual),manual);
 }
 assert.equal(normalizeImportedScoreTitle({...old,pdfTabImport:undefined}).title,old.title);
 assert.equal(normalizeImportedScoreTitle({...old,title:old.title+' (1)'}).title,'Let It Be (1)');
 assert.equal(upgradeDocument(old).title,'Let It Be');
 assert.equal(compileDocumentV2(old,undefined,{allowIncomplete:true}).score.title,'Let It Be');
});
test('existing library titles migrate collision-safely and survive save/reopen',()=>{
 const a={...createBlankDocument(),title:'Let It Be'},b=imported(),c=imported();c.title+=' (1)';
 const records=Object.fromEntries([a,b,c].map(document=>[document.id,{document,status:'draft',updatedAt:'kept'}]));
 const values=new Map([[LIBRARY_KEY,JSON.stringify({version:2,records})]]);
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const raw=storage.getItem(LIBRARY_KEY),loaded=loadLibrary(storage);
 assert.deepEqual(loaded.errors,[]);
 assert.equal(storage.getItem(LIBRARY_KEY),raw,'reading never rewrites the stored original');
 assert.deepEqual(Object.values(loaded.records).map(r=>r.document.title),['Let It Be','Let It Be (1)','Let It Be (2)']);
 for(const [id,record] of Object.entries(loaded.records)){
  assert.deepEqual(record.document.measures,records[id].document.measures);
  assert.deepEqual(record.document.pdfTabImport,records[id].document.pdfTabImport);
  assert.equal(record.status,'draft');assert.equal(record.updatedAt,'kept');
 }
 assert.equal(saveLibraryDocument(storage,loaded.records[b.id].document).saved,true);
 assert.equal(loadLibrary(storage).records[b.id].document.title,'Let It Be (1)');
});
