import assert from 'node:assert/strict';
import test from 'node:test';
import ko from '../src/i18n/locales/ko.js';
import en from '../src/i18n/locales/en.js';

test('Korean and English have exactly matching keys and interpolation parameters',()=>{
 assert.deepEqual(Object.keys(ko).sort(),Object.keys(en).sort());
 for(const key of Object.keys(ko)){
  assert.equal(typeof en[key],'string',key);
  assert.ok(en[key].length,key);
  const params=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
  assert.deepEqual(params(ko[key]),params(en[key]),key);
  assert.ok(!/[가-힣]/.test(en[key]),key);
 }
});

let instance=0;
async function fixture(stored=null,{blocked=false}={}){
 const values=new Map([['existing-score','내 악보'],['rifflabThemeMode','brand']]);
 if(stored!==null)values.set('language',stored);
 const previous={localStorage:globalThis.localStorage,window:globalThis.window,document:globalThis.document};
 const events={};
 globalThis.localStorage={getItem:key=>{if(blocked)throw Error('blocked');return values.get(key)??null;},setItem:(key,value)=>{if(blocked)throw Error('blocked');values.set(key,value);}};
 globalThis.window={addEventListener:(name,fn)=>{events[name]=fn;}};
 globalThis.document={documentElement:{lang:'ko'}};
 const api=await import(`../src/i18n/core.js?fixture=${++instance}`);
 return {api,values,events,restore(){for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}};
}
test('new and invalid preferences default to Korean',async()=>{
 for(const value of [null,'','fr','EN']){
  const f=await fixture(value);try{assert.equal(f.api.getLanguage(),'ko');assert.equal(f.api.t('common.save'),'저장');}finally{f.restore();}
 }
});
test('language switching preserves existing storage, publishes updates and survives reload',async()=>{
 const f=await fixture();
 try{
  const baseline=new Map(f.values);let updates=0;const unsubscribe=f.api.subscribeLanguage(()=>updates++);
  f.api.setLanguage('en');assert.equal(f.api.t('common.save'),'Save');assert.equal(globalThis.document.documentElement.lang,'en');assert.equal(f.values.get('language'),'en');
  for(const [key,value] of baseline)assert.equal(f.values.get(key),value);
  const reloaded=await import(`../src/i18n/core.js?fixture=${++instance}`);assert.equal(reloaded.getLanguage(),'en');
  f.api.setLanguage('ko');assert.equal(f.api.t('common.save'),'저장');assert.equal(updates,2);
  unsubscribe();f.api.setLanguage('en');assert.equal(updates,2);
  f.api.setLanguage('bad');assert.equal(f.api.getLanguage(),'en');
 }finally{f.restore();}
});
test('storage denial keeps switching usable in the current session',async()=>{
 const f=await fixture(null,{blocked:true});try{assert.equal(f.api.getLanguage(),'ko');f.api.setLanguage('en');assert.equal(f.api.getLanguage(),'en');assert.equal(f.api.t('common.cancel'),'Cancel');}finally{f.restore();}
});
test('cross-tab preference changes update only the language',async()=>{
 const f=await fixture();try{f.values.set('language','en');f.events.storage({key:'language'});assert.equal(f.api.getLanguage(),'en');f.values.delete('language');f.events.storage({key:null});assert.equal(f.api.getLanguage(),'ko');}finally{f.restore();}
});
test('interpolation preserves user content literally and canonical text remains Korean',async()=>{
 const f=await fixture('en');try{
  const title='저장 <script> $& {value2}';
  assert.equal(f.api.formatMessage('{value1} / {value2}',{value1:title,value2:0}),`${title} / 0`);
  assert.equal(ko['common.save'],'저장');
  assert.equal(f.api.localizeUi('저장'),'Save');
  assert.equal(f.api.localizeUi('내가 만든 곡 제목'),'내가 만든 곡 제목');
  assert.throws(()=>f.api.t('missing.key'),/Missing translation/);
 }finally{f.restore();}
});

test('compact labels preserve Korean, full labels and language-switch behavior',async()=>{
 const f=await fixture('en');try{
  const overrides={[ko['app.repeat']]:'editor.repeatCompact'};
  assert.equal(f.api.localizeUi(ko['app.repeat'],overrides),'Rpt.');
  assert.equal(f.api.t('app.repeat'),'Repeat');
  f.api.setLanguage('ko');assert.equal(f.api.localizeUi(ko['app.repeat'],overrides),ko['app.repeat']);
  f.api.setLanguage('en');assert.equal(f.api.localizeUi(ko['app.repeat'],overrides),'Rpt.');
  assert.equal(f.api.localizeUi(ko['etudes.quarterNote1Beat']),en['etudes.quarterNote1Beat']);
 }finally{f.restore();}
});
