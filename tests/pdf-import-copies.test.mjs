import test from 'node:test';
import assert from 'node:assert/strict';
import {uniquePdfTitle,validatePdfFile,PDF_MAX_BYTES} from '../src/pdf/pdfLibrary.js';
test('PDF titles preserve explicit copy names and number only exact title collisions',()=>{
 const records=[{id:'a',title:'플라워댄스'},{id:'b',title:'플라워댄스 (1)'}];
 assert.equal(uniquePdfTitle(records,'플라워댄스 (2)'),'플라워댄스 (2)');
 assert.equal(uniquePdfTitle(records,'플라워댄스'),'플라워댄스 (2)');
 assert.equal(uniquePdfTitle(records,'플라워댄스','a'),'플라워댄스');
});
test('PDF validation reads only the header and rejects invalid or oversized files',async()=>{
 let reads=0;await validatePdfFile({size:50000000,arrayBuffer(){throw Error('full read');},slice(start,end){assert.equal(start,0);assert.equal(end,1024);reads++;return new Blob(['%PDF-1.7']);}});assert.equal(reads,1);
 await assert.rejects(validatePdfFile(new Blob(['not a PDF'])));
 await assert.rejects(validatePdfFile({size:PDF_MAX_BYTES+1}));
});
