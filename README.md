# GrantCompass

Local-first, privacy-centric scholarship and grant assistant.

## Phase 1 (Security Foundation)

This phase establishes:
- FastAPI backend with strict validation and security middleware
- Local SQLite database with application-layer AES-256-GCM encryption for sensitive fields
- Core schema for users, profile facts, documents, backstory, and audit logs
- PII-safe structured logging and prompt-injection prefilter utilities
- React + Vite + TypeScript frontend shell

## Monorepo Structure

- `backend/` FastAPI service
- `frontend/` React application
- `docs/` architecture and security notes

## Quick Start

### Backend

1. `cd backend`
2. `cp .env.example .env`
3. Set `GRANTCOMPASS_MASTER_KEY` to a strong random secret
4. `pip install -r requirements.txt`
5. `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`

### Frontend

1. `cd frontend`
2. `npm install`
3. `npm run dev`

## Security Notes

- Sensitive fields are encrypted at rest using AES-256-GCM via `cryptography`.
- No raw PII is logged.
- CORS defaults to localhost only.
- External integrations are mocked/stubbed in Phase 1.
