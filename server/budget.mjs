// Prices checked against the official GPT-5.4 Mini page on 2026-10-08.
// Quota accounting is conservative and excludes bank fees, tax and other apps.
export const PLAN = Object.freeze({
  model: 'gpt-5.4-mini-2026-03-17',
  inputNanoUsd: 750, outputNanoUsd: 4500,
  maxInputTokens: 8192, maxOutputTokens: 512,
  capMicroUsd: 12_000_000, usdToOmr: 0.385, timezone: 'Asia/Dubai',
});
export function costMicroUsd(input, output) {
  if (![input, output].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000)) throw new Error('Invalid usage');
  return Math.ceil((input * PLAN.inputNanoUsd + output * PLAN.outputNanoUsd) / 1000);
}
export const RESERVATION = costMicroUsd(PLAN.maxInputTokens, PLAN.maxOutputTokens);
export function monthKey(timestamp) {
  if (!Number.isFinite(timestamp)) throw new Error('Invalid time');
  return new Date(timestamp + 4 * 60 * 60 * 1000).toISOString().slice(0, 7);
}
export function capMicroUsd(value) {
  if (value === undefined || value === '') return PLAN.capMicroUsd;
  const number = Number(value);
  // Configuration may reduce the approved quota, but can never increase it.
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.min(PLAN.capMicroUsd, Math.floor(number * 1_000_000));
}
export const SQL = Object.freeze({
  reserve: `INSERT INTO cloud_charges (id, month, user_id, charged_micro, status, created_ms)
    SELECT ?, ?, ?, ?, 'reserved', ?
    WHERE COALESCE((SELECT SUM(charged_micro) FROM cloud_charges WHERE month = ?), 0) + ? <= ?
      AND NOT EXISTS (SELECT 1 FROM cloud_charges WHERE status = 'halted')
      AND NOT EXISTS (SELECT 1 FROM cloud_charges WHERE status IN ('reserved', 'running') AND created_ms > ?)
      AND NOT EXISTS (SELECT 1 FROM cloud_charges WHERE created_ms > ?)
    ON CONFLICT(id) DO NOTHING`,
  stats: `SELECT COALESCE(SUM(charged_micro), 0) AS accounted_micro,
    COALESCE(SUM(CASE WHEN status IN ('reserved', 'running') THEN charged_micro ELSE 0 END), 0) AS reserved_micro,
    COUNT(*) AS requests FROM cloud_charges WHERE month = ?`,
  halted: `SELECT id FROM cloud_charges WHERE status = 'halted' LIMIT 1`,
  duplicate: `SELECT id FROM cloud_charges WHERE id = ?`,
  running: `UPDATE cloud_charges SET status = 'running' WHERE id = ? AND status = 'reserved'`,
  release: `UPDATE cloud_charges SET status = 'released', charged_micro = 0 WHERE id = ? AND status = 'reserved'`,
  settle: `UPDATE cloud_charges SET status = ?, charged_micro = ?, input_tokens = ?, output_tokens = ?
    WHERE id = ? AND status = 'running'`,
  uncertain: `UPDATE cloud_charges SET status = 'uncertain' WHERE id = ? AND status = 'running'`,
});
export class BudgetLedger {
  constructor(db, cap = PLAN.capMicroUsd) { this.db = db; this.cap = Math.min(PLAN.capMicroUsd, Math.max(0, cap)); }
  async stats(month) {
    const row = await this.db.prepare(SQL.stats).bind(month).first();
    const halted = !!await this.db.prepare(SQL.halted).first();
    const accounted = Number(row.accounted_micro);
    if (!Number.isSafeInteger(accounted) || accounted < 0) throw new Error('Invalid ledger');
    return {month, capMicro: this.cap, accountedMicro: accounted, reservedMicro: Number(row.reserved_micro), remainingMicro: Math.max(0, this.cap - accounted), halted};
  }
  async reserve(id, userId, timestamp) {
    const month = monthKey(timestamp);
    const result = await this.db.prepare(SQL.reserve).bind(id, month, userId, RESERVATION, timestamp, month, RESERVATION, this.cap, timestamp - 180_000, timestamp - 2_000).run();
    if (result.meta.changes === 1) return {accepted: true, month};
    if (await this.db.prepare(SQL.duplicate).bind(id).first()) return {accepted: false, code: 'duplicate'};
    const stats = await this.stats(month);
    return {accepted: false, code: stats.halted ? 'accounting_halted' : stats.remainingMicro < RESERVATION ? 'budget_exhausted' : 'busy'};
  }
  async start(id) {
    const result = await this.db.prepare(SQL.running).bind(id).run();
    if (result.meta.changes !== 1) throw new Error('Reservation unavailable');
  }
  async release(id) { await this.db.prepare(SQL.release).bind(id).run(); }
  async uncertain(id) { await this.db.prepare(SQL.uncertain).bind(id).run(); }
  async settle(id, usage, anomaly = false) {
    const charged = costMicroUsd(usage.input_tokens, usage.output_tokens);
    const halted = anomaly || usage.input_tokens > PLAN.maxInputTokens || usage.output_tokens > PLAN.maxOutputTokens || charged > RESERVATION;
    await this.db.prepare(SQL.settle).bind(halted ? 'halted' : 'settled', halted ? Math.max(charged, RESERVATION) : charged, usage.input_tokens, usage.output_tokens, id).run();
    return {halted, chargedMicro: halted ? Math.max(charged, RESERVATION) : charged};
  }
}
