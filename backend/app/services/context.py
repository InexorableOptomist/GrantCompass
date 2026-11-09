import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import BackstoryEntry, Document, User
from app.security.crypto import crypto_service
from app.services.normalize import synthesize_fact_sheet

RESUME_TYPES = {'resume_pdf', 'resume_docx', 'resume_md', 'linkedin_json'}


def build_fact_sheet(db: Session, user_id: int) -> dict[str, Any]:
    user = db.get(User, user_id)
    if not user:
        raise LookupError('User not found')
    docs = db.execute(select(Document).where(Document.user_id == user_id).order_by(Document.id)).scalars().all()
    entries = db.execute(
        select(BackstoryEntry).where(BackstoryEntry.user_id == user_id).order_by(BackstoryEntry.id)
    ).scalars().all()
    resume_docs: list[str] = []
    supplemental: list[str] = []
    github_snapshot = None
    for document in docs:
        plain = crypto_service.decrypt(document.content_enc)
        if document.source_type in RESUME_TYPES:
            resume_docs.append(plain)
        elif document.source_type == 'supplemental':
            supplemental.append(plain)
        elif document.source_type == 'github_profile':
            try:
                github_snapshot = json.loads(plain)
            except json.JSONDecodeError:
                github_snapshot = None
    backstory = {entry.prompt_key: crypto_service.decrypt(entry.response_enc) for entry in entries}
    identity = {
        'full_name': crypto_service.decrypt(user.full_name_enc),
        'email': crypto_service.decrypt(user.email_enc),
    }
    return synthesize_fact_sheet(user_id, identity, resume_docs, supplemental, github_snapshot, backstory)


def record_audit(db: Session, action: str, details: dict[str, Any]) -> None:
    from app.models import AuditLog
    from app.security.sanitize import sanitize_for_log

    db.add(AuditLog(actor='local-user', action=action, details_sanitized=json.dumps(sanitize_for_log(details))))
