import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
import mobileSurfaceCss from '../scripts/mobile-surface-css.mjs';
const compile = async css => (await postcss([mobileSurfaceCss()]).process(css, {from: new URL('../src/style.css', import.meta.url).pathname})).root;
test('phone designs keep cascade order and orientation guards on larger mobile surfaces', async () => {
  const root = await compile('@media (max-width: 767px) and (orientation: portrait) {.control:hover::before{color:red!important}} .later{color:blue}');
  assert.equal(root.nodes.length,3);
  assert.equal(root.nodes[0].params,'(max-width: 767px) and (orientation: portrait)');
  assert.equal(root.nodes[1].params,'(min-width: 767.01px) and (orientation: portrait)');
  assert.match(root.nodes[1].nodes[0].selector,/data-rifflab-layout="mobile"/);
  assert(root.nodes[1].nodes[0].selector.endsWith('::before'));
  assert.equal(root.nodes[2].selector,'.later');
});
test('desktop declarations are scoped while compact-phone rules stay width-specific', async () => {
  const root = await compile('@media (min-width: 768px){.control{display:block}} @media(max-width:380px){.control{font-size:10px}}');
  assert.match(root.nodes[0].nodes[0].selector,/data-rifflab-layout="desktop"/);
  assert.equal(root.nodes[1].nodes[0].selector,'.control');
  assert.equal(root.nodes.length,2);
});
test('mixed shared-stage queries keep their desktop branch and gain the mobile surface', async () => {
  const root=await compile('@media (max-width:680px), (min-width:1024px){.hud, .hud::after{display:grid}}');
  assert.equal(root.nodes[0].params,'(max-width:680px), (min-width:1024px)');
  assert.equal(root.nodes[1].nodes[0].selectors.length,2);
  assert(root.nodes[1].nodes[0].selectors.every(s=>s.includes('data-rifflab-layout="mobile"')));
});
test('unrelated stylesheet media rules are not rewritten',async()=>{
  const css='@media(max-width:680px){.library{display:flex}}';
  assert.equal((await postcss([mobileSurfaceCss()]).process(css,{from:'libraryDesign.css'})).css,css);
});
