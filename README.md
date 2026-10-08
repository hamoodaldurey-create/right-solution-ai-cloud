# Right Solution AI Cloud — Beta v0.5

مساعد أعمال بالعربية والإنجليزية، مطوّر من الإصدار 0.2. الوضع المجاني يعمل فوراً: تحيات، 15 دليلاً تجارياً، قوالب مراسلات، وحاسبة الربح والتعادل. يمكن تفعيل Qwen3 محلياً على جهاز يدعم WebGPU.

**إجابات OpenAI مجهّزة برمجياً لكنها غير مفعّلة في النسخة المنشورة. لا يوجد مفتاح API محفوظ، ولم يُنفّذ أي طلب استدلال مدفوع.** يظهر ذلك في إعدادات البرنامج؛ يبقى خيار OpenAI غير قابل للتفعيل حتى إعداد الخادم بأمان. هذه النسخة لا تَعِد بالتفوّق على ChatGPT أو بإجابة مليون سؤال إجابة صحيحة.

## جرّب البرنامج

- اكتب «السلام عليكم»، «كيف أزيد المبيعات؟» أو «أريد خطة تسويق».
- جرّب «التكلفة ٨٠ وسعر البيع ١٠٠» أو افتح حاسبة الربح والتعادل.
- افتح **إجابات OpenAI** لمشاهدة حالة الربط والسقف الشهري والمبلغ المحسوب والمحجوز. الوضع السحابي اختياري لكل جلسة، ولا يُختار تلقائياً.
- لتجربة النموذج المجاني على جهازك، افتح **ذكاء اصطناعي يعمل على جهازك** واختر Qwen3 0.6B أو 1.7B. التنزيل الأول كبير ويحتاج متصفحاً وذاكرة وجهازاً مناسباً. لم يُختبر الاستدلال الفعلي على GPU ضمن هذه الجلسة.

الموقع المنشور يحافظ على الوصول الخاص لصاحبه عبر تسجيل دخول ChatGPT. المستودع في GitHub عام. لا تُرسل مسودات العملاء إلى بريد إلكتروني أو CRM؛ القوالب قابلة للتنزيل فقط.

## Spending protection

The approved API budget is at most **5 OMR per calendar month**. This release uses a conservative **$12/month application quota**, approximately **4.62 OMR** at an illustrative 0.385 OMR/USD conversion, before bank fees and tax. This is the quota for requests made by this application, not an account-wide OpenAI billing limit or a guarantee about currency conversion or external fees.

The server fixes the model to `gpt-5.4-mini-2026-03-17`, standard service tier, no tools, no browsing, no retries, and at most 512 output tokens. Rates checked on 2026-10-08: $0.75 per million input tokens and $4.50 per million output tokens. Review the official rates before any later activation or model change; billing estimates use these stored prices.

Before any provider call, one atomic SQL statement reserves the worst-case cost for 8,192 input and 512 output tokens. Exact token counting must pass before generation. D1 is the authoritative ledger, shared across sessions and requests; page reloads cannot clear it. Settled requests use reported total input/output tokens, rounded up and without a cached-input discount. A timed-out or otherwise uncertain generation keeps its full reservation because it may still be billable. No automatic retries or automatic refunds occur after generation starts. Unexpected model, service tier, or usage limits pause later cloud requests for review.

Requests are assigned to the calendar month at admission, in **Asia/Dubai (UTC+4)**. Old records remain when a new month begins. A month change during token preflight blocks generation. At most one recent cloud request runs at a time. Requests stop before their worst-case reservation would exceed the available quota, so a small residual amount may remain unused.

Missing activation, a missing key, unavailable storage, exhausted budget, or provider errors preserve free answers. Application facts, greetings, exact calculations, and questions requiring current legal/tax information stay with the deterministic engine even if cloud mode is later enabled.

## Server activation status

Production is deliberately configured with `OPENAI_ENABLED=0` and `CLOUD_BUDGET_USD=12`; no `OPENAI_API_KEY` has been provisioned. A key must be configured as a server secret through an authorized secure setup before activation. Never paste a key into chat, client code, GitHub, the hosting manifest, or browser storage. After a secure key setup, activation also needs a new deployment and a small real API acceptance check within the approved budget. Those steps remain pending; mock tests do not establish API-account access, credit availability, or live model quality.

