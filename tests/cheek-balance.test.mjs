import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const scope={self:{}};vm.runInNewContext(readFileSync(new URL('../public/vendor/face-landmarker/cheek-balance.js',import.meta.url),'utf8'),scope);
const balance=scope.self.cheekBalance;
function face(){const p=Array.from({length:478},()=>({x:.5,y:.5,z:0}));for(const [i,x,y] of [[33,.35,.35],[263,.65,.35],[168,.5,.36],[152,.5,.8],[1,.5,.5],[172,.3,.65],[397,.7,.65]])p[i]={x,y,z:0};return p;}
test('symmetric and undetected faces receive no displacement',()=>{assert.ok(balance(face()).pulls.filter((_,i)=>i%4>1).every(x=>x===0));assert.equal(balance(null).radius,0);});
test('jaw correction is bounded, points toward balance and shuts off for yaw',()=>{const p=face();p[172].x=.26;const b=balance(p);assert.ok(b.pulls[2]<0);assert.ok(Math.abs(b.pulls[2])<=.3*.018);assert.equal(b.pulls[2],b.pulls[6]);p[33].z=.15;assert.equal(balance(p).radius,0);});
test('tilting the head rotates correction rather than changing its strength',()=>{const p=face();p[172].x=.26;const before=balance(p);const angle=.2;const rotated=p.map(q=>({...q,x:.5+(q.x-.5)*Math.cos(angle)-(q.y-.5)*Math.sin(angle),y:.5+(q.x-.5)*Math.sin(angle)+(q.y-.5)*Math.cos(angle)}));const after=balance(rotated);assert.ok(Math.abs(Math.hypot(after.pulls[2],after.pulls[3])-Math.abs(before.pulls[2]))<1e-8);});
