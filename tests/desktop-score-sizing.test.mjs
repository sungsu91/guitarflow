import test from 'node:test';
import assert from 'node:assert/strict';
import {DESKTOP_SCORE_PAGE_HEIGHT,DESKTOP_SCORE_PAGE_RATIO,desktopScoreScale} from '../src/etudes/desktopScoreSizing.js';

test('automatic sizing fits the entire A4 page, including blank space below a short score',()=>{
 const scale=desktopScoreScale({width:1500,height:600});
 assert(scale*1100<=1500);
 assert(scale*DESKTOP_SCORE_PAGE_HEIGHT<=600);
 assert.equal(scale,600/DESKTOP_SCORE_PAGE_HEIGHT);
 assert(scale<1500/1100,'auto is distinct from width fitting');
});

test('long scores keep one-page scaling; width and percentage overrides remain available',()=>{
 const size={width:1500,height:600,scoreWidth:1100,scoreHeight:6000};
 assert.equal(desktopScoreScale(size),600/DESKTOP_SCORE_PAGE_HEIGHT);
 assert.equal(desktopScoreScale({...size,mode:'width'}),1500/1100);
 assert.equal(desktopScoreScale({...size,mode:'1.5'}),1.5);
 assert.equal(desktopScoreScale({...size,width:300}),300/1100);
});

test('page fitting follows A4 proportions for a different unscaled paper width',()=>{
 const scale=desktopScoreScale({width:900,height:700,scoreWidth:800});
 assert.equal(scale,700/(800*DESKTOP_SCORE_PAGE_RATIO));
});
