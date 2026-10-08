# Right Solution AI Cloud — Free Beta v0.4

مساعد أعمال بالعربية والإنجليزية، مطوّر من الإصدار 0.2. يعمل الوضع الأساسي فوراً، مع خيار نموذج لغوي مجاني يعمل على جهاز الزائر. لا توجد مفاتيح API أو مدفوعات أو خدمات استدلال مدفوعة في النسخة المنشورة.

## جرّب البرنامج

1. اكتب تحية أو سؤالاً مثل «كيف أزيد المبيعات؟» أو «أريد خطة تسويق».
2. جرّب «التكلفة ٨٠ وسعر البيع ١٠٠» لحساب ربح الوحدة والهامش، أو افتح حاسبة الربح والتعادل.
3. للحصول على إجابات توليدية أوسع، افتح **ذكاء اصطناعي يعمل على جهازك**، واختر Qwen3 0.6B أو 1.7B ثم اضغط **تحميل وتفعيل الذكاء المحلي**.
4. انتظر ظهور حالة الجاهزية. يحتاج النموذج WebGPU وذاكرة كافية. التحميل الأول قد يكون مئات الميغابايت أو أكثر من غيغابايت؛ استخدم اتصالاً مناسباً مثل Wi-Fi.

عند عدم التوافق أو فشل التحميل، تبقى الإرشادات والقوالب الأساسية متاحة، ويظهر سبب الفشل. إيقاف الإجابة يوقف العامل المحلي؛ يحتاج النموذج تفعيلًا جديداً قبل توليد إجابة أخرى، وقد يستفيد من ملفات التنزيل المخزّنة.

## What works

- Arabic and English interface; answer language follows the question or an explicit language request.
- Greetings, thanks, and a clear explanation of capabilities.
- **15 commercial guides**: business plans, marketing, sales, product pricing, cash flow, customer service, e-commerce, operations, procurement, hiring, strategy, market research, proposals, business correspondence, and negotiation.
- Separate labels for general templates, application facts, calculations, and generated local AI drafts.
- Profit, margin, markup, revenue, fixed-cost contribution, and break-even calculations, including Arabic digits in chat.
- Optional **WebLLM 0.2.84 / Qwen3** generation and streaming in a dedicated Web Worker. Downloads begin only after an explicit click. The adapter selects f16 or f32 according to GPU capabilities.
- Progress, hardware/download errors, cancellation, context limits, and generation timeout handling.
- Original editable bilingual application knowledge, source labels, lead drafts, and text downloads.
- Read-only-permission checks on standard GitHub runners in public repositories only.

## Free mode and honest limits

The basic mode is a deterministic guide and knowledge engine, not a language model. Optional Local AI generates open-ended answers on compatible hardware; it is **not limited to a million stored question/answer pairs**. Neither mode guarantees one million correct answers or superiority to ChatGPT. Small local models have limited accuracy, Arabic fluency, reasoning, and context. Review generated drafts before relying on them.

Application policy questions and exact calculations use the deterministic engine even while Local AI is enabled. Questions asking for current information or legal/tax rules request verification instead of generating unverified facts. There is no live browsing, trained company model, autonomous action, CRM connection, or email sending. Example prices from v0.2 remain illustrative; the published beta does not sell paid plans.

No paid inference request, subscription, custom domain, or GPU server is provisioned. Model downloads consume the visitor's ordinary internet connection and storage. Hosting providers and download hosts may keep normal access logs.

## Privacy

Questions, conversations, lead details, and knowledge edits live in page memory and reset on reload or close. Prompts are processed by the on-device worker; our application has no client that sends them to an AI API. Model and runtime downloads come from jsDelivr, Hugging Face, and MLC's published artifacts. Model files may be retained in browser caches until cleared or evicted. Downloads of conversations or leads remain on the visitor's device. Use sample information, not passwords or payment details.

The unchanged `legacy/v02` Streamlit prototype is retained for regression checks. Its optional OpenAI mode can cost money and is **not used by the published beta**.

## Run locally

The basic mode needs no npm install or API key:

```bash
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. Local AI also needs a compatible secure browser context, WebGPU, and internet access to download public model files. All application asset paths are relative.

## Validation

Requires Node.js 20+ and Python 3:

```bash
npm test
npm run check
OPENAI_API_KEY='' python3 -m unittest discover -s legacy/v02 -p test_engine.py -v
```

The suites exercise bilingual commercial routing, greetings, fact grounding, calculation edge cases, and model lifecycle/error handling. **The adapter tests use test doubles. They do not validate real WebGPU inference, model answer quality, or a million questions.** Real-device download and generation remain an acceptance check on a compatible browser. No browser UI preview was available in the build environment.

The GitHub workflow runs only for public repositories and skips private repositories to avoid paid runner minutes. It uses read-only repository permission. GitHub source updates and CI do **not** automatically redeploy the hosted beta.

## Source layout

| Path | Purpose |
| --- | --- |
| `dist/index.html`, `dist/styles.css` | Responsive Arabic-first working interface |
| `dist/engine.mjs` | Application facts, language selection, greetings, lead drafts |
| `dist/business.mjs` | Business guides and calculations |
| `dist/local-model.mjs`, `dist/model-worker.mjs` | Optional on-device model lifecycle and streaming |
| `dist/app.mjs` | Shared visible form and optional WebMCP actions |
| `tests/` | Behavior and adapter tests |
| `legacy/v02/` | Original prototype |
| `.github/workflows/ci.yml` | Public-repository checks |

Optional page-scoped WebMCP tools are feature-detected and use the same actions as the forms. They never initiate model downloads.

Runtime references: [WebLLM documentation](https://webllm.mlc.ai/docs/user/basic_usage.html), [worker example and license](https://github.com/mlc-ai/web-llm), [Qwen3 0.6B model card](https://huggingface.co/Qwen/Qwen3-0.6B). WebLLM and the Qwen3 model are published under Apache-2.0; they are upstream dependencies, not models trained by this project.