The key is never sent to the browser. Only the server can call the fixed OpenAI endpoint. Browser POSTs must be signed in, same-origin, bounded JSON. Client input cannot select a model, tool, instruction override, token cap, or budget. Site dispatch owns authentication and the current owner-only access policy is preserved.

## Privacy

In free modes, questions, conversations, knowledge edits, and lead drafts remain in page memory and reset when the page reloads or closes. Optional local inference downloads runtime/model files from jsDelivr, MLC, and Hugging Face; those hosts see ordinary download requests, and model files may remain in browser caches.

Only if an available cloud mode is explicitly selected, the application sends the question, up to four recent messages, and bounded knowledge excerpts to OpenAI. The response uses `store:false`; that setting does not by itself promise zero provider retention. The server ledger stores request ID, Site user ID, month, timestamps, token counts and quota amounts, **without question or answer text**. The application does not log prompts, API keys or raw provider errors. Hosts may keep normal access logs. Downloaded conversation and lead files remain on the visitor's device. Use sample information rather than passwords, payment details or sensitive records.

Stopping the cloud answer display or closing the page does not guarantee cancellation of an already-started request or its cost. Free answers remain available after cancellation or failure.

## Local use and validation

The free interface remains dependency-free:

```bash
python3 -m http.server 8080 --directory public
```

For the hosted Worker build, install from the pnpm lockfile using the Sites setup workflow. The development/build entry points are the bundled Vinext workflow:

```bash
npm test
npm run check
OPENAI_API_KEY='' python3 -m unittest discover -s legacy/v02 -p test_engine.py -v
npm run build
```

Requires Node.js 22.13+ and Python 3. The tests cover bilingual routing, calculations, model lifecycle, atomic SQL budget admission, simultaneous requests, duplicates, month changes, missing keys, missing storage, provider failures, and secret-free payloads. Budget SQL runs against real SQLite in tests; provider and GPU adapters use test doubles. **No live paid API request, browser UI check, or real GPU inference was performed.** The local Worker build was validated.

The GitHub workflow uses read-only permissions and standard public-repository runners only, with no dependency install required for the behavior tests. It does not automatically deploy the Site. D1 schema changes use generated, versioned Drizzle migrations; no runtime table creation or seed data is used.

## Source layout

| Path | Purpose |
| --- | --- |
| `public/index.html`, `public/styles.css`, `public/app.mjs` | Arabic/English working interface and cloud status |
| `public/engine.mjs`, `public/business.mjs` | Deterministic facts, guides, greetings and calculations |
| `public/local-model.mjs`, `public/model-worker.mjs` | Optional WebLLM/Qwen3 inference on the visitor's device |
| `public/cloud-model.mjs` | Same-origin cloud client, bounded context and display cancellation |
| `server/cloud.mjs`, `server/budget.mjs` | Disabled-by-default provider adapter and durable quota guard |
| `db/schema.ts`, `drizzle/` | D1 ledger schema and generated migrations |
| `build/`, `scripts/`, `app/`, `vite.config.ts` | Sites-compatible Vinext Worker build and root redirect |
| `dist/` | Generated deployment output, ignored by Git |
| `tests/`, `.github/workflows/ci.yml` | Behavioral and regression checks |
| `legacy/v02/` | Original Streamlit prototype, unused by the published beta |

Official references: [GPT-5.4 Mini model and pricing](https://developers.openai.com/api/docs/models/gpt-5.4-mini), [input token counting](https://developers.openai.com/api/docs/guides/token-counting), [Responses API](https://developers.openai.com/api/reference/python/resources/responses/methods/create), [D1 database API](https://developers.cloudflare.com/d1/worker-api/d1-database/), [WebLLM](https://webllm.mlc.ai/docs/user/basic_usage.html), [Qwen3 model card](https://huggingface.co/Qwen/Qwen3-0.6B).
