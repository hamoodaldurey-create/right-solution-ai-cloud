export class CloudModel {
  constructor({fetchImpl = fetch, requestId = () => crypto.randomUUID(), onState = () => {}} = {}) {
    this.fetchImpl = fetchImpl; this.requestId = requestId; this.onState = onState;
    this.snapshot = {enabled: false, code: 'checking'}; this.controller = null;
  }
  async refresh() {
    try {
      const response = await this.fetchImpl('/api/cloud/status', {credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(8_000)});
      if (!response.ok) throw new Error('Unavailable');
      const result = await response.json();
      if (!Number.isSafeInteger(result.capMicro) || result.capMicro < 0 || result.capMicro > 12_000_000 || typeof result.code !== 'string') throw new Error('Invalid status');
      this.snapshot = {...result, enabled: result.enabled === true};
    } catch { this.snapshot = {enabled: false, code: 'unavailable'}; }
    this.onState(this.snapshot); return this.snapshot;
  }
  async generate(question, knowledge, language, history = []) {
    if (!this.snapshot.enabled) throw Object.assign(new Error('Cloud not ready'), {code: 'not_configured'});
    if (this.controller) throw Object.assign(new Error('Busy'), {code: 'busy'});
    const controller = this.controller = new AbortController();
    try {
      const response = await this.fetchImpl('/api/cloud/answer', {
        method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(90_000)]),
        body: JSON.stringify({requestId: this.requestId(), question, language,
          knowledge: knowledge.map(k => ({id: k.id, text: k.answers[language].slice(0, 700)})),
          history: history.filter(m => !m.welcome && ['user', 'assistant'].includes(m.role) && typeof m.text === 'string').slice(-4).map(m => ({role: m.role, text: m.text.slice(0, 600)})),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Object.assign(new Error('Cloud unavailable'), {code: result.error ?? 'unavailable'});
      if (!result.reply || typeof result.reply.text !== 'string' || !['ar', 'en'].includes(result.reply.language)) throw new Error('Invalid answer');
      return {...result.reply, text: result.reply.text.slice(0, 4000)};
    } catch (error) { if (controller.signal.aborted) throw Object.assign(new Error('Display stopped'), {code: 'cancelled'}); throw error; }
    finally { this.controller = null; this.refresh().catch(() => {}); }
  }
  stop() { this.controller?.abort(); }
}
