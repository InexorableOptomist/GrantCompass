# Phase 1 Architecture & Security Foundation

## Architecture

- Frontend: React + Vite (local-only development host)
- Backend: FastAPI + SQLAlchemy + Pydantic
- Storage: SQLite with application-layer encryption for sensitive payloads

## Security Controls Implemented

1. AES-256-GCM encryption for sensitive user fields.
2. PII redaction utilities for logs.
3. Prompt injection prefilter helper for ingested text.
4. CSP and secure headers middleware.
5. Strict localhost CORS.

## Notes

- This phase intentionally uses mock/stub integration boundaries only.
- No third-party telemetry configured.
- Future hardening: key rotation, SQLCipher, secrets in OS keychain.
