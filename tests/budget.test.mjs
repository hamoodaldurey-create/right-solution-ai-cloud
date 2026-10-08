import test from 'node:test';
import assert from 'node:assert/strict';
import {BudgetLedger, PLAN, RESERVATION, costMicroUsd, monthKey, capMicroUsd} from '../server/budget.mjs';
import {testDb} from './sqlite-fixture.mjs';
const timestamp = Date.parse('2026-10-08T10:00:00Z');
test('token cost rounds up, includes all output, and never credits caching', () => {
  assert.equal(costMicroUsd(1000, 500), 3000);
  assert.equal(costMicroUsd(1, 0), 1);
  assert.equal(RESERVATION, 8448);
  assert.throws(() => costMicroUsd(-1, 1)); assert.throws(() => costMicroUsd(1.1, 1));
});
test('configuration may lower the quota but cannot exceed the approved cap', () => {
  assert.equal(capMicroUsd('999'), PLAN.capMicroUsd);
  assert.equal(capMicroUsd('5'), 5_000_000);
  assert.equal(capMicroUsd('-1'), 0); assert.equal(capMicroUsd('bad'), 0);
});
test('calendar months reset at midnight in UTC+4, including year rollover', () => {
  assert.equal(monthKey(Date.parse('2026-10-31T19:59:59Z')), '2026-10');
  assert.equal(monthKey(Date.parse('2026-10-31T20:00:00Z')), '2026-11');
  assert.equal(monthKey(Date.parse('2026-12-31T20:00:00Z')), '2027-01');
});
test('concurrent SQL reservations admit one active request across ledger instances', async () => {
  const db = testDb();
  const results = await Promise.all(Array.from({length: 25}, (_, i) => new BudgetLedger(db).reserve('request-' + i, 'owner', timestamp)));
  assert.equal(results.filter(r => r.accepted).length, 1);
  assert.equal((await new BudgetLedger(db).stats('2026-10')).accountedMicro, RESERVATION);
});
test('quota admission is atomic even when older in-flight leases have expired', async () => {
  const ledger = new BudgetLedger(testDb(), 2 * RESERVATION);
  const results = await Promise.all([0, 1, 2, 3].map(i => ledger.reserve('r-' + i, 'owner', timestamp + i * 200_000)));
  assert.equal(results.filter(r => r.accepted).length, 2);
  assert.equal((await ledger.stats('2026-10')).accountedMicro, 2 * RESERVATION);
});
test('settlement releases unused reservation once and duplicates cannot charge twice', async () => {
  const ledger = new BudgetLedger(testDb());
  await ledger.reserve('one', 'owner', timestamp); await ledger.start('one');
  await ledger.settle('one', {input_tokens: 1000, output_tokens: 500});
  await ledger.settle('one', {input_tokens: 2000, output_tokens: 500});
  assert.equal((await ledger.stats('2026-10')).accountedMicro, 3000);
  assert.equal((await ledger.reserve('one', 'owner', timestamp + 10_000)).code, 'duplicate');
});
test('uncertain requests retain the full reservation after timeout or reload', async () => {
  const db = testDb(), ledger = new BudgetLedger(db);
  await ledger.reserve('timeout', 'owner', timestamp); await ledger.start('timeout');
  await ledger.uncertain('timeout'); await ledger.release('timeout');
  assert.equal((await new BudgetLedger(db).stats('2026-10')).accountedMicro, RESERVATION);
});
test('preflight failures can release an unused reservation', async () => {
  const ledger = new BudgetLedger(testDb());
  await ledger.reserve('preflight', 'owner', timestamp); await ledger.release('preflight');
  assert.equal((await ledger.stats('2026-10')).accountedMicro, 0);
});
test('anomalous provider usage halts new requests across future months', async () => {
  const ledger = new BudgetLedger(testDb());
  await ledger.reserve('anomaly', 'owner', timestamp); await ledger.start('anomaly');
  await ledger.settle('anomaly', {input_tokens: 8193, output_tokens: 512});
  assert.equal((await ledger.stats('2026-10')).halted, true);
  assert.equal((await ledger.reserve('next', 'owner', Date.parse('2026-11-08T10:00:00Z'))).code, 'accounting_halted');
});
test('new months retain previous accounting without carrying settled usage into the next quota', async () => {
  const ledger = new BudgetLedger(testDb(), RESERVATION);
  await ledger.reserve('october', 'owner', timestamp); await ledger.start('october'); await ledger.uncertain('october');
  assert.equal((await ledger.reserve('november', 'owner', Date.parse('2026-11-08T10:00:00Z'))).accepted, true);
  assert.equal((await ledger.stats('2026-10')).accountedMicro, RESERVATION);
  assert.equal((await ledger.stats('2026-11')).accountedMicro, RESERVATION);
});
