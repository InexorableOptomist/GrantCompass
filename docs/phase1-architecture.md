# Phase 1 Architecture & Security Foundation

## Architecture

- Frontend: React + Vite (local-only development host)
- Backend: FastAPI + SQLAlchemy + Pydantic
- Storage: SQLite with application-layer encryption for sensitive payloads

## Security Controls Implemented

1. AES-256-GCM encryption for sensitive user fields.
2. PII redaction utilities for logs.
3. A pattern-based prompt-injection helper is available, but is not treated as a security boundary; no external model receives ingested text.
4. CSP and secure headers middleware.
5. Strict localhost CORS.

## Notes

- Local provider boundaries are mock by default; optional GitHub metadata fetch is opt-in in the backend environment.
- No third-party telemetry configured.
- The application-layer key must be backed up separately; losing it makes encrypted profile fields unrecoverable.
- Future hardening: key rotation, SQLCipher, secrets in OS keychain, and multi-user authentication before any network exposure.
