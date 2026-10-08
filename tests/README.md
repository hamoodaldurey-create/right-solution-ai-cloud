# Validation

Run `npm test`, `npm run check`, and `OPENAI_API_KEY='' python3 -m unittest discover -s legacy/v02 -p test_engine.py -v` from the repository root.

The v0.5 suites contain 80 Node behavior checks and 5 legacy checks. Budget tests execute the generated migration and reservation SQL in real SQLite. Provider and GPU tests use test doubles and never use a real API key or a paid inference request. Cloud tests cover disabled/missing-key states, authentication/origin checks, immutable model/quota settings, preflight token bounds, concurrency, duplicate requests, conservative uncertain billing, month rollover and storage failures.

A passing test suite does not establish real OpenAI-account access, available credit, model answer quality, browser UI behavior or actual GPU inference. The production cloud adapter remains disabled until secure key setup and a separately verified API acceptance check. The local Worker build was validated.
