# Right Solution AI Cloud — Prototype v0.2

A grounded bilingual-topic sales/support assistant prototype for a global SaaS concept. Not a launched commercial service.

## Start

```bash
pip install -r requirements.txt
streamlit run app.py
```

Without `OPENAI_API_KEY`, the app uses a free, deterministic demo engine. To enable AI, configure `OPENAI_API_KEY` in the hosting environment's **secret manager** (never commit credentials). API usage may cost money. Optionally configure `OPENAI_MODEL`; default is `gpt-4o-mini`. API availability and pricing must be verified before deployment.

## Quality checks

```bash
python -m unittest -v test_engine.py
```

## Important limits

- Uses fictional product facts and illustrative prices only.
- No CRM, payments, live integrations, persistence, or self-modifying code.
- Lead summary is displayed only within the current browser session.
- OpenAI calls transmit prompts to the model provider when enabled; do not enter real confidential data until privacy, security, consent, retention and access controls are implemented.
- Production requires authentication, rate limiting, abuse protection, logging with data minimization, billing limits, customer isolation, and human escalation.
- Continuous improvement should use reviewed feedback and regression tests; do not automatically deploy generated code.

