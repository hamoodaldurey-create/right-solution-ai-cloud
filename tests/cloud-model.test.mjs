import test from 'node:test';
import assert from 'node:assert/strict';
import {CloudModel} from '../public/cloud-model.mjs';
import {cloneKnowledge} from '../public/engine.mjs';
test('unconfigured cloud status blocks generation and sends no question', async () => {
  let calls = 0; const model = new CloudModel({fetchImpl: async () => {calls++; return Response.json({enabled: false, code: 'not_configured', capMicro: 12_000_000});}});
  await model.refresh(); await assert.rejects(model.generate('Hello', cloneKnowledge(), 'en'));
  assert.equal(calls, 1);
});
test('only bounded context reaches a same-origin endpoint, without key fields', async () => {
  let payload;
  const model = new CloudModel({requestId: () => 'ba963456-3456-4789-a123-123456789abc', fetchImpl: async (url, options) => {
    assert.equal(url.startsWith('/api/cloud/'), true);
    if (options.method === 'POST') {payload = JSON.parse(options.body); return Response.json({reply: {text: 'Draft', language: 'ar', mode: 'cloud-ai'}});}
    return Response.json({enabled: true, code: 'ready', capMicro: 12_000_000});
  }});
  await model.refresh(); const history = Array.from({length: 10}, () => ({role: 'user', text: 'x'.repeat(1000)}));
  const knowledge = cloneKnowledge();knowledge[0].answers.ar = 'ع'.repeat(2000);
  await model.generate('سؤال', knowledge, 'ar', history);
  assert.equal(payload.history.length, 4); assert.equal(payload.history[0].text.length, 600); assert.equal(payload.knowledge[0].text.length, 700);
  assert.deepEqual(Object.keys(payload).sort(), ['history', 'knowledge', 'language', 'question', 'requestId']);
});
test('availability errors preserve free mode', async () => {
  const model = new CloudModel({fetchImpl: async () => {throw new Error('Offline');}});
  assert.equal((await model.refresh()).enabled, false);
});
