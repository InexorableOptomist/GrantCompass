# Phases 2–5: Profile, writing, review, and funding workflow

## Phase 2: Ingestion and profile normalization

PDF, DOCX, Markdown, TXT, and JSON export files are parsed by local libraries and bounded by an 8 MB upload limit. Extracted text and GitHub summaries are encrypted before persistence. The profile summary is deterministic and keeps a basic provenance count. GitHub import is an empty mock by default; live public repository metadata is an explicit backend opt-in.

## Phase 3: Backstory and writing

The backstory questionnaire stores responses encrypted at rest. The writing studio uses local templates to prepare editable essays, cover letters, resume summaries, ATS-friendly resumes, and academic CVs using profile details. No external model is called, and draft language should be reviewed and rewritten by the applicant. Text downloads are enabled only after the current draft has a clear local checklist result.

## Phase 4: Adversarial review checklist

Draft preparation always runs a local deterministic checklist that can flag unsupported-sounding phrases, a missing personal example, unresolved placeholders, or a very short draft. Editing invalidates the previous result; users can rerun the checklist. The checklist does not rewrite content and is not an AI agent. A clear checklist result is not proof of factual accuracy, originality, or compliance with a scholarship's rules.

## Phase 5: Funding workflow

The catalog contains clearly labeled demonstration records only. Matches are based on simple tag overlap and are not eligibility decisions. The tracker stores statuses and can be deleted with the associated profile. Application portals are not contacted and submissions are never automated.

## Local data and security

- SQLite is bound to the local backend process; CORS allows the configured local frontend origins.
- Sensitive profile values, document text, and narrative responses use AES-GCM application-layer encryption.
- `GRANTCOMPASS_MASTER_KEY` is required and must be kept separate from the database and source control.
- The browser stores only the numeric local profile ID to restore the current workspace.
- Logs omit document contents, profile names, and email addresses.
- The app does not send telemetry or use remote AI services.
- Ingested documents are treated as user data. No model is currently given their contents.
- Run only on a trusted local machine; the prototype does not implement multi-user authentication.
