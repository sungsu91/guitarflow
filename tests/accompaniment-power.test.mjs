import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
function callback(name,end,bindings){const text=source.slice(source.indexOf(`  const ${name} = useCallback(`),source.indexOf(`  const ${end}`,source.indexOf(`  const ${name} = useCallback(`)));const fn=text.slice(text.indexOf('useCallback(')+12,text.lastIndexOf('}, [')+1);return Function(...Object.keys(bindings),`return (${fn})`)(...Object.values(bindings));}
test('disabled accompaniment creates no voices; enabling schedules only that part',()=>{
 const drum={current:false},bass={current:false},piano={current:false},calls=[];
 const schedule=callback('schedulePreparedBackingEvent','fadeOutActiveBackingSources',{backingDrumEnabledRef:drum,backingBassEnabledRef:bass,backingPianoEnabledRef:piano,audioRef:{current:{currentTime:1}},getBackingEventTimingCompensation:()=>0,playBackingSample:(...args)=>calls.push(args)});
 for(const instrument of ['drum','bass','piano'])schedule({instrument},2);
 assert.equal(calls.length,0);bass.current=true;
 for(const instrument of ['drum','bass','piano'])schedule({instrument},2);
 assert.equal(calls.length,1);assert.equal(calls[0][5],'bass');
});
test('turning a part off stops its active and future scheduled sources',()=>{
 const stopped=[];const voices=['drum','bass','piano'].map(part=>({part,source:{stop:t=>stopped.push([part,t])},gain:{gain:{cancelAndHoldAtTime(){},setTargetAtTime(){}}}}));
 const stop=callback('fadeOutActiveBackingSources','stopBackingScheduler',{audioRef:{current:{currentTime:10}},backingActiveSourcesRef:{current:new Set(voices)}});
 stop(.02,'bass');assert.deepEqual(stopped,[['bass',10.02]]);stopped.length=0;stop(.02);assert.equal(stopped.length,3);
});
