import test from 'node:test';
import assert from 'node:assert/strict';
import { studioDistance } from '../src/features/garment-designer/studio-camera.ts';
test('studio fit contains authored wide sleeves even in portrait viewport', () => {
  const distance = studioDistance(2.8, 1.9, 1.1, .7);
  const halfHeight = (distance - .55) * Math.tan(38 * Math.PI / 360);
  assert.ok(halfHeight * .7 > 1.4);
  assert.ok(halfHeight > .95);
});
test('narrower view increases distance without changing garment geometry', () => {
  assert.ok(studioDistance(2.8, 1.9, 1.1, .7) > studioDistance(2.8, 1.9, 1.1, 1.5));
});
