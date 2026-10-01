import test from 'node:test';
import assert from 'node:assert/strict';
import {getIsTabletLayout} from '../src/layouts/tabletLayout.js';

function viewport({width,height,screenWidth=width,screenHeight=height,ua='',touch=0,coarse=false}) {
  return {innerWidth:width,innerHeight:height,screen:{width:screenWidth,height:screenHeight},navigator:{userAgent:ua,maxTouchPoints:touch},matchMedia:q=>({matches:q.includes('max-width')?width<=1023:q.includes('coarse')?coarse:false})};
}
test('iPad keeps tablet UI in portrait, landscape, split view and with a trackpad',()=>{
  for(const [width,height] of [[820,1180],[1180,820],[507,1180],[375,1024],[1366,1024]])
    assert.equal(getIsTabletLayout(viewport({width,height,ua:'Macintosh Safari',touch:5})),true);
});
test('Galaxy Tab and large touch tablets use tablet UI beyond desktop breakpoints',()=>{
  assert.equal(getIsTabletLayout(viewport({width:1600,height:1000,ua:'Android SM-X910',touch:10,coarse:true})),true);
  assert.equal(getIsTabletLayout(viewport({width:1024,height:1366,coarse:true})),true);
  assert.equal(getIsTabletLayout(viewport({width:507,height:1180,screenWidth:820,screenHeight:1180,touch:1,coarse:true})),true);
});
test('phones keep their UI when rotated and mouse desktops keep desktop UI',()=>{
  for(const [width,height,ua] of [[390,844,'iPhone Mobile'],[844,390,'iPhone Mobile'],[915,412,'Android Mobile']])
    assert.equal(getIsTabletLayout(viewport({width,height,ua,touch:5,coarse:true})),false);
  assert.equal(getIsTabletLayout(viewport({width:1440,height:900})),false);
  assert.equal(getIsTabletLayout(null),false);
});
