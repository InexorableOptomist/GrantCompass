# GrantCompass

GrantCompass is a local-first workspace for organizing college funding research, application notes, and draft materials. Its focus is a useful, understandable workflow rather than automatic application submission.

## What is included

- **Local profile and encrypted storage:** profile fields, imported document text, backstory responses, and tracker notes are encrypted with AES-256-GCM before being stored in SQLite.
- **Document ingestion:** PDF, DOCX, Markdown, TXT, and JSON exports are parsed locally with an 8 MB upload limit.
- **Profile fact sheet:** a deterministic summary of education, skills, awards, repositories, and user-provided context. Extraction is fallible; review the original source.
- **Writing studio:** local templates produce editable essay, cover-letter, resume-summary, ATS-friendly resume, and academic CV drafts. A deterministic checklist flags potential issues; only drafts with a clear checklist can be downloaded as text. It is not an AI reviewer and cannot verify claims or policy compliance.
- **Funding discovery and tracker:** local demonstration opportunities and simple keyword-overlap suggestions. This catalog is not real, current, or verified funding data.
- **Data removal:** delete a profile and its associated documents, responses, and tracker records from the local database.

There is no telemetry, cloud synchronization, external language model, or automatic application submission. GitHub public repository import uses an empty mock provider by default. Live public metadata fetching can be explicitly enabled in the local backend configuration.

## Project layout

```text
backend/    FastAPI API, local SQLite storage, parsing and matching services
frontend/   React, TypeScript, Vite, Tailwind CSS user interface
docs/       Architecture and security notes
```

## Run locally

### Backend

Python 3.11 or newer is recommended.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Generate and set a unique local encryption key (do not commit `.env`):

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Paste that value into `GRANTCOMPASS_MASTER_KEY` in `backend/.env`, then start the API:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If you lose the key, encrypted profile data cannot be recovered. Back up the key separately from the database.

### Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`).

## Optional GitHub metadata import

No external requests are made for GitHub while the default is active. To opt in to retrieving public repository metadata, set `GITHUB_LIVE_ENABLED=true` in `backend/.env` and restart the API. A token is optional and is only needed for higher rate limits or access to private data; this integration does not request private repositories. Never put a token in frontend code.

## Verification

```bash
cd backend
pytest
cd ../frontend
npm run build
```

## Important limitations

- Demonstration grant records must not be used as real recommendations.
- Keyword matching does not determine eligibility, award probability, or suitability.
- Resume extraction and writing templates are intentionally basic and require review.
- The adversarial checklist is deterministic local code, not a model or substitute for human review.
- GrantCompass does not fill or submit third-party application portals.
- Localhost-only deployment is intended. Do not expose the API or Vite server to a network.
