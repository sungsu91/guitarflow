import test from 'node:test';
import assert from 'node:assert/strict';
import {notationStaffConnections} from '../src/pdf/tab-import/notationConnections.js';
import {notationBarBounds} from '../src/pdf/tab-import/chordGeometry.js';
import {planNotationSource} from '../src/omr/notationSourcePlan.js';

function page(){
 const width=650,height=480,ink=new Uint8Array(width*height);
 const rect=(x,y,w,h)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)ink[yy*width+xx]=1;};
 const staffs=[40,180,310].map(y=>({x:20,y,width:600,height:64,spacing:16,thickness:1,lines:Array.from({length:5},(_,i)=>y+i*16)}));
 for(const s of staffs)for(const y of s.lines)rect(20,y,601,1);
 return {width,ink,staffs,rect};
}

test('connected piano bars recover both hands, including a notehead touching a real boundary',()=>{
 const {width,ink,staffs,rect}=page();
 for(const x of [20,220,420,620])rect(x,180,2,195);
 rect(211,196,11,9);
 const links=notationStaffConnections(ink,width,staffs);
 assert.equal(links.length,1);assert.deepEqual([links[0].upper,links[0].lower],[1,2]);
 for(const s of staffs.slice(1)){
  assert.equal(notationBarBounds(ink,width,s).length,1);
  assert.equal(notationBarBounds(ink,width,s,links[0].bars).length,3);
 }
});

test('a shared left connector, aligned separate barlines, and extended stems do not link parts',()=>{
 const {width,ink,staffs,rect}=page();
 rect(20,40,2,335);
 for(const s of staffs)for(const x of [220,420,620])rect(x,s.y,2,65);
 rect(300,168,2,95);rect(293,246,8,10);
 assert.deepEqual(notationStaffConnections(ink,width,staffs),[]);
});

const row=(id,connectedStaffIds)=>({id,connectedStaffIds,staff:{spacing:16},measures:[{x:20,width:200},{x:220,width:200}]});
test('Grand Staff explicitly selects the paired hands and records the separate vocal rows',()=>{
 const rows=[row(1),row(2,[3]),row(3,[2]),row(4),row(5,[6]),row(6,[5])],before=structuredClone(rows);
 const plan=planNotationSource(rows,'grand');
 assert.deepEqual(plan.systems.map(s=>s.id),[2,3,5,6]);
 assert.deepEqual(plan.excludedStaffIds,[1,4]);assert.deepEqual(rows,before);
 for(const mode of ['staff','auto'])assert.throws(()=>planNotationSource(rows,mode),/동시에.*Grand Staff/);
});

test('ambiguous groups and unequal printed bars reject before requesting recognition',()=>{
 for(const rows of [[row(1),row(2),row(3)],[row(1,[2]),row(2,[1,3]),row(3,[2])]])assert.throws(()=>planNotationSource(rows,'grand'),/마디 경계/);
 const unequal=[row(1,[2]),row(2,[1])];unequal[1].measures[0].width=160;
 assert.throws(()=>planNotationSource(unequal,'grand'),/마디 경계/);
 const melody=[row(1),row(2),row(3)];assert.equal(planNotationSource(melody,'staff').systems,melody);
 const originalPair=[row(1),row(2)];assert.equal(planNotationSource(originalPair,'grand').systems,originalPair);
});
