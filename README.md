# Right Solution AI Cloud — Free Beta v0.3

مساعد مبيعات ودعم بالعربية والإنجليزية، مبني على الإصدار 0.2. هذه النسخة مجانية وتعمل داخل المتصفح دون استدعاء أي API مدفوع.

## What works

- Arabic and English interface and answers, with Arabic text normalization.
- Grounded responses to five topics: pricing, support hours, refunds, integrations, and privacy.
- Visible source labels, multiple-topic answers, and simple contextual follow-ups.
- Human-review response when a fact is unavailable.
- Editable bilingual knowledge for the current page.
- Validated lead drafts and downloadable lead/conversation text files.
- Mobile layout, keyboard controls, and accessible form labels.

## Try locally

No npm install or API key is required. Serve the static files:

```bash
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. All paths are relative, so the same files can be hosted in a subdirectory.

## Check the project

Requires Node.js 20+ and Python 3 for the original regression suite:

```bash
npm test
npm run check
OPENAI_API_KEY='' python3 -m unittest discover -s legacy/v02 -p test_engine.py -v
```

The GitHub workflow uses a standard runner only in a **public** repository, with read-only repository permission. It skips private repositories to avoid paid minutes. No deployment, subscription, paid API, custom domain, or external integration is provisioned by that workflow.

## Cost and honest limits

This beta uses deterministic topic matching, not a language model. It is not ChatGPT, does not train or modify itself, and does not guarantee business revenue. It makes **zero AI API calls**, even if an API key exists in the environment. Prices are illustrative examples from v0.2; there are no paid plans or payments.

Chat, knowledge edits, and lead details live only in page memory and reset on reload or close. Downloads remain on the visitor's device. There is no server-side customer database, CRM, email sending, authentication system, tracking, or automatic code deployment. Hosting providers can still maintain their own ordinary access logs. Use example information; do not enter customer secrets or payment details.

The unchanged `legacy/v02` Streamlit prototype is retained for traceability and regression checks. Its optional OpenAI mode can cost money and is **not used or enabled** in the published v0.3 beta.

Optional page-scoped WebMCP tools are feature-detected. They use the same chat and draft actions as the visible forms. Browsers without that proposed API use the normal interface.

## Source layout

| Path | Purpose |
| --- | --- |
| `dist/index.html` | Accessible Arabic-first interface |
| `dist/styles.css` | Responsive theme |
| `dist/engine.mjs` | Free bilingual knowledge engine |
| `dist/app.mjs` | Forms, conversation, downloads, and optional page tools |
| `tests/engine.test.mjs` | Behavior and zero-network checks |
| `legacy/v02/` | Original v0.2 source |
| `.github/workflows/ci.yml` | Free public-repository checks |

The hosted beta is maintained separately from GitHub CI. Updating the GitHub repository alone does not redeploy it.
