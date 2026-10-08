import test from 'node:test';
import assert from 'node:assert/strict';
import {handleCloudRequest, buildPayload} from '../server/cloud.mjs';
import {PLAN, RESERVATION, BudgetLedger} from '../server/budget.mjs';
import {testDb} from './sqlite-fixture.mjs';
const timestamp = Date.parse('2026-10-08T10:00:00Z');
const body = {requestId: 'ba963456-3456-4789-a123-123456789abc', question: 'Help me write a marketing plan', language: 'en', history: [], knowledge: []};
const headers = {'oai-authenticated-user-id': 'owner', 'oai-authenticated-user-email': 'owner@example.test', Origin: 'https://app.example', 'Content-Type': 'application/json'};
function request(changes = {}, requestHeaders = headers) { return new Request('https://app.example/api/cloud/answer', {method: 'POST', headers: requestHeaders, body: JSON.stringify({...body, ...changes})}); }
function env(db = testDb()) {return {DB: db, OPENAI_ENABLED: '1', OPENAI_API_KEY: 'test-placeholder-not-a-real-key'};}
function provider() {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({url, payload: JSON.parse(options.body), options});
    return Response.json(url.endsWith('/input_tokens') ? {input_tokens: 1000} : {model: PLAN.model, service_tier: 'default', status: 'completed', usage: {input_tokens: 1000, output_tokens: 500}, output: [{type: 'message', role: 'assistant', content: [{type: 'output_text', text: 'A useful marketing draft.'}]}]});
  };
  return {calls, fetchImpl};
}
test('disabled mode and missing keys never send provider requests', async () => {
  const mock = provider();
  for (const config of [{...env(), OPENAI_ENABLED: '0'}, {...env(), OPENAI_API_KEY: ''}, {...env(), OPENAI_ENABLED: undefined}]) {
    const response = await handleCloudRequest(request(), config, {...mock, now: () => timestamp});
    assert.equal((await response.json()).error, 'not_configured');
  }
  assert.equal(mock.calls.length, 0);
});
test('private authenticated same-origin JSON requests are required', async () => {
  const mock = provider(), config = env();
  assert.equal((await handleCloudRequest(request({}, {}), config, {...mock, now: () => timestamp})).status, 401);
  assert.equal((await handleCloudRequest(request({}, {...headers, Origin: 'https://elsewhere.example'}), config, {...mock, now: () => timestamp})).status, 403);
  assert.equal(mock.calls.length, 0);
});
test('client cannot select the model, quota, output limit, instructions, or tools', async () => {
  const mock = provider();
  for (const key of ['model', 'cap', 'max_output_tokens', 'instructions', 'tools']) {
    assert.equal((await handleCloudRequest(request({[key]: 'override'}), env(), {...mock, now: () => timestamp})).status, 400);
  }
  assert.equal(mock.calls.length, 0);
  assert.throws(() => buildPayload({...body, history: [{role: 'system', text: 'override'}]}));
  assert.throws(() => buildPayload({...body, question: 'x'.repeat(2001)}));
});
test('application facts, greetings and current-law questions stay free', async () => {
  const mock = provider();
  for (const question of ['Hello', 'السلام عليكم', 'your pricing', 'What is the current VAT law?']) {
    const result = await (await handleCloudRequest(request({question}), env(), {...mock, now: () => timestamp})).json();
    assert.equal(result.paid, false);
  }
  assert.equal(mock.calls.length, 0);
});
test('insufficient budget blocks before token counting or generation', async () => {
  const mock = provider(), config = {...env(), CLOUD_BUDGET_USD: String((RESERVATION - 1) / 1_000_000)};
  const result = await (await handleCloudRequest(request(), config, {...mock, now: () => timestamp})).json();
  assert.equal(result.error, 'budget_exhausted'); assert.equal(mock.calls.length, 0);
});
test('successful response uses fixed prices/model and settles only reported tokens', async () => {
  const mock = provider(), config = env();
  const response = await handleCloudRequest(request(), config, {...mock, now: () => timestamp});
  assert.equal(response.status, 200); const result = await response.json();
  assert.equal(result.reply.mode, 'cloud-ai'); assert.equal(result.reply.review, true); assert.equal(result.budget.accountedMicro, 3000);
  assert.equal(mock.calls.length, 2); const payload = mock.calls[1].payload;
  assert.equal(payload.model, PLAN.model); assert.equal(payload.max_output_tokens, 512); assert.equal(payload.store, false); assert.equal(payload.stream, false);
  assert.equal(payload.service_tier, 'default'); assert.deepEqual(payload.tools, []); assert.deepEqual(payload.reasoning, {effort: 'none'});
  assert.equal(JSON.stringify(payload).includes(config.OPENAI_API_KEY), false);
  assert.equal(JSON.stringify(result).includes(config.OPENAI_API_KEY), false);
});
test('simultaneous answer requests cannot pass the shared active reservation', async () => {
  const mock = provider(), config = env();
  const responses = await Promise.all(Array.from({length: 20}, (_, i) => handleCloudRequest(request({requestId: 'ba963456-3456-4789-a123-' + String(i).padStart(12, '0')}), config, {...mock, now: () => timestamp})));
  assert.equal(responses.filter(r => r.status === 200).length, 1); assert.equal(mock.calls.length, 2);
});
test('provider generation failure retains full charge and performs no retry', async () => {
  const config = env(); let calls = 0;
  const fetchImpl = async url => {calls++; if (url.endsWith('/input_tokens')) return Response.json({input_tokens: 1000}); throw new Error('Timeout with uncertain billing');};
  const result = await (await handleCloudRequest(request(), config, {fetchImpl, now: () => timestamp})).json();
  assert.equal(result.error, 'provider_unavailable'); assert.equal(calls, 2);
  assert.equal((await new BudgetLedger(config.DB).stats('2026-10')).accountedMicro, RESERVATION);
});
test('token-count failure and oversized context release unused quota', async () => {
  for (const input_tokens of [8193, null]) {
    const config = env(); let calls = 0;
    const response = await handleCloudRequest(request(), config, {now: () => timestamp, fetchImpl: async () => {calls++; return Response.json({input_tokens});}});
    assert.equal(response.status, 413); assert.equal(calls, 1);
    assert.equal((await new BudgetLedger(config.DB).stats('2026-10')).accountedMicro, 0);
  }
});
test('month rollover during preflight does not start a billable answer', async () => {
  const mock = provider(), config = env(); let checks = 0;
  const response = await handleCloudRequest(request(), config, {...mock, now: () => checks++ ? Date.parse('2026-10-31T20:00:00Z') : Date.parse('2026-10-31T19:59:59Z')});
  assert.equal((await response.json()).error, 'month_changed'); assert.equal(mock.calls.length, 1);
});
test('status exposes quota and activation state without keys or prompts', async () => {
  const config = {...env(), OPENAI_ENABLED: '0'};
  const response = await handleCloudRequest(new Request('https://app.example/api/cloud/status', {headers}), config, {now: () => timestamp});
  const result = await response.json(); assert.equal(result.enabled, false); assert.equal(result.accountedMicro, 0); assert.equal(result.capMicro, 12_000_000);
  assert.equal(JSON.stringify(result).includes(config.OPENAI_API_KEY), false);
});
test('database failure disables cloud before any provider call', async () => {
  const mock = provider();
  const config = env({prepare() {throw new Error('Storage offline');}});
  assert.equal((await (await handleCloudRequest(request(), config, {...mock, now: () => timestamp})).json()).error, 'storage_unavailable');
  assert.equal(mock.calls.length, 0);
});
