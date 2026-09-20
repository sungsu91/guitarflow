import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SHOOTER_HARD_RANDOM_POSITIONS, SHOOTER_PROGRESS_SPEEDS, getShooterProgressRecovery, normalizeShooterProgressSpeed, scaleShooterProgressDuration} from '../src/shooter/progressionSettings.js';
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
test('hard random spans six strings through fret twelve, including chromatic notes',()=>{
 assert.equal(SHOOTER_HARD_RANDOM_POSITIONS.length,78);
 assert.equal(Math.min(...SHOOTER_HARD_RANDOM_POSITIONS.map(n=>n.midi)),40);
 assert.equal(Math.max(...SHOOTER_HARD_RANDOM_POSITIONS.map(n=>n.midi)),76);
 assert.ok(SHOOTER_HARD_RANDOM_POSITIONS.some(n=>n.pitch.includes('#')));
 for(const stringNumber of [1,2,3,4,5,6]) assert.deepEqual(SHOOTER_HARD_RANDOM_POSITIONS.filter(n=>n.stringNumber===stringNumber).map(n=>n.fretNumber),Array.from({length:13},(_,i)=>i));
});
test('next-note recovery is faster than before and ordered by difficulty for every speed',()=>{
 for(const speed of SHOOTER_PROGRESS_SPEEDS){
  const intervals=['easy','normal','difficult'].map(d=>getShooterProgressRecovery(d,speed));
  assert.ok(intervals[0]<1000);assert.ok(intervals[0]>intervals[1]&&intervals[1]>intervals[2]);
  for(const d of ['easy','normal','difficult'])assert.equal(getShooterProgressRecovery(d,speed),getShooterProgressRecovery(`${d}-random`,speed));
 }
 assert.deepEqual(['easy','normal','difficult'].map(d=>getShooterProgressRecovery(d)),[650,450,280]);
 assert.equal(normalizeShooterProgressSpeed(0),1);assert.equal(normalizeShooterProgressSpeed(Infinity),1);
});
test('all difficulty fall durations use the easy-random baseline independently of BPM',()=>{
 const source=app.slice(app.indexOf('function getShooterTargetDuration('),app.indexOf('function getShooterSpawnGap('));
 const getDuration=new Function('getShooterDifficultyPacing','SHOOTER_DIFFICULTIES',`return (${source.trim()});`)(id=>{assert.equal(id,'easy-random');return {durationMs:5800,speedScale:.8}}, {EASY_RANDOM:'easy-random'});
 const baseline=5800*1.1/(.9*.85*.8);
 for(const d of ['easy','easy-random','normal','normal-random','difficult','difficult-random']){
  assert.equal(getDuration(d),baseline);
  assert.equal(scaleShooterProgressDuration(getDuration(d),1.5),baseline/1.5);
 }
});
