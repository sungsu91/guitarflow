import test from 'node:test';
import assert from 'node:assert/strict';
import {findPrintedMeter,resolvePrintedMeter} from '../src/pdf/tab-import/printedMeter.js';
import {findBlockRests,attachNativeTabSymbols} from '../src/pdf/tab-import/tabSymbols.js';
import {resolvePage,summarizeAnalysis} from '../src/pdf/tab-import/recognition.js';
import {analysisToDocument,confirmImportedMeasure} from '../src/pdf/tab-import/scoreAdapter.js';
import {compileDocumentV2,ticksOf} from '../src/etudes/scoreModel.js';
import {validScoreMeter,meterTicks,measureMeters} from '../src/etudes/scoreMeters.js';
import {scorePlaybackReadiness} from '../src/etudes/scorePlaybackReadiness.js';
import {tabRepeatMask} from '../src/etudes/tabRepeat.js';
import {rhythmGroups} from '../src/etudes/tabRhythm.js';

const reading=(text,confidence=.98,agrees=true)=>({ocr:{text,confidence,agrees,alternatives:[]}});
const meterReading=meter=>({status:'confirmed',meter,confidence:.98,method:'stacked-meter-ocr'});
function fixture(durations=['4','8','4','8','4','8','4','8']){
 const candidates=[1,2,3].map((string,i)=>({id:`fret-${i}`,x:95,y:90+i*20,width:10,height:14,cx:100,cy:100+i*20,string,stringDistance:0,parts:1,...reading(String(i))}));
 const staff={id:1,x:40,y:100,width:650,height:100,spacing:20,thickness:1,lines:[100,120,140,160,180,200],bars:[40,690],nativeText:true,candidates,measures:[{index:0,x:40,y:100,width:650,height:100,boundariesKnown:true,rhythm:durations.map((duration,i)=>({x:100+i*20,y:250,direction:1,duration,confidence:.98,...(i?{repeatPrevious:true}: {})}))}]};
 return {page:1,width:800,height:400,staffs:[staff]};
}
const documentFor=page=>{const pages=[resolvePage(page)];return analysisToDocument({pages,fileName:'unseen.pdf',summary:summarizeAnalysis(pages)});};

