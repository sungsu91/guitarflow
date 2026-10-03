import test from 'node:test';
import assert from 'node:assert/strict';
import {desktopPlaybackTarget} from '../src/etudes/desktopPlaybackFollow.js';
const viewport={left:0,right:1200,top:0,bottom:900};
const row={left:20,right:580,top:730,bottom:850};
const base={viewport,row,cursor:{left:400,right:402},maxTop:1600,maxLeft:0};

test('last line on left page remains still when BPM covers only the right page',()=>{
 const blockers=[{left:650,right:1170,top:780,bottom:898}];
 assert.deepEqual(desktopPlaybackTarget({...base,blockers}),{top:0,left:0});
});
test('visible right-hand next page needs no vertical or horizontal transition',()=>{
 const rightRow={left:620,right:1180,top:100,bottom:220};
 assert.deepEqual(desktopPlaybackTarget({...base,row:rightRow,cursor:{left:1120,right:1122},maxLeft:600}),{top:0,left:0});
});
test('an overlapping BPM panel reveals the row by only the obstructed distance',()=>{
 assert.deepEqual(desktopPlaybackTarget({...base,blockers:[{left:250,right:770,top:800,bottom:900}]}),{top:60,left:0});
});
test('multiple backing and BPM panels leave the nearest usable gap',()=>{
 const blockers=[{left:200,right:600,top:680,bottom:760},{left:300,right:800,top:790,bottom:900}];
 assert.equal(desktopPlaybackTarget({...base,blockers}).top,180);
});
test('a panel opened or dragged onto a stationary row is avoided without a row change',()=>{
 const first=desktopPlaybackTarget(base);assert.equal(first.top,0);
 const moved=desktopPlaybackTarget({...base,blockers:[{left:50,right:550,top:700,bottom:820}]});assert.equal(moved.top,160);
 const again=desktopPlaybackTarget({...base,row:{...row,top:row.top-moved.top,bottom:row.bottom-moved.top},scrollTop:moved.top,blockers:[{left:50,right:550,top:700,bottom:820}]});assert.equal(again.top,moved.top);
});
test('a next page below the viewport is revealed and repeat-back navigation returns',()=>{
 assert.equal(desktopPlaybackTarget({...base,row:{...row,top:980,bottom:1100}}).top,210);
 assert.equal(desktopPlaybackTarget({...base,row:{...row,top:-210,bottom:-90},scrollTop:400}).top,180);
});
test('oversized systems and fully covered viewports settle instead of oscillating',()=>{
 const tall={...row,top:10,bottom:1200};assert.equal(desktopPlaybackTarget({...base,row:tall}).top,0);
 assert.equal(desktopPlaybackTarget({...base,blockers:[{left:0,right:1200,top:0,bottom:900}]}).top,0);
});
test('horizontal follow moves only after the cursor actually leaves the visible sheet area',()=>{
 assert.equal(desktopPlaybackTarget({...base,cursor:{left:1180,right:1182},maxLeft:900}).left,0);
 assert.equal(desktopPlaybackTarget({...base,cursor:{left:1220,right:1222},maxLeft:900}).left,32);
});
