# Changelog

## 0.4.0 — 2026-10-08

- Expanded to 15 bilingual commercial guides and editable business templates.
- Added conversational greetings, explicit answer-language requests, and profit/break-even calculations.
- Added opt-in WebLLM/Qwen3 inference on the visitor's device, with no paid API.
- Added loading progress, streaming, cancellation, compatibility errors, and bounded context.
- Labelled generated drafts separately from company facts and deterministic calculations.
- Updated privacy and network policy for optional model downloads and browser caching.
- Added commercial and model-adapter checks; real GPU inference and broad answer quality are not verified by these unit tests.

## 0.3.0 — 2026-10-08

- Continued the original v0.2 knowledge and lead-summary flow.
- Replaced the hosted Streamlit surface with a dependency-free static beta.
- Added Arabic and English answers, source labels, grounded multi-topic replies, and simple follow-ups.
- Added editable per-page knowledge and text downloads.
- Kept all visitor inputs in page memory and blocked outbound connections with Content Security Policy.
- Removed any paid-model dependency from the deployed surface.
- Added behavior checks and a public-repository-only GitHub CI workflow.

## 0.2

Original Streamlit prototype with five-topic matching and an optional paid OpenAI connection; preserved under `legacy/v02`.
