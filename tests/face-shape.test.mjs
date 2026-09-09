import assert from 'node:assert/strict';
import test from 'node:test';
import { faceShapeControls } from '../src/shooter/recording/faceShape.js';

const face = [{x:.3,y:.4},{x:.7,y:.4},{x:.35,y:.6},{x:.65,y:.6},{x:.5,y:.45}];
test('contour sampling moves both cheek and jaw edges inward, with bounded local radii', () => {
  const controls = faceShapeControls(face);
  assert.ok(controls[0].dx < 0 && controls[1].dx > 0);
  assert.ok(controls[2].dx < 0 && controls[3].dx > 0);
  assert.equal(controls[0].y,.6);
  assert.ok(controls.every(p=>p.dy===0 && Math.abs(p.dx)<.02 && p.radius<.12));
  assert.ok(faceShapeControls(face,2)[0].radius > controls[0].radius);
});
test('missing, tiny, invalid and profile detections leave geometry unchanged', () => {
  assert.equal(faceShapeControls(null),null);
  assert.equal(faceShapeControls(face.map(p=>({...p,x:.5}))),null);
  assert.equal(faceShapeControls([...face.slice(0,4),{x:NaN,y:0}]),null);
  assert.equal(faceShapeControls([...face.slice(0,4),{x:.7,y:.45}]),null);
});
