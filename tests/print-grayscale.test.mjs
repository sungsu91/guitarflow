import assert from 'node:assert/strict';
import test from 'node:test';
import {grayscalePixels} from '../src/printing/grayscale.js';

test('print conversion removes hue while preserving contrast and alpha', () => {
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0,
    255, 255, 255, 255, 0, 0, 0, 255, 80, 80, 80, 255,
  ]);
  grayscalePixels(pixels);
  assert.deepEqual([...pixels], [
    54, 54, 54, 255, 182, 182, 182, 128, 18, 18, 18, 0,
    255, 255, 255, 255, 0, 0, 0, 255, 80, 80, 80, 255,
  ]);
});
