import test from 'node:test';
import assert from 'node:assert/strict';
import { checkApiHealth } from '../src/lib/health.ts';

test('accepts the expected health contract and uses the configured base URL', async () => {
  const result = await checkApiHealth('http://127.0.0.1:8100/', { fetcher: async (input, init) => {
    assert.equal(input, 'http://127.0.0.1:8100/api/v1/health');
    assert.equal(init?.cache, 'no-store');
    return Response.json({ status: 'ok', service: 're-tbms-mall-api' });
  }});
  assert.deepEqual(result, { status: 'connected' });
});

test('rejects HTTP failure without exposing server details', async () => {
  const result = await checkApiHealth('http://localhost:8100', { fetcher: async () => new Response('secret diagnostic', { status: 503 }) });
  assert.deepEqual(result, { status: 'error', reason: 'unavailable' });
});

test('rejects wrong payloads and malformed JSON', async () => {
  for (const payload of [null, {}, { status: 'ok', service: 'another-service' }, { status: 'error', service: 're-tbms-mall-api' }]) {
    assert.deepEqual(await checkApiHealth('http://localhost:8100', { fetcher: async () => Response.json(payload) }), { status: 'error', reason: 'invalid-response' });
  }
  assert.deepEqual(await checkApiHealth('http://localhost:8100', { fetcher: async () => new Response('not json') }), { status: 'error', reason: 'invalid-response' });
});

test('reports connection failure without exposing the thrown message', async () => {
  assert.deepEqual(await checkApiHealth('http://localhost:8100', { fetcher: async () => { throw new Error('private host detail'); } }), { status: 'error', reason: 'unavailable' });
});

test('aborts a slow request and reports timeout', async () => {
  let aborted = false;
  const result = await checkApiHealth('http://localhost:8100', { timeoutMs: 10, fetcher: async (_input, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
  }) });
  assert.equal(aborted, true);
  assert.deepEqual(result, { status: 'error', reason: 'timeout' });
});

