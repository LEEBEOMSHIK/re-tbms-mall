import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ADMIN_GUIDES } from '../src/lib/admin-guide.ts';
import { GUIDE_CAPTURES } from '../src/lib/admin-guide-captures.ts';

test('every workflow has a real private screenshot and every capture maps to a valid step', () => {
  for (const guide of ADMIN_GUIDES) assert.ok(Object.keys(GUIDE_CAPTURES).some(key => key.startsWith(`${guide.id}:`)), guide.id);
  for (const [key, capture] of Object.entries(GUIDE_CAPTURES)) {
    const [id, index] = key.split(':');
    assert.ok(ADMIN_GUIDES.find(g => g.id === id)?.steps[Number(index)], key);
    assert.match(capture.file, /^[a-z0-9-]+\.jpg$/);
    const bytes = readFileSync(new URL(`../guide-assets/${capture.file}`, import.meta.url));
    assert.equal(bytes[0], 0xff); assert.equal(bytes[1], 0xd8);
    // Read the JPEG frame dimensions, so stale metadata cannot distort previews.
    let frameFound = false;
    for (let offset = 2; offset + 9 < bytes.length;) {
      assert.equal(bytes[offset], 0xff);
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        assert.equal(capture.height, bytes.readUInt16BE(offset + 5));
        assert.equal(capture.width, bytes.readUInt16BE(offset + 7));
        frameFound = true; break;
      }
      assert.ok(length >= 2); offset += length + 2;
    }
    assert.ok(frameFound, `${capture.file}: JPEG frame required`);
    assert.ok(!existsSync(new URL(`../public/guide-assets/${capture.file}`, import.meta.url)));
    assert.ok(capture.alt.trim() && capture.caption.trim() && capture.markers.length);
    for (const marker of capture.markers) {
      assert.ok(marker.label.trim());
      for (const value of [marker.x, marker.y, marker.width, marker.height]) assert.ok(Number.isFinite(value) && value >= 0, key);
      assert.ok(marker.width > 0 && marker.height > 0 && marker.x + marker.width <= 100 && marker.y + marker.height <= 100, key);
    }
  }
});
