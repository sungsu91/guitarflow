import test from 'node:test';
import assert from 'node:assert/strict';
import {readLegacyScoreLibrary,createBrowserScoreLibrary,scoreStorageError,reuseLibraryRecords} from '../src/etudes/browserScoreLibrary.js';
import {createBlankDocument} from '../src/etudes/scoreModel.js';
import {LIBRARY_KEY} from '../src/etudes/scoreLibrary.js';
import {EDITS_STORAGE_KEY} from '../src/etudes/scoreDocument.js';

test('legacy migration reads a full store without writing or removing the recovery copy',()=>{
 const document=createBlankDocument(),raw=JSON.stringify({[document.id]:document});
 let writes=0;const storage={getItem:key=>key===EDITS_STORAGE_KEY?raw:null,setItem(){writes++;throw new DOMException('full','QuotaExceededError');}};
 const result=readLegacyScoreLibrary([],storage);
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.records[document.id].document.measures,document.measures);
 assert.equal(writes,0);assert.equal(storage.getItem(EDITS_STORAGE_KEY),raw);assert.equal(storage.getItem(LIBRARY_KEY),null);
});

test('a corrupt legacy envelope cannot be replaced by an empty migration',()=>{
 const raw='{broken',storage={getItem:()=>raw};
 assert.equal(readLegacyScoreLibrary([],storage).errors.length,1);assert.equal(storage.getItem(LIBRARY_KEY),raw);
});

test('database denial never reports a save or delete as successful',async()=>{
 const repo=createBrowserScoreLibrary({indexedDB:null,legacyStorage:()=>{throw Error('not touched');}});
 assert.equal((await repo.save(createBlankDocument())).saved,false);
 assert.equal((await repo.remove('old-score')).saved,false);
 assert.equal((await repo.load()).errors.length,1);
 assert.match(scoreStorageError(new DOMException('raw quota detail','QuotaExceededError')),/현재 초안/);
});

test('unchanged storage refresh preserves score identity used by playback and engraving',()=>{
 const document=createBlankDocument(),records={[document.id]:{status:'draft',document}};
 const refreshed=reuseLibraryRecords(records,JSON.parse(JSON.stringify(records)));
 assert.equal(refreshed,records);
 assert.equal(refreshed[document.id].document.measures,document.measures);
});

test('updating a different score does not replace the active score',()=>{
 const a=createBlankDocument(),b=createBlankDocument(),before={[a.id]:{document:a},[b.id]:{document:b}};
 const incoming=structuredClone(before);incoming[b.id].document.title='Changed elsewhere';
 const after=reuseLibraryRecords(before,incoming);
 assert.equal(after[a.id],before[a.id]);assert.notEqual(after[b.id],before[b.id]);
 assert.equal(after[b.id].document.title,'Changed elsewhere');
});

test('metadata refresh does not stop playback, but actual document edits are accepted',()=>{
 const d=createBlankDocument(),before={[d.id]:{document:d,status:'draft',updatedAt:null}};
 const incoming=structuredClone(before);incoming[d.id].updatedAt='2026-10-04T00:00:00Z';incoming[d.id].status='saved';
 const metadata=reuseLibraryRecords(before,incoming);
 assert.equal(metadata[d.id].document,d);assert.equal(metadata[d.id].status,'saved');
 const changed=structuredClone(incoming);changed[d.id].document.measures[0].harmony='Am';
 const after=reuseLibraryRecords(metadata,changed);
 assert.notEqual(after[d.id].document,d);assert.equal(after[d.id].document.measures[0].harmony,'Am');
 assert.equal(d.measures[0].harmony,null);
});

test('snapshot reuse neither resurrects deleted scores nor discards new/unreadable entries',()=>{
 const d=createBlankDocument(),before={[d.id]:{document:d}};
 const incoming={broken:{status:'unreadable',raw:'corrupt source'}};
 const after=reuseLibraryRecords(before,incoming);
 assert.equal(after[d.id],undefined);assert.equal(after.broken,incoming.broken);
 assert.equal(reuseLibraryRecords(after,structuredClone(after)),after);
 assert.deepEqual(reuseLibraryRecords(after,{}),{});
});
