import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { parseTheme, resolveTheme, themeInitScript } from '../src/lib/theme.ts';

test('invalid preferences use system, explicit themes ignore system', () => {
  for (const value of [null, undefined, 'invalid', {}, 1, 'system']) assert.equal(parseTheme(value), 'system');
  assert.equal(resolveTheme(parseTheme('dark'), false), 'dark');
  assert.equal(resolveTheme(parseTheme('light'), true), 'light');
});

test('prepaint applies saved/system preferences without relying on React or writable storage', () => {
  for (const stored of ['light', 'dark', 'system', 'invalid', null]) for (const systemDark of [true, false]) for (const blocked of [true, false]) {
    const document = { documentElement: { dataset: {} as Record<string, string> } };
    runInNewContext(themeInitScript, { document, localStorage: { getItem() { if (blocked) throw Error('blocked'); return stored; } }, matchMedia: () => ({ matches: systemDark }) });
    assert.equal(document.documentElement.dataset.theme, resolveTheme(parseTheme(blocked ? null : stored), systemDark));
  }
});