test('compound meters use their own capacity without allowing arbitrary signatures',()=>{
 for(const meter of [[9,8],[12,8],[4,4],[6,8]])assert.equal(validScoreMeter(meter),true);
 for(const meter of [[12,4],[9,4],['12',8],[12,8,4],[0,8]])assert.equal(validScoreMeter(meter),false);
 assert.equal(meterTicks([12,8]),2880);
});
test('stacked meter requires agreement on both numerals, not a convenient bar total',()=>{
 const input={digits:[reading('12'),reading('8')],source:{x:50,y:100}};
 assert.deepEqual(resolvePrintedMeter(input).meter,[12,8]);
 for(const digits of [[reading('12'),reading('8',.94)],[reading('12'),reading('8',.99,false)],[reading('12'),reading('4')],[reading('12'),reading('')]])assert.equal(resolvePrintedMeter({...input,digits}).status,'unresolved');
 const page=fixture(),bar=resolvePage(page).staffs[0].measures[0];assert.equal(bar.ticks,2880);assert.deepEqual(bar.meter,[4,4]);assert.equal(bar.rhythmValid,false);
});
test('meter crop excludes ordinary fret-sized stacks and played columns',()=>{
 const p=fixture(),s=p.staffs[0],ink=new Uint8Array(p.width*p.height);s.candidates.forEach(c=>c.cx=170);
 const box=(x,y,w,h)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)ink[yy*p.width+xx]=1;};
 box(90,125,20,14);box(90,157,20,14);assert.equal(findPrintedMeter(ink,p.width,s),null);
 ink.fill(0);box(90,122,25,26);box(94,150,19,26);assert.ok(findPrintedMeter(ink,p.width,s));
 s.candidates[0].cx=100;assert.equal(findPrintedMeter(ink,p.width,s),null);
});
test('12/8 preserves quarter/eighth strums and masks repeated grips after confirmation',()=>{
 const p=fixture();p.staffs[0].meterReading=meterReading([12,8]);const d=documentFor(p),events=d.measures[0].events;
 assert.deepEqual(d.meter,[12,8]);assert.deepEqual(events.map(e=>e.duration),['4','8','4','8','4','8','4','8']);
 assert.deepEqual(events.map(e=>e.onset),[0,480,720,1200,1440,1920,2160,2640]);
 assert.deepEqual(tabRepeatMask(events),[false,true,true,true,true,true,true,true]);
 assert.ok(events.every(e=>!e.tuplet));const c=compileDocumentV2(d);assert.deepEqual(c.errors,[]);assert.deepEqual(c.issues,[]);assert.equal(scorePlaybackReadiness(d,c).allowed,true);
 assert.equal(confirmImportedMeasure(d,0).measures[0].pdfImport.needsReview,false);
});
test('24 sixteenths in a 12/8 bar survive the adapter and beam by dotted quarters',()=>{
 const p=fixture(Array(24).fill('16'));p.staffs[0].meterReading=meterReading([12,8]);const d=documentFor(p),events=d.measures[0].events;
 assert.equal(events.length,24);assert.equal(events.reduce((n,e)=>n+ticksOf(e),0),2880);assert.deepEqual(rhythmGroups(events,d.meter).map(g=>g.length),[6,6,6,6]);assert.deepEqual(compileDocumentV2(d).errors,[]);
});
test('meter carries to later pages and explicit changes keep separate capacities',()=>{
 const first=fixture();first.staffs[0].meterReading=meterReading([12,8]);const a=resolvePage(first);
 const second=fixture();second.page=2;second.meter=a.endMeter;second.meterEvidence=a.endMeterEvidence;const b=resolvePage(second);assert.equal(b.staffs[0].measures[0].rhythmValid,true);
 const third=fixture(Array(4).fill('4'));third.page=3;third.meter=b.endMeter;third.staffs[0].meterReading=meterReading([4,4]);const c=resolvePage(third);
 const pages=[a,b,c],d=analysisToDocument({pages,fileName:'renamed.pdf',summary:summarizeAnalysis(pages)});assert.deepEqual(measureMeters(d),[[12,8],[12,8],[4,4]]);assert.deepEqual(compileDocumentV2(d).errors,[]);
});
test('a half rest is an isolated rectangle above a rule, not a missing-time guess',()=>{
 const p=fixture(),s=p.staffs[0],m=s.measures[0],ink=new Uint8Array(p.width*p.height);
 for(let y=132;y<=138;y++)for(let x=510;x<=526;x++)ink[y*p.width+x]=1;
 const found=findBlockRests(ink,p.width,s,m,s.candidates);assert.equal(found.length,1);assert.equal(found[0].duration,'2');
 const r=found[0];m.rhythm=[...m.rhythm.slice(0,6).map((r,i)=>({...r,duration:['4','8','8','8','8','4'][i]})),r];s.meterReading=meterReading([12,8]);
 const d=documentFor(p);assert.deepEqual(d.measures[0].events.map(e=>e.duration),['4','8','8','8','8','4','2']);assert.equal(d.measures[0].events.at(-1).rest,true);assert.deepEqual(compileDocumentV2(d).issues,[]);
 for(let y=126;y<=148;y++)ink[y*p.width+518]=1;assert.equal(findBlockRests(ink,p.width,s,{...m,rhythm:[]},s.candidates).length,0);
});
test('stemless dotted whole notes require a compact detached dot and rhythmic context',()=>{
 const p=fixture(),s=p.staffs[0],m=s.measures[0],ink=new Uint8Array(p.width*p.height);s.candidates=s.candidates.slice(0,1);m.rhythm=[];
 for(let y=242;y<=246;y++)for(let x=106;x<=110;x++)ink[y*p.width+x]=1;
 attachNativeTabSymbols(ink,p.width,s,{rhythmicPage:false});assert.equal(m.rhythm.length,0);
 attachNativeTabSymbols(ink,p.width,s,{rhythmicPage:true});assert.equal(m.rhythm[0].duration,'1');assert.equal(m.rhythm[0].dotted,true);
 s.meterReading=meterReading([12,8]);assert.deepEqual(compileDocumentV2(documentFor(p)).issues,[]);
 m.rhythm=[];ink.fill(0);attachNativeTabSymbols(ink,p.width,s,{rhythmicPage:true});assert.equal(m.rhythm.length,0);
});
