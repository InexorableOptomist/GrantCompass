from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.deps import get_db_session
from app.models import BackstoryEntry, User
from app.schemas_narrative import (
    BackstoryCreate,
    BackstoryRead,
    AuditArtifactRequest,
    AuditArtifactResponse,
    GenerateArtifactRequest,
    GenerateArtifactResponse,
)
from app.security.crypto import crypto_service
from app.services.context import build_fact_sheet, record_audit
from app.services.narrative import audit_artifact, build_artifact

router = APIRouter(prefix='/narrative', tags=['narrative'])


@router.post('/backstory', response_model=BackstoryRead)
def create_backstory_entry(payload: BackstoryCreate) -> BackstoryRead:
    with get_db_session() as db:
        if not db.get(User, payload.user_id):
            raise HTTPException(status_code=404, detail='User not found')
        entry = BackstoryEntry(
            user_id=payload.user_id,
            prompt_key=payload.prompt_key,
            response_enc=crypto_service.encrypt(payload.response.strip()),
        )
        db.add(entry)
        db.flush()
        record_audit(db, 'create_backstory_entry', {'user_id': payload.user_id, 'prompt_key': payload.prompt_key})
        return BackstoryRead(
            id=entry.id,
            user_id=entry.user_id,
            prompt_key=entry.prompt_key,
            response=payload.response.strip(),
        )


@router.get('/backstory/{user_id}', response_model=list[BackstoryRead])
def list_backstory_entries(user_id: int) -> list[BackstoryRead]:
    with get_db_session() as db:
        if not db.get(User, user_id):
            raise HTTPException(status_code=404, detail='User not found')
        entries = db.execute(
            select(BackstoryEntry).where(BackstoryEntry.user_id == user_id).order_by(BackstoryEntry.id)
        ).scalars().all()
        return [
            BackstoryRead(
                id=entry.id,
                user_id=entry.user_id,
                prompt_key=entry.prompt_key,
                response=crypto_service.decrypt(entry.response_enc),
            )
            for entry in entries
        ]


@router.post('/generate', response_model=GenerateArtifactResponse)
def generate_artifact(payload: GenerateArtifactRequest) -> GenerateArtifactResponse:
    with get_db_session() as db:
        try:
            fact_sheet = build_fact_sheet(db, payload.user_id)
        except LookupError as exc:
            raise HTTPException(status_code=404, detail='User not found') from exc
        content = build_artifact(fact_sheet, payload.artifact_type, payload.opportunity_name, payload.word_target)
        audit = audit_artifact(content, fact_sheet, payload.artifact_type)
        record_audit(
            db,
            'generate_artifact',
            {'user_id': payload.user_id, 'artifact_type': payload.artifact_type, 'audit_status': audit['status']},
        )
        return GenerateArtifactResponse(
            user_id=payload.user_id,
            artifact_type=payload.artifact_type,
            content=content,
            audit=audit,
        )


@router.post('/audit', response_model=AuditArtifactResponse)
def audit_draft(payload: AuditArtifactRequest) -> AuditArtifactResponse:
    with get_db_session() as db:
        try:
            fact_sheet = build_fact_sheet(db, payload.user_id)
        except LookupError as exc:
            raise HTTPException(status_code=404, detail='User not found') from exc
        audit = audit_artifact(payload.content, fact_sheet, payload.artifact_type)
        record_audit(db, 'audit_artifact', {'user_id': payload.user_id, 'audit_status': audit['status']})
        return AuditArtifactResponse(audit=audit)
